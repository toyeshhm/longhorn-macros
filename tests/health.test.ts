import { expect, test } from 'vitest'
import type { LogEntry } from '../src/db/types'
import type { Targets } from '../src/goals'
import {
  adherence as adherenceIn, availableItems as availableItemsIn, dailyTotals, healthReport as healthReportIn,
  macroReads as macroReadsIn, pickFoods as pickFoodsIn, plantShare, qualitySignals as qualitySignalsIn,
  todayRead as todayReadIn,
  type Adherence, type Candidate, type DayTotal, type Gap, type HealthReport, type MacroRead, type Pick,
  type PlantShare, type Signal, type TodayRead,
} from '../src/health'
import { translator } from '../src/i18n'
import type { HallMenu, Menu, MenuItem } from '../src/menu/feed'
import type { Hours, Week } from '../src/menu/hours'
import { legendsByRecipe } from '../src/menu/select'
import { zeroNutrients, type Nutrients } from '../src/nutrition'

// Every judgement below is asserted in English. The same sentences in Spanish are in tests/i18n.test.ts; what is
// tested here is the judgement, and it must not change with the language.
const t = translator('en')
const adherence = (days: readonly DayTotal[], goals: Targets | null): Adherence => adherenceIn(days, goals, t)
const macroReads = (days: readonly DayTotal[], goals: Targets | null): MacroRead[] => macroReadsIn(days, goals, t)
const qualitySignals = (days: readonly DayTotal[], plants: PlantShare): Signal[] => qualitySignalsIn(days, plants, t)
const todayRead = (entries: readonly LogEntry[], goals: Targets | null, today: string): TodayRead =>
  todayReadIn(entries, goals, today, t)
const healthReport = (a: Omit<Parameters<typeof healthReportIn>[0], 't'>): HealthReport => healthReportIn({ ...a, t })
const availableItems = (menu: Menu | null, hours: Hours | null, now: Date, today: string): Candidate[] =>
  availableItemsIn(menu, hours, now, today, t)
const pickFoods = (a: Omit<Parameters<typeof pickFoodsIn>[0], 't'>): Pick[] => pickFoodsIn({ ...a, t })

const targets: Targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 }

function nutrients(over: Partial<Nutrients>): Nutrients {
  return { ...zeroNutrients(), ...over }
}

function entry(over: Partial<LogEntry> & { date: string }): LogEntry {
  return {
    id: `id-${over.date}-${over.name ?? ''}`, meal: 'lunch', hall: 'J2', station: 'Grill', name: 'food',
    recipeNumber: null, customFoodId: null, portion: '1 cup', servings: 1, updatedAt: '2026-09-19T12:00:00.000Z',
    deletedAt: null, perServing: zeroNutrients(), ...over,
  }
}

function day(date: string, over: Partial<Nutrients>): DayTotal {
  return { date, nutrients: nutrients(over) }
}

// ------------------------------------------------------------------------------------------------ daily totals

test('dailyTotals sums servings per day, ascending, and never invents a missing day', () => {
  const out = dailyTotals([
    entry({ date: '2026-09-18', servings: 2, perServing: nutrients({ calories: 300, protein: 20 }) }),
    entry({ date: '2026-09-16', name: 'b', perServing: nutrients({ calories: 500 }) }),
    entry({ date: '2026-09-18', name: 'c', perServing: nutrients({ calories: 100, protein: 5 }) }),
  ])
  expect(out.map((d) => d.date)).toEqual(['2026-09-16', '2026-09-18'])
  expect(out[1]?.nutrients).toEqual(nutrients({ calories: 700, protein: 45 }))
  expect(dailyTotals([])).toEqual([])
})

// -------------------------------------------------------------------------------------------------- adherence

test('adherence: nothing logged says so rather than averaging zero', () => {
  const a = adherence([], targets)
  expect(a).toMatchObject({ daysLogged: 0, avgCalories: null, trend: 'unknown', target: 2000, coverage: '0 of 7 days logged' })
  expect(a.headline).toBe('Nothing logged in the last 7 days, so there is no average to read yet.')
})

