import { addDays, daysBetween } from './dates'

export interface WeightPoint { date: string; weightLb: number }
export interface DayIntake { date: string; calories: number } // only days with ≥1 entry

/**
 * Why the estimate moved, as a name rather than a sentence: the card that prints it is translated, and a module
 * that decides the arithmetic has no business deciding the wording.
 */
export type PaceReason =
  | 'onPace' | 'losingSlower' | 'losingFaster' | 'gainingSlower' | 'gainingFaster' | 'driftingUp' | 'driftingDown'

export type AdaptiveResult =
  | { kind: 'not-due' }
  | { kind: 'insufficient'; loggedDaysNeeded: number; weighInsNeeded: number }
  | {
      kind: 'updated'
      previous: number
      next: number
      estimate: number
      actualLbPerWeek: number
      plannedLbPerWeek: number
      reason: PaceReason
    }

const MIN_LOGGED_DAYS = 14
const MIN_WEIGH_INS = 8
const WINDOW_DAYS = 21
const KCAL_PER_LB = 3500
const CLAMP = 150
const PACE_TOLERANCE = 0.2

export function ewmaTrend(points: readonly WeightPoint[], alpha = 0.1): WeightPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const result: WeightPoint[] = []
  let trend = 0
  sorted.forEach((p, i) => {
    trend = i === 0 ? p.weightLb : trend + alpha * (p.weightLb - trend)
    result.push({ date: p.date, weightLb: trend })
  })
  return result
}

// trendInWindow always has one point per in-window weigh-in (ewmaTrend maps 1:1,
// preserving date), so callers that already checked weighIns >= MIN_WEIGH_INS never
// hit the empty case below — it's here only so noUncheckedIndexedAccess is honest.
export function trendBounds(trendInWindow: readonly WeightPoint[]): { first: WeightPoint; last: WeightPoint } {
  const first = trendInWindow[0]
  const last = trendInWindow[trendInWindow.length - 1]
  if (first === undefined || last === undefined) throw new Error('trendBounds: empty window')
  return { first, last }
}

function reasonFor(actualLbPerWeek: number, plannedLbPerWeek: number): PaceReason {
  if (Math.abs(actualLbPerWeek - plannedLbPerWeek) < PACE_TOLERANCE) return 'onPace'
  if (plannedLbPerWeek < 0) return actualLbPerWeek > plannedLbPerWeek ? 'losingSlower' : 'losingFaster'
  if (plannedLbPerWeek > 0) return actualLbPerWeek < plannedLbPerWeek ? 'gainingSlower' : 'gainingFaster'
  return actualLbPerWeek > 0 ? 'driftingUp' : 'driftingDown'
}

export function evaluateAdaptive(a: {
  today: string
  lastRunOn: string | null
  previous: number
  plannedLbPerWeek: number
  weights: readonly WeightPoint[]
  intake: readonly DayIntake[]
}): AdaptiveResult {
  const { today, lastRunOn, previous, plannedLbPerWeek, weights, intake } = a
  if (lastRunOn !== null && daysBetween(lastRunOn, today) < 7) return { kind: 'not-due' }

  const windowStart = addDays(today, -WINDOW_DAYS)
  const inWindow = (date: string): boolean => date > windowStart && date <= today

  const loggedDays = intake.filter((d) => inWindow(d.date)).length
  const weighIns = weights.filter((w) => inWindow(w.date)).length
  if (loggedDays < MIN_LOGGED_DAYS || weighIns < MIN_WEIGH_INS) {
    return {
      kind: 'insufficient',
      loggedDaysNeeded: Math.max(0, MIN_LOGGED_DAYS - loggedDays),
      weighInsNeeded: Math.max(0, MIN_WEIGH_INS - weighIns),
    }
  }

  const trendInWindow = ewmaTrend(weights).filter((p) => inWindow(p.date))
  const { first, last } = trendBounds(trendInWindow)
  const span = daysBetween(first.date, last.date)
  if (span < 7) return { kind: 'insufficient', loggedDaysNeeded: 0, weighInsNeeded: 1 }

  const deltaTrend = last.weightLb - first.weightLb
  const windowIntake = intake.filter((d) => inWindow(d.date))
  const meanCalories = windowIntake.reduce((sum, d) => sum + d.calories, 0) / windowIntake.length
  const estimate = meanCalories - (deltaTrend * KCAL_PER_LB) / span
  const blended = 0.5 * estimate + 0.5 * previous
  const clamped = Math.max(-CLAMP, Math.min(CLAMP, blended - previous))
  const next = Math.round(previous + clamped)
  const actualLbPerWeek = Math.round(((deltaTrend / span) * 7) * 10) / 10

  return {
    kind: 'updated',
    previous,
    next,
    estimate,
    actualLbPerWeek,
    plannedLbPerWeek,
    reason: reasonFor(actualLbPerWeek, plannedLbPerWeek),
  }
}
