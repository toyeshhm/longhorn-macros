export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'cut' | 'maintain' | 'bulk'
export interface Targets { calories: number; protein: number; carbs: number; fat: number }
export interface Profile {
  sex: Sex
  birthYear: number
  heightIn: number
  activity: Activity
  goal: Goal
  rateLbPerWeek: number
  override: Partial<Targets> | null
  adaptiveEnabled: boolean
  tdeeEstimate: number | null
  tdeeUpdatedOn: string | null
  tdeePrevious: number | null
}

/** The four targets, in the order the form prints them. */
export const TARGET_KEYS: readonly (keyof Targets)[] = ['calories', 'protein', 'carbs', 'fat']

export const ACTIVITY_FACTOR: Readonly<Record<Activity, number>> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
}
export const RATE_OPTIONS: Readonly<Record<Goal, readonly number[]>> = {
  cut: [0.5, 1, 1.5, 2], maintain: [0], bulk: [0.25, 0.5, 1],
}

const LB_TO_KG = 0.45359237
const IN_TO_CM = 2.54
const KCAL_PER_LB = 500
const CALORIE_FLOOR: Readonly<Record<Sex, number>> = { male: 1500, female: 1200 }

export function bmr(p: Profile, weightLb: number, year: number): number {
  const kg = weightLb * LB_TO_KG
  const cm = p.heightIn * IN_TO_CM
  const age = year - p.birthYear
  return 10 * kg + 6.25 * cm - 5 * age + (p.sex === 'male' ? 5 : -161)
}

export function formulaTdee(p: Profile, weightLb: number, year: number): number {
  return bmr(p, weightLb, year) * ACTIVITY_FACTOR[p.activity]
}

export function maintenance(p: Profile, weightLb: number, year: number): number {
  return p.tdeeEstimate ?? formulaTdee(p, weightLb, year)
}

export function plannedDelta(p: Profile): number {
  if (p.goal === 'maintain') return 0
  const delta = p.rateLbPerWeek * KCAL_PER_LB
  return p.goal === 'cut' ? -delta : delta
}

// Fields cascade: an override on an earlier field (calories, protein) feeds the
// formula for a later one (fat, carbs) unless that later field is itself overridden.
export function computeTargets(p: Profile, weightLb: number, year: number): Targets {
  const calories = p.override?.calories ??
    Math.max(CALORIE_FLOOR[p.sex], Math.round(maintenance(p, weightLb, year) + plannedDelta(p)))
  const protein = p.override?.protein ?? Math.round((p.goal === 'maintain' ? 0.8 : 1.0) * weightLb)
  const fat = p.override?.fat ?? Math.round(0.25 * calories / 9)
  const carbs = p.override?.carbs ?? Math.max(0, Math.round((calories - 4 * protein - 9 * fat) / 4))
  return { calories, protein, fat, carbs }
}

function inRange(n: number, min: number, max: number): boolean {
  return Number.isFinite(n) && n >= min && n <= max
}

/** The bounds the form's inputs and its messages both read, so the two can never disagree. */
export const BIRTH_YEAR_RANGE = { min: 1900, max: 2015 } as const
export const HEIGHT_IN_RANGE = { min: 48, max: 96 } as const
export const OVERRIDE_RANGE = { min: 0, max: 10000 } as const

/**
 * What is wrong, not how to say it. The wording moved out to the screen when the app learned a second language:
 * the form used to route each message to its field by reading the English text ("starts with 'birth year'"),
 * which is exactly the kind of thing that breaks silently the day the text is translated.
 */
export interface ProfileError { readonly field: 'birthYear' | 'height' | 'rate' | keyof Targets }

export function validateProfile(p: Profile): ProfileError[] {
  const errors: ProfileError[] = []
  if (!inRange(p.birthYear, BIRTH_YEAR_RANGE.min, BIRTH_YEAR_RANGE.max)) errors.push({ field: 'birthYear' })
  if (!inRange(p.heightIn, HEIGHT_IN_RANGE.min, HEIGHT_IN_RANGE.max)) errors.push({ field: 'height' })
  if (!RATE_OPTIONS[p.goal].includes(p.rateLbPerWeek)) errors.push({ field: 'rate' })
  for (const key of TARGET_KEYS) {
    const value = p.override?.[key]
    if (value !== undefined && !inRange(value, OVERRIDE_RANGE.min, OVERRIDE_RANGE.max)) errors.push({ field: key })
  }
  return errors
}
