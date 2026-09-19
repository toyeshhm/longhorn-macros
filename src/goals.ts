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
  return p.adaptiveEnabled && p.tdeeEstimate !== null ? p.tdeeEstimate : formulaTdee(p, weightLb, year)
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

export function validateProfile(p: Profile): string[] {
  const errors: string[] = []
  if (!inRange(p.birthYear, 1900, 2015)) errors.push('birth year must be between 1900 and 2015')
  if (!inRange(p.heightIn, 48, 96)) errors.push('height must be between 48 and 96 inches')
  if (!RATE_OPTIONS[p.goal].includes(p.rateLbPerWeek)) {
    errors.push(`rate must be one of ${RATE_OPTIONS[p.goal].join(', ')} lb/week for ${p.goal}`)
  }
  if (p.override) {
    for (const [key, value] of Object.entries(p.override)) {
      if (!inRange(value, 0, 10000)) errors.push(`override ${key} must be between 0 and 10000`)
    }
  }
  return errors
}
