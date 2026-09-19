import { expect, test } from 'vitest'
import { addDays } from '../src/dates'
import { evaluateAdaptive, ewmaTrend, trendBounds, type DayIntake, type WeightPoint } from '../src/adaptive'

const today = '2026-01-21'
const days = Array.from({ length: 21 }, (_, i) => addDays('2026-01-01', i))

// One entry per day for all 21 days in the trailing window → well over the
// 14-logged-day / 8-weigh-in minimums, so sufficiency is never the limiter here.
const intake: DayIntake[] = days.map((date) => ({ date, calories: 2400 }))

// Falling 0.2 lb/day (≈1.4 lb/wk raw); EWMA warm-up lag brings the trend's own
// slope to -0.8 lb/wk over the 20-day span (verified by independent calculation).
const fallingWeights: WeightPoint[] = days.map((date, i) => ({ date, weightLb: 172 - 0.2 * i }))
// Mirror image: rising 0.2 lb/day → trend slope +0.8 lb/wk.
const risingWeights: WeightPoint[] = days.map((date, i) => ({ date, weightLb: 168 + 0.2 * i }))

test('trendBounds returns the first/last point, and rejects an empty window', () => {
  const points: WeightPoint[] = [{ date: '2026-01-01', weightLb: 170 }, { date: '2026-01-02', weightLb: 171 }]
  expect(trendBounds(points)).toEqual({ first: points[0], last: points[1] })
  expect(() => trendBounds([])).toThrow(/empty window/)
})

test('ewmaTrend sorts unsorted input and applies t = t + α(w − t) with trend0 = first weight', () => {
  const unsorted: WeightPoint[] = [
    { date: '2026-01-03', weightLb: 180 },
    { date: '2026-01-01', weightLb: 170 },
    { date: '2026-01-02', weightLb: 175 },
  ]
  expect(ewmaTrend(unsorted)).toEqual([
    { date: '2026-01-01', weightLb: 170 },
    { date: '2026-01-02', weightLb: 170.5 },
    { date: '2026-01-03', weightLb: 171.45 },
  ])
})

test('not-due when last run was under 7 days ago', () => {
  expect(evaluateAdaptive({
    today, lastRunOn: addDays(today, -6), previous: 2600, plannedLbPerWeek: -0.5, weights: [], intake: [],
  })).toEqual({ kind: 'not-due' })
})

test('due (not not-due) once 7 or more days have passed, and on first-ever run', () => {
  const result = evaluateAdaptive({
    today, lastRunOn: addDays(today, -7), previous: 2600, plannedLbPerWeek: -0.5, weights: [], intake: [],
  })
  expect(result.kind).not.toBe('not-due')
  const firstEver = evaluateAdaptive({
    today, lastRunOn: null, previous: 2600, plannedLbPerWeek: -0.5, weights: [], intake: [],
  })
  expect(firstEver.kind).not.toBe('not-due')
})

test('insufficient reports days/weigh-ins still needed, independently', () => {
  const fewLoggedDays = intake.slice(0, 5) // 5 of 14
  const fewWeighIns = fallingWeights.slice(0, 3) // 3 of 8
  expect(evaluateAdaptive({
    today, lastRunOn: null, previous: 2600, plannedLbPerWeek: -0.5, weights: fewWeighIns, intake: fewLoggedDays,
  })).toEqual({ kind: 'insufficient', loggedDaysNeeded: 9, weighInsNeeded: 5 })

  // enough of one, short on the other → the satisfied count reports 0, not negative
  expect(evaluateAdaptive({
    today, lastRunOn: null, previous: 2600, plannedLbPerWeek: -0.5, weights: fallingWeights, intake: fewLoggedDays,
  })).toEqual({ kind: 'insufficient', loggedDaysNeeded: 9, weighInsNeeded: 0 })
})