test('adherence: a partial week averages only the logged days and says how many', () => {
  const a = adherence([day('a', { calories: 1500 }), day('b', { calories: 1700 })], targets)
  expect(a.avgCalories).toBe(1600)
  expect(a.trend).toBe('under')
  expect(a.coverage).toBe('2 of 7 days logged')
  expect(a.headline).toBe('Averaging 1,600 kcal on the 2 days you logged against 2,000. About 400 under.')
  expect(adherence([day('a', { calories: 1500 })], targets).headline).toContain('on the 1 day you logged')
})

test('adherence: on target inside the band, over above it, and a full week drops the day count', () => {
  const seven = (calories: number): DayTotal[] => Array.from({ length: 7 }, (_, i) => day(`d${String(i)}`, { calories }))
  expect(adherence(seven(2050), targets).headline).toBe('Averaging 2,050 kcal a day against 2,000. On target.')
  expect(adherence(seven(2050), targets).trend).toBe('on')
  const over = adherence(seven(2600), targets)
  expect(over.trend).toBe('over')
  expect(over.headline).toBe('Averaging 2,600 kcal a day against 2,000. About 600 over.')
})

test('adherence without targets still reports the average', () => {
  const a = adherence([day('a', { calories: 1800 })], null)
  expect(a).toMatchObject({ target: null, trend: 'unknown', avgCalories: 1800 })
  expect(a.headline).toBe('Averaging 1,800 kcal on the 1 day you logged. No calorie target set yet.')
})

// ----------------------------------------------------------------------------------------------- macro balance

test('macroReads names the macro that is short on most logged days, with both numbers', () => {
  const days = [
    day('a', { calories: 2000, protein: 100, carbs: 250, fat: 62 }),
    day('b', { calories: 2000, protein: 110, carbs: 255, fat: 58 }),
    day('c', { calories: 2000, protein: 120, carbs: 248, fat: 61 }),
  ]
  const [protein, carbs, fat] = macroReads(days, targets)
  expect(protein).toMatchObject({ key: 'protein', label: 'Protein', verdict: 'short', daysShort: 3, daysHeavy: 0, avgGrams: 110 })
  expect(protein?.note).toBe('Short on 3 of 3 logged days, averaging 110 g against 150 g.')
  expect(protein?.share).toBe('22% of calories · target 30%')
  expect(carbs).toMatchObject({ verdict: 'heavy', daysHeavy: 3 })
  expect(carbs?.note).toBe('Heavy on 3 of 3 logged days, averaging 251 g against 200 g.')
  expect(fat).toMatchObject({ verdict: 'steady' })
  expect(fat?.note).toBe('Steady, averaging 60.3 g against 60 g.')
})

test('macroReads: one logged day says "day", and nothing logged says nothing', () => {
  expect(macroReads([day('a', { calories: 2000, protein: 10, carbs: 500, fat: 60 })], targets)[0]?.note)
    .toBe('Short on 1 of 1 logged day, averaging 10 g against 150 g.')
  const [none] = macroReads([], targets)
  expect(none).toMatchObject({ verdict: 'unknown', avgGrams: null, targetGrams: 150, share: 'No days logged' })
  expect(none?.note).toBe('Nothing logged in the last 7 days.')
})

test('macroReads: no targets, and days with no calories, still print honestly', () => {
  const [protein] = macroReads([day('a', { calories: 1800, protein: 90 })], null)
  expect(protein).toMatchObject({ verdict: 'unknown', targetGrams: null, share: '20% of calories' })
  expect(protein?.note).toBe('Averaging 90 g a day. No target to compare against yet.')
  expect(macroReads([day('a', { protein: 5 })], null)[0]?.share).toBe('No calories logged')
  // A zero calorie target leaves no share to take: the grams still print.
  expect(macroReads([day('a', { calories: 1800, protein: 90 })], { ...targets, calories: 0 })[0]?.share).toBe('20% of calories')
})

// ------------------------------------------------------------------------------------------------- diet quality

const noPlants = { plantKcal: 0, knownKcal: 0, totalKcal: 0 }

