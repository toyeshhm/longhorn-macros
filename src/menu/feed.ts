import { feedDateToKey } from '../dates'
import { log } from '../log'
import { zeroNutrients, type Nutrients } from '../nutrition'

export const FEED_URL = 'https://hf-foodpro.austin.utexas.edu/foodpro/data_all_endpoint.php?menu=1'

export type HallId = 'J2' | 'JCL' | 'Kins'

export interface MenuItem {
  recipeNumber: string
  name: string
  station: string
  portion: string
  nutrients: Nutrients
  legends: readonly string[]
}

export interface MealMenu { name: string; items: readonly MenuItem[] }
export interface HallMenu { hall: HallId; meals: readonly MealMenu[] }
export interface Menu {
  cachedAt: string
  dates: readonly string[]
  days: Readonly<Record<string, readonly HallMenu[]>>
}

const LOCATION_HALLS: Readonly<Record<string, HallId>> = { '12': 'J2', '12(a)': 'JCL', '03': 'Kins' }
const STATION_HEADER = /^--\s*(.+?)\s*--$/
const REQUIRED_NUTRIENT_NAMES = ['Cals', 'Prot', 'Carb', 'Fat-T'] as const
const NUTRIENT_NAME_TO_KEY: Readonly<Record<string, keyof Nutrients>> = {
  Cals: 'calories', Prot: 'protein', Carb: 'carbs', 'Fat-T': 'fat', Fiber: 'fiber', Sugar: 'sugar', Sod: 'sodium',
}

