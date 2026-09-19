import type { Activity, Goal, Sex, Targets } from '../goals'
import { guards } from '../guard'
import { NUTRIENT_KEYS, zeroNutrients, type Nutrients } from '../nutrition'
import { MEALS, type CustomFood, type LogEntry, type ProfileRow, type TableName, type Tables, type WeightEntry } from './types'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const SEXES: readonly Sex[] = ['male', 'female']
const ACTIVITIES: readonly Activity[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const GOALS: readonly Goal[] = ['cut', 'maintain', 'bulk']
const TARGET_KEYS = ['calories', 'protein', 'carbs', 'fat'] as const

// Field readers over one remote record; every failure throws `bad <table> row: <field>`.
function fields(table: TableName, rec: unknown) {
  const g = guards(`bad ${table} row: `)
  const o = g.obj(rec, 'row')
  const str = (f: string): string => g.str(o[f], f)
  const num = (f: string): number => g.num(o[f], f)
  const date = (f: string): string => {
    const s = str(f)
    if (!DATE_KEY.test(s)) g.fail(f)
    return s
  }
  const iso = (f: string): string => {
    const d = new Date(str(f))
    if (Number.isNaN(d.getTime())) g.fail(f)
    return d.toISOString()
  }
  const nullable = <V>(f: string, read: (f: string) => V): V | null => o[f] === null ? null : read(f)
  const bool = (f: string): boolean => {
    const v = o[f]
    return typeof v === 'boolean' ? v : g.fail(f)
  }
  const oneOf = <V extends string>(f: string, allowed: readonly V[]): V => {
    const s = str(f)
    return allowed.find((a) => a === s) ?? g.fail(f)
  }
  const nutrients = (f: string): Nutrients => {
    const n = g.obj(o[f], f)
    const out = zeroNutrients()
    for (const k of NUTRIENT_KEYS) {
      const v = g.num(n[k], `${f}.${k}`)
      if (v < 0) g.fail(`${f}.${k}`)
      out[k] = v
    }
    return out
  }
  const targets = (f: string): Partial<Targets> => {
    const t = g.obj(o[f], f)
    const out: Partial<Targets> = {}
    for (const k of TARGET_KEYS) if (t[k] !== undefined) out[k] = g.num(t[k], `${f}.${k}`)
    return out
  }
  const meta = () => ({ id: str('id'), updatedAt: iso('updated_at'), deletedAt: nullable('deleted_at', iso) })
  return { str, num, date, iso, nullable, bool, oneOf, nutrients, targets, meta }
}

const encoders: { [K in TableName]: (row: Tables[K]) => Record<string, unknown> } = {
  food_log: (r) => ({
    id: r.id, date: r.date, meal: r.meal, hall: r.hall, station: r.station, name: r.name,
    recipe_number: r.recipeNumber, custom_food_id: r.customFoodId, portion: r.portion, servings: r.servings,
    per_serving: r.perServing, updated_at: r.updatedAt, deleted_at: r.deletedAt,
  }),
  custom_foods: (r) => ({
    id: r.id, name: r.name, portion: r.portion, per_serving: r.perServing, updated_at: r.updatedAt, deleted_at: r.deletedAt,
  }),
  weights: (r) => ({ id: r.id, date: r.date, weight_lb: r.weightLb, updated_at: r.updatedAt, deleted_at: r.deletedAt }),
  profile: (r) => ({
    id: r.id, sex: r.sex, birth_year: r.birthYear, height_in: r.heightIn, activity: r.activity, goal: r.goal,
    rate_lb_per_week: r.rateLbPerWeek, override: r.override, adaptive_enabled: r.adaptiveEnabled,
    tdee_estimate: r.tdeeEstimate, tdee_updated_on: r.tdeeUpdatedOn, tdee_previous: r.tdeePrevious,
    updated_at: r.updatedAt, deleted_at: r.deletedAt,
  }),
}

const decoders: { [K in TableName]: (rec: unknown) => Tables[K] } = {
  food_log: (rec): LogEntry => {
    const f = fields('food_log', rec)
    return {
      ...f.meta(), date: f.date('date'), meal: f.oneOf('meal', MEALS), hall: f.nullable('hall', f.str),
      station: f.nullable('station', f.str), name: f.str('name'), recipeNumber: f.nullable('recipe_number', f.str),
      customFoodId: f.nullable('custom_food_id', f.str), portion: f.str('portion'), servings: f.num('servings'),
      perServing: f.nutrients('per_serving'),
    }
  },
  custom_foods: (rec): CustomFood => {
    const f = fields('custom_foods', rec)
    return { ...f.meta(), name: f.str('name'), portion: f.str('portion'), perServing: f.nutrients('per_serving') }
  },
  weights: (rec): WeightEntry => {
    const f = fields('weights', rec)
    return { ...f.meta(), date: f.date('date'), weightLb: f.num('weight_lb') }
  },
  profile: (rec): ProfileRow => {
    const f = fields('profile', rec)
    return {
      ...f.meta(), sex: f.oneOf('sex', SEXES), birthYear: f.num('birth_year'), heightIn: f.num('height_in'),
      activity: f.oneOf('activity', ACTIVITIES), goal: f.oneOf('goal', GOALS), rateLbPerWeek: f.num('rate_lb_per_week'),
      override: f.nullable('override', f.targets), adaptiveEnabled: f.bool('adaptive_enabled'),
      tdeeEstimate: f.nullable('tdee_estimate', f.num), tdeeUpdatedOn: f.nullable('tdee_updated_on', f.date),
      tdeePrevious: f.nullable('tdee_previous', f.num),
    }
  },
}

export function toRemote<T extends TableName>(table: T, row: Tables[T]): Record<string, unknown> {
  return encoders[table](row)
}

export function fromRemote<T extends TableName>(table: T, rec: unknown): Tables[T] {
  return decoders[table](rec)
}