test('qualitySignals state each number as a plain fact', () => {
  const days = [day('a', { calories: 2000, fiber: 20, sodium: 3000, sugar: 60 }), day('b', { calories: 2000, fiber: 16, sodium: 2600, sugar: 50 })]
  const signals = qualitySignals(days, { plantKcal: 1000, knownKcal: 2500, totalKcal: 4000 })
  expect(signals.map((s) => s.flag)).toEqual(['low', 'high', 'high', 'none'])
  expect(signals[0]?.fact).toBe('9 g per 1,000 kcal, against the 14 g mark.')
  expect(signals[1]?.fact).toBe('2,800 mg a day, against the 2,300 mg mark.')
  expect(signals[2]?.fact).toBe('11% of calories, against the 10% mark for added sugar.')
  expect(signals[2]?.note).toBe('UT publishes total sugar only, so this counts the sugar in fruit and milk too.')
  expect(signals[3]?.fact).toBe('40% of labelled calories came from items UT calls Vegan or Vegetarian.')
  expect(signals[3]?.note).toBe("Read from 62.5% of the week's calories; custom and off-menu foods carry no UT label.")
})

test('qualitySignals: inside the marks nothing is flagged', () => {
  const signals = qualitySignals([day('a', { calories: 2000, fiber: 30, sodium: 1800, sugar: 30 })], noPlants)
  expect(signals.map((s) => s.flag)).toEqual(['none', 'none', 'none', 'unknown'])
  expect(signals[3]?.fact).toBe('Nothing logged in the last 7 days carried a UT label.')
  expect(signals[3]?.note).toBeNull()
})

test('qualitySignals: no days, and days with no calories, never divide by nothing', () => {
  const empty = qualitySignals([], noPlants)
  expect(empty.map((s) => s.flag)).toEqual(['unknown', 'unknown', 'unknown', 'unknown'])
  expect(empty[0]?.fact).toBe('Nothing logged in the last 7 days.')
  const zero = qualitySignals([day('a', { sodium: 10 })], noPlants)
  expect(zero[0]?.fact).toBe('No calories logged, so fiber has nothing to scale against.')
  expect(zero[2]?.fact).toBe('No calories logged, so sugar has nothing to scale against.')
  expect(zero.map((s) => s.flag)).toEqual(['unknown', 'none', 'unknown', 'unknown'])
})

test('plantShare counts only calories UT actually labelled', () => {
  const legends = new Map<string, readonly string[]>([['1', ['Vegan']], ['2', ['Contains Beef']]])
  const share = plantShare([
    entry({ date: 'd', name: 'a', recipeNumber: '1', perServing: nutrients({ calories: 200 }) }),
    entry({ date: 'd', name: 'b', recipeNumber: '2', servings: 2, perServing: nutrients({ calories: 150 }) }),
    entry({ date: 'd', name: 'c', recipeNumber: '99', perServing: nutrients({ calories: 400 }) }),
    entry({ date: 'd', name: 'd', perServing: nutrients({ calories: 100 }) }),
  ], legends)
  expect(share).toEqual({ plantKcal: 200, knownKcal: 500, totalKcal: 1000 })
})

// ------------------------------------------------------------------------------------------------------ today

test('todayRead: left, over, and both empty states', () => {
  const today = '2026-09-19'
  const logged = [entry({ date: today, perServing: nutrients({ calories: 600, protein: 40 }) }), entry({ date: '2026-09-18', name: 'old', perServing: nutrients({ calories: 9000 }) })]
  const under = todayRead(logged, targets, today)
  expect(under.gap?.remaining.calories).toBe(1400)
  expect(under.line).toBe('600 of 2,000 kcal today, 1,400 left. Protein 40 of 150 g.')
  const over = todayRead([entry({ date: today, perServing: nutrients({ calories: 2500, protein: 100 }) })], targets, today)
  expect(over.line).toBe('2,500 of 2,000 kcal today, 500 over. Protein 100 of 150 g.')
  expect(todayRead([], targets, today).line).toBe('Nothing logged today. 2,000 kcal and 150 g of protein to go.')
  expect(todayRead([], null, today)).toMatchObject({ gap: null, logged: false, line: 'Nothing logged today, and no targets set yet.' })
  expect(todayRead(logged, null, today).line).toBe('600 kcal and 40 g of protein logged today. No targets set yet.')
})