function fail(path: string): never { throw new Error(`UT menu feed format changed: ${path}`) }

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function obj(v: unknown, path: string): Record<string, unknown> {
  if (!isPlainObject(v)) fail(path)
  return v
}
function arr(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) fail(path)
  return v
}
function str(v: unknown, path: string): string {
  if (typeof v !== 'string') fail(path)
  return v
}
function num(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const n = parseFloat(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

interface RawRecipeRow { number: string; name: string }
interface RawRecipeData { name: string; portionSize: unknown; portionUnit: unknown; legends: readonly string[]; nutrients: readonly unknown[] }

function readRecipeRow(v: unknown, path: string): RawRecipeRow {
  const o = obj(v, path)
  return { number: str(o.number, `${path}.number`), name: str(o.name, `${path}.name`) }
}

function nutrientValuesByName(list: readonly unknown[], path: string): Map<string, unknown> {
  const byName = new Map<string, unknown>()
  list.forEach((row, i) => {
    const o = obj(row, `${path}[${String(i)}]`)
    byName.set(str(o.name, `${path}[${String(i)}].name`), o.value)
  })
  return byName
}

function readNutrients(list: readonly unknown[], path: string): Nutrients {
  const byName = nutrientValuesByName(list, path)
  const nutrients = zeroNutrients()
  for (const [name, key] of Object.entries(NUTRIENT_NAME_TO_KEY)) {
    nutrients[key] = num(byName.get(name)) ?? 0
  }
  return nutrients
}

function requiredNutrientsValid(list: readonly unknown[], path: string): boolean {
  const byName = nutrientValuesByName(list, path)
  return REQUIRED_NUTRIENT_NAMES.every((name) => num(byName.get(name)) !== null)
}

function readLegends(codes: readonly string[], legendInfo: Record<string, unknown>): readonly string[] {
  return codes.map((code) => {
    const label = legendInfo[`${code}_lbl`]
    return typeof label === 'string' ? label : code
  })
}

function readRecipeData(v: unknown, path: string): RawRecipeData {
  const o = obj(v, path)
  return {
    name: str(o.name, `${path}.name`),
    portionSize: o.portionSize,
    portionUnit: o.portionUnit,
    legends: arr(o.legends ?? [], `${path}.legends`).map((c, i) => str(c, `${path}.legends[${String(i)}]`)),
    nutrients: arr(o.nutrients ?? [], `${path}.nutrients`),
  }
}

function buildPortion(sizeRaw: unknown, unitRaw: unknown): string {
  const size = typeof sizeRaw === 'string' ? sizeRaw.trim() : ''
  const unit = typeof unitRaw === 'string' ? unitRaw.trim() : ''
  const portion = `${size} ${unit}`.trim()
  return portion === '' ? '1 serving' : portion
}

function readItems(
  recipes: readonly unknown[],
  recipesData: Record<string, unknown>,
  legendInfo: Record<string, unknown>,
  path: string,
): MenuItem[] {
  const items: MenuItem[] = []
  let station = 'Other'
  recipes.forEach((raw, i) => {
    const row = readRecipeRow(raw, `${path}[${String(i)}]`)
    if (row.number === '') {
      const m = STATION_HEADER.exec(row.name)
      if (m?.[1] !== undefined) station = m[1]
      return
    }
    const recipeRaw = recipesData[row.number]
    if (recipeRaw === undefined) { log.warn('menu.missing_recipe', { number: row.number }); return }
    const recipe = readRecipeData(recipeRaw, `data_object.recipes_data.${row.number}`)
    if (!requiredNutrientsValid(recipe.nutrients, `data_object.recipes_data.${row.number}.nutrients`)) {
      log.warn('menu.invalid_nutrient', { number: row.number })
      return
    }
    items.push({
      recipeNumber: row.number,
      name: recipe.name,
      station,
      portion: buildPortion(recipe.portionSize, recipe.portionUnit),
      nutrients: readNutrients(recipe.nutrients, `data_object.recipes_data.${row.number}.nutrients`),
      legends: readLegends(recipe.legends, legendInfo),
    })
  })
  return items
}

export function parseFeed(json: unknown): Menu {
  const root = obj(json, 'root')
  const menuWindow = obj(root.menuWindow, 'menuWindow')
  const dates = arr(menuWindow.dates, 'menuWindow.dates').map((d, i) => str(d, `menuWindow.dates[${String(i)}]`))
  const dataObject = obj(root.data_object, 'data_object')
  const recipesData = obj(dataObject.recipes_data, 'data_object.recipes_data')
  const globalData = obj(dataObject.global_data, 'data_object.global_data')
  const legendInfo = obj(globalData.legendInfo ?? {}, 'data_object.global_data.legendInfo')
  const daysRaw = obj(root.days, 'days')
  const cachedAt = str(root.last_cached, 'last_cached')

  const days: Record<string, readonly HallMenu[]> = {}
  for (const feedDate of Object.keys(daysRaw)) {
    const dayObj = obj(daysRaw[feedDate], `days.${feedDate}`)
    const locations = arr(dayObj.locations, `days.${feedDate}.locations`)
    const halls: HallMenu[] = []
    locations.forEach((locRaw, i) => {
      const loc = obj(locRaw, `days.${feedDate}.locations[${String(i)}]`)
      const locationNum = str(loc.locationNum, `days.${feedDate}.locations[${String(i)}].locationNum`)
      const hall = LOCATION_HALLS[locationNum]
      if (hall === undefined) { log.warn('menu.unknown_location', { num: locationNum }); return }
      const meals = arr(loc.meals, `days.${feedDate}.locations[${String(i)}].meals`)
      const mealMenus: MealMenu[] = meals.map((mealRaw, j) => {
        const meal = obj(mealRaw, `days.${feedDate}.locations[${String(i)}].meals[${String(j)}]`)
        const mealName = str(meal.mealName, `days.${feedDate}.locations[${String(i)}].meals[${String(j)}].mealName`)
        const recipes = arr(meal.recipes, `days.${feedDate}.locations[${String(i)}].meals[${String(j)}].recipes`)
        return { name: mealName, items: readItems(recipes, recipesData, legendInfo, `days.${feedDate}.locations[${String(i)}].meals[${String(j)}].recipes`) }
      })
      halls.push({ hall, meals: mealMenus })
    })
    const key = feedDateToKey(feedDate)
    days[key] = halls
  }

  return { cachedAt, dates: dates.map(feedDateToKey), days }
}

export async function fetchMenu(fetchFn: typeof fetch): Promise<Menu> {
  const r = await fetchFn(FEED_URL)
  if (!r.ok) throw new Error(`UT menu HTTP ${String(r.status)}`)
  return parseFeed(await r.json())
}
