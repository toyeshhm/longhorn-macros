import { expect, test } from 'vitest'
import type { AdaptiveResult } from '../src/adaptive'
import { applyAdaptive, dailyIntake, plannedLbPerWeek, undoAdaptive } from '../src/adaptiveRun'
import type { LogEntry, ProfileRow } from '../src/db/types'

function entry(id: string, date: string, servings: number, calories: number, deletedAt: string | null = null): LogEntry {
  return {
    id, date, meal: 'lunch', hall: null, station: null, name: id, recipeNumber: null, customFoodId: null, portion: '1 serving',
    servings, updatedAt: '2026-09-18T12:00:00.000Z', deletedAt,
    perServing: { calories, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  }
}

test('dailyIntake groups live entries by date, sums servings × kcal, ascending', () => {
  expect(dailyIntake([
    entry('a', '2026-09-18', 2, 300),
    entry('b', '2026-09-16', 1, 500),
    entry('c', '2026-09-18', 0.5, 100),
    entry('d', '2026-09-17', 1, 900, '2026-09-17T13:00:00.000Z'),
  ])).toEqual([{ date: '2026-09-16', calories: 500 }, { date: '2026-09-18', calories: 650 }])
})

const base: ProfileRow = {
  id: 'u1', updatedAt: '2026-09-18T12:00:00.000Z', deletedAt: null,
  sex: 'male', birthYear: 2006, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
  override: null, adaptiveEnabled: true, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null,
}

test('applyAdaptive stores previous/next/today on updated', () => {
  const r: AdaptiveResult = {
    kind: 'updated', previous: 2770, next: 2635, estimate: 2500, actualLbPerWeek: 0, plannedLbPerWeek: -1, reason: 'onPace',
  }
  expect(applyAdaptive(base, r, '2026-09-19')).toEqual({ ...base, tdeePrevious: 2770, tdeeEstimate: 2635, tdeeUpdatedOn: '2026-09-19' })
})

test('applyAdaptive returns null for not-due and insufficient', () => {
  expect(applyAdaptive(base, { kind: 'not-due' }, '2026-09-19')).toBeNull()
  expect(applyAdaptive(base, { kind: 'insufficient', loggedDaysNeeded: 3, weighInsNeeded: 0 }, '2026-09-19')).toBeNull()
})

test('undoAdaptive restores previous and clears it, keeping the run date', () => {
  const p = { ...base, tdeePrevious: 2770, tdeeEstimate: 2635, tdeeUpdatedOn: '2026-09-19' }
  expect(undoAdaptive(p)).toEqual({ ...p, tdeeEstimate: 2770, tdeePrevious: null })
})

test('plannedLbPerWeek: cut negative, bulk positive, maintain zero', () => {
  expect(plannedLbPerWeek({ ...base, goal: 'cut', rateLbPerWeek: 1.5 })).toBe(-1.5)
  expect(plannedLbPerWeek({ ...base, goal: 'bulk', rateLbPerWeek: 0.5 })).toBe(0.5)
  expect(plannedLbPerWeek({ ...base, goal: 'maintain', rateLbPerWeek: 0 })).toBe(0)
})