// ----------------------------------------------------------------------------------------------------- report

test('healthReport keeps to the last 7 days and skips deleted rows', () => {
  const report = healthReport({
    today: '2026-09-19',
    targets,
    legends: new Map([['7', ['Vegetarian']]]),
    entries: [
      entry({ date: '2026-09-19', recipeNumber: '7', perServing: nutrients({ calories: 1000, protein: 50, fiber: 5, sodium: 6000, sugar: 60 }) }),
      entry({ date: '2026-09-13', name: 'edge', perServing: nutrients({ calories: 1000 }) }),
      entry({ date: '2026-09-12', name: 'old', perServing: nutrients({ calories: 5000 }) }),
      entry({ date: '2026-09-20', name: 'ahead', perServing: nutrients({ calories: 5000 }) }),
      entry({ date: '2026-09-18', name: 'gone', deletedAt: '2026-09-18T13:00:00.000Z', perServing: nutrients({ calories: 5000 }) }),
    ],
  })
  expect(report.adherence.daysLogged).toBe(2)
  expect(report.adherence.avgCalories).toBe(1000)
  expect(report.sodiumHigh).toBe(true)
  expect(report.fiberLow).toBe(true)
  expect(report.today.line).toContain('1,000 of 2,000 kcal today')
  expect(report.macros).toHaveLength(3)
  expect(report.signals[3]?.fact).toContain('100% of labelled calories')
})

// ------------------------------------------------------------------------------------------------ what to eat

function item(over: Partial<MenuItem> & { recipeNumber: string }): MenuItem {
  return { name: `item ${over.recipeNumber}`, station: 'Grill', portion: '1 each', nutrients: zeroNutrients(), legends: [], ...over }
}

function menuOf(halls: readonly HallMenu[], date = '2026-09-19'): Menu {
  return { cachedAt: '2026-09-19 09:00:00', dates: [date], days: { [date]: halls } }
}

const allDay: Week = Array.from({ length: 7 }, () => [{ open: 0, close: 1439 }])
const shut: Week = Array.from({ length: 7 }, () => [])
const eveningOnly: Week = Array.from({ length: 7 }, () => [{ open: 16 * 60 + 30, close: 21 * 60 }])
const hoursOf = (week: Week): Hours => ({ J2: week, JCL: week, Kins: week })
const noon = new Date(2026, 8, 19, 12, 0)

test('availableItems draws from the service being served now, or the next one to open today', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [item({ recipeNumber: '1' })] }, { name: 'Dinner', items: [item({ recipeNumber: '2' })] }] }])
  expect(availableItems(menu, hoursOf(allDay), noon, '2026-09-19').map((c) => ({ meal: c.meal, when: c.when, key: c.item.key })))
    .toEqual([{ meal: 'Lunch', when: 'now', key: 'r:1' }])
  // Shut now, open at 4:30pm: the Dinner service is what the suggestion is against, and it says so.
  expect(availableItems(menu, hoursOf(eveningOnly), noon, '2026-09-19').map((c) => ({ meal: c.meal, when: c.when })))
    .toEqual([{ meal: 'Dinner', when: 'from 4:30pm' }])
  // No hours feed at all: the items are still today's, without claiming they are being served this minute.
  expect(availableItems(menu, null, noon, '2026-09-19')[0]?.when).toBe('today')
})