test('insufficient when weigh-ins are bunched into under a 7-day span', () => {
  // 8 weigh-ins (satisfies the count) but all within a 5-day span
  const d0 = addDays('2026-01-01', 0)
  const d1 = addDays('2026-01-01', 1)
  const d2 = addDays('2026-01-01', 2)
  const d3 = addDays('2026-01-01', 3)
  const d4 = addDays('2026-01-01', 4)
  const d5 = addDays('2026-01-01', 5)
  const bunchedDates = [d0, d0, d1, d2, d3, d4, d5, d5]
  const bunched: WeightPoint[] = bunchedDates.map((date, i) => ({ date, weightLb: 170 + i * 0.1 }))
  expect(evaluateAdaptive({
    today, lastRunOn: null, previous: 2600, plannedLbPerWeek: -0.5, weights: bunched, intake,
  })).toEqual({ kind: 'insufficient', loggedDaysNeeded: 0, weighInsNeeded: 1 })
})

test('updated: estimate from mean intake minus trend-implied deficit, blended and clamped', () => {
  const result = evaluateAdaptive({
    today, lastRunOn: null, previous: 2600, plannedLbPerWeek: -0.5, weights: fallingWeights, intake,
  })
  expect(result.kind).toBe('updated')
  if (result.kind !== 'updated') throw new Error('unreachable')
  expect(result.previous).toBe(2600)
  expect(result.estimate).toBeCloseTo(2823.2966, 4)
  expect(result.actualLbPerWeek).toBe(-0.8)
  expect(result.plannedLbPerWeek).toBe(-0.5)
  expect(result.next).toBe(2712)
  // within the ±150 clamp band around previous
  expect(result.next).toBeGreaterThanOrEqual(2600 - 150)
  expect(result.next).toBeLessThanOrEqual(2600 + 150)
})

test('clamp caps a large upward blend at previous + 150', () => {
  const result = evaluateAdaptive({
    today, lastRunOn: null, previous: 2000, plannedLbPerWeek: -0.5, weights: fallingWeights, intake,
  })
  expect(result.kind).toBe('updated')
  if (result.kind !== 'updated') throw new Error('unreachable')
  expect(result.next).toBe(2150)
})

test('clamp caps a large downward blend at previous − 150', () => {
  const result = evaluateAdaptive({
    today, lastRunOn: null, previous: 3500, plannedLbPerWeek: 0.5, weights: risingWeights, intake,
  })
  expect(result.kind).toBe('updated')
  if (result.kind !== 'updated') throw new Error('unreachable')
  expect(result.next).toBe(3350)
})

function reason(plannedLbPerWeek: number, weights: readonly WeightPoint[]): string {
  const result = evaluateAdaptive({ today, lastRunOn: null, previous: 2600, plannedLbPerWeek, weights, intake })
  if (result.kind !== 'updated') throw new Error('expected updated')
  return result.reason
}

test('reason: right on pace when within 0.2 lb/wk of plan', () => {
  expect(reason(-0.8, fallingWeights)).toBe("you're right on pace")
  expect(reason(0.8, risingWeights)).toBe("you're right on pace")
})

test('reason: cutting slower/faster than planned', () => {
  expect(reason(-1.5, fallingWeights)).toBe("you're losing slower than planned") // actual -0.8 > planned -1.5
  expect(reason(-0.2, fallingWeights)).toBe("you're losing faster than planned") // actual -0.8 < planned -0.2
})

test('reason: bulking slower/faster than planned', () => {
  expect(reason(1.5, risingWeights)).toBe("you're gaining slower than planned") // actual 0.8 < planned 1.5
  expect(reason(0.1, risingWeights)).toBe("you're gaining faster than planned") // actual 0.8 > planned 0.1
})

test('reason: maintain-goal drift has no planned rate to compare against', () => {
  expect(reason(0, risingWeights)).toBe('your weight is drifting up')
  expect(reason(0, fallingWeights)).toBe('your weight is drifting down')
})