test('availableItems skips a hall that is done for the day, shut all week, or posting nothing', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [item({ recipeNumber: '1' })] }] }])
  const morningOnly: Week = Array.from({ length: 7 }, () => [{ open: 7 * 60, close: 10 * 60 }])
  expect(availableItems(menu, hoursOf(morningOnly), noon, '2026-09-19')).toEqual([]) // reopens tomorrow, not today
  expect(availableItems(menu, hoursOf(shut), noon, '2026-09-19')).toEqual([]) // never opens again
  expect(availableItems(menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [] }] }]), hoursOf(allDay), noon, '2026-09-19')).toEqual([])
  expect(availableItems(menuOf([]), hoursOf(allDay), noon, '2026-09-19')).toEqual([])
  expect(availableItems(null, hoursOf(allDay), noon, '2026-09-19')).toEqual([])
  expect(availableItems(menu, hoursOf(allDay), noon, '2026-09-20')).toEqual([])
})

const gap: Gap = { remaining: { calories: 800, protein: 60, carbs: 80, fat: 20 }, targets }

function pick(menu: Menu, over: Partial<Parameters<typeof pickFoods>[0]> = {}) {
  return pickFoods({ menu, hours: hoursOf(allDay), now: noon, today: '2026-09-19', gap, sodiumHigh: false, fiberLow: false, ...over })
}

test('pickFoods ranks by the gap it closes, names the macro, and drops what closes nothing', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'chicken', name: 'Grilled Chicken', nutrients: nutrients({ calories: 250, protein: 45, fat: 6 }) }),
    item({ recipeNumber: 'salmon', name: 'Baked Salmon', nutrients: nutrients({ calories: 300, protein: 30, fat: 18 }) }),
    item({ recipeNumber: 'cheese', name: 'Cheddar Cubes', nutrients: nutrients({ calories: 110, protein: 7, fat: 9 }) }),
    item({ recipeNumber: 'sauce', name: 'Ranch Cup', nutrients: nutrients({ calories: 20, fat: 2 }) }),
    item({ recipeNumber: 'feast', name: 'Chicken Fried Steak', nutrients: nutrients({ calories: 1900, protein: 40, fat: 90 }) }),
  ] }] }])
  const picks = pick(menu)
  // The condiment is under the plate floor; the 1,900 kcal platter is 1,100 past what is left.
  expect(picks.map((p) => p.item.name)).toEqual(['Grilled Chicken', 'Baked Salmon', 'Cheddar Cubes'])
  expect(picks[0]).toMatchObject({ ink: 'protein', hall: 'J2', meal: 'Lunch', when: 'now' })
  expect(picks[0]?.reason).toBe('45 g protein toward the 60 g left')
  expect(picks[2]).toMatchObject({ ink: 'fat', reason: '9 g fat toward the 20 g left' })
})

test('pickFoods ranks by the gap closed per calorie, not by the size of the plate', () => {
  // The regression this guards: crediting raw gap closure put a 971 kcal cupcake at the top of a health screen.
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'cake', name: 'Banana Foster Cupcake', nutrients: nutrients({ calories: 971, carbs: 138, fat: 40 }) }),
    item({ recipeNumber: 'broil', name: 'London Broil', nutrients: nutrients({ calories: 480, protein: 48, fat: 33 }) }),
  ] }] }])
  expect(pick(menu, { gap: { remaining: targets, targets } }).map((p) => p.item.name)).toEqual(['London Broil'])
})

test('pickFoods lets a low-fiber week and a high-sodium week move the list', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'beans', name: 'Black Beans', nutrients: nutrients({ calories: 180, protein: 12, carbs: 22, fiber: 12 }) }),
    item({ recipeNumber: 'fish', name: 'Grilled Tilapia', nutrients: nutrients({ calories: 150, protein: 30, sodium: 80 }) }),
    item({ recipeNumber: 'ham', name: 'Salty Ham', nutrients: nutrients({ calories: 150, protein: 30, sodium: 900 }) }),
  ] }] }])
  // On its own the bean plate does not beat an average bite of the day; the two lean proteins tie and sort by name.
  expect(pick(menu).map((p) => p.item.name)).toEqual(['Grilled Tilapia', 'Salty Ham'])
  // While the week's sodium runs high, a 900 mg serving stops being worth suggesting at all.
  expect(pick(menu, { sodiumHigh: true }).map((p) => p.item.name)).toEqual(['Grilled Tilapia'])
  const fiberFirst = pick(menu, { fiberLow: true })
  expect(fiberFirst.map((p) => p.item.name)).toEqual(['Black Beans', 'Grilled Tilapia', 'Salty Ham'])
  expect(fiberFirst[0]).toMatchObject({ ink: null, reason: '12 g of fiber' })
})

test('pickFoods: a met macro earns nothing, a zero target is skipped, and only 6 are offered', () => {
  const met: Gap = { remaining: { calories: 800, protein: -10, carbs: 0, fat: 20 }, targets: { ...targets, fat: 0 } }
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [item({ recipeNumber: 'x', nutrients: nutrients({ calories: 300, protein: 30, carbs: 20, fat: 9 }) })] }] }])
  expect(pick(menu, { gap: met })).toEqual([])
  const many = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: Array.from({ length: 9 }, (_, i) =>
    item({ recipeNumber: `p${String(i)}`, name: `Plate ${String(i)}`, nutrients: nutrients({ calories: 100, protein: 20 + i }) })) }] }])
  expect(pick(many).map((p) => p.item.name)).toEqual(['Plate 8', 'Plate 7', 'Plate 6', 'Plate 5', 'Plate 4', 'Plate 3'])
})

test('pickFoods keeps one row per recipe and breaks ties by name', () => {
  const both = (hall: 'J2' | 'JCL'): HallMenu => ({ hall, meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'same', name: 'Shared Dish', nutrients: nutrients({ calories: 100, protein: 20 }) }),
    item({ recipeNumber: hall === 'J2' ? 'a' : 'b', name: hall === 'J2' ? 'Zebra Cake' : 'Apple Crisp', nutrients: nutrients({ calories: 100, protein: 20 }) }),
  ] }] })
  const picks = pick(menuOf([both('J2'), both('JCL')]))
  expect(picks.map((p) => p.item.name)).toEqual(['Apple Crisp', 'Shared Dish', 'Zebra Cake'])
  expect(picks.filter((p) => p.item.key === 'r:same')).toHaveLength(1)
  expect(picks.find((p) => p.item.key === 'r:same')?.hall).toBe('J2')
})

test('pickFoods skips a row whose macros cannot fit inside its calories', () => {
  // UT publishes this one: 200.6 kcal carrying 348 kcal of macros. Scored as written it clears the bar on fat.
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'rum', name: 'Rum Cake', nutrients: nutrients({ calories: 200.573, protein: 1.694, carbs: 26.803, fat: 26.06, fiber: 0.201, sugar: 9.932, sodium: 185.778 }) }),
    item({ recipeNumber: 'apple', name: 'Gala Apple', nutrients: nutrients({ calories: 125.714, carbs: 34.572, fiber: 6.285, sugar: 25.144 }) }),
  ] }] }])
  expect(pick(menu, { gap: { remaining: targets, targets }, fiberLow: true }).map((p) => p.item.name)).toEqual(['Gala Apple'])
  expect(pick(menu, { gap: null }).map((p) => p.item.name)).toEqual([])
})

test('pickFoods with no targets at all ranks by protein per 100 kcal', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [
    item({ recipeNumber: 'cake', name: 'Cake', nutrients: nutrients({ calories: 400, protein: 4 }) }),
    item({ recipeNumber: 'eggs', name: 'Scrambled Eggs', nutrients: nutrients({ calories: 180, protein: 18 }) }),
    item({ recipeNumber: 'water', name: 'Water', nutrients: nutrients({ calories: 0 }) }),
  ] }] }])
  const picks = pick(menu, { gap: null })
  expect(picks.map((p) => p.item.name)).toEqual(['Scrambled Eggs', 'Cake'])
  expect(picks[0]?.reason).toBe('18 g of protein in 180 kcal')
})

test('legendsByRecipe indexes every day and hall, and survives no menu', () => {
  const menu = menuOf([{ hall: 'J2', meals: [{ name: 'Lunch', items: [item({ recipeNumber: '1', legends: ['Vegan'] })] }] }])
  expect(legendsByRecipe(menu).get('1')).toEqual(['Vegan'])
  expect(legendsByRecipe(null).size).toBe(0)
})
