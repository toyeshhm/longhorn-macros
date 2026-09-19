import { expect, test } from 'vitest'
import { fromRemote, toRemote } from '../src/db/codec'
import type { CustomFood, LogEntry, ProfileRow, WeightEntry } from '../src/db/types'

const per = { calories: 250, protein: 20, carbs: 30, fat: 5, fiber: 2, sugar: 3, sodium: 400 }
const meta = { id: 'a1b2c3d4-0000-4000-8000-000000000001', updatedAt: '2026-09-18T12:00:00.000Z', deletedAt: null }
const log: LogEntry = {
  ...meta, date: '2026-09-18', meal: 'lunch', hall: 'J2', station: 'Grill', name: 'Burger', recipeNumber: '123',
  customFoodId: null, portion: '1 each', servings: 1.5, perServing: per,
}
const custom: CustomFood = { ...meta, deletedAt: '2026-09-19T01:00:00.000Z', name: 'Shake', portion: '1 cup', perServing: per }
const weight: WeightEntry = { ...meta, date: '2026-09-18', weightLb: 180.4 }
const profile: ProfileRow = {
  ...meta, sex: 'male', birthYear: 2004, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
  override: { calories: 2200 }, adaptiveEnabled: true, tdeeEstimate: 2600, tdeeUpdatedOn: '2026-09-15', tdeePrevious: null,
}

test('round-trips every table through snake_case', () => {
  expect(fromRemote('food_log', toRemote('food_log', log))).toEqual(log)
  expect(fromRemote('custom_foods', toRemote('custom_foods', custom))).toEqual(custom)
  expect(fromRemote('weights', toRemote('weights', weight))).toEqual(weight)
  expect(fromRemote('profile', toRemote('profile', profile))).toEqual(profile)
  expect(toRemote('weights', weight)).toEqual({
    id: meta.id, date: '2026-09-18', weight_lb: 180.4, updated_at: meta.updatedAt, deleted_at: null,
  })
  const noOverride = { ...profile, override: null, tdeeUpdatedOn: null }
  expect(fromRemote('profile', toRemote('profile', noOverride))).toEqual(noOverride)
})

test('normalizes Postgres timestamptz to ISO', () => {
  const rec = { ...toRemote('weights', weight), updated_at: '2026-09-18 07:00:00-05' }
  expect(fromRemote('weights', rec).updatedAt).toBe('2026-09-18T12:00:00.000Z')
})

const bad = (table: 'food_log' | 'profile', patch: Record<string, unknown>, field: string): void => {
  const base = table === 'food_log' ? toRemote('food_log', log) : toRemote('profile', profile)
  expect(() => fromRemote(table, { ...base, ...patch })).toThrow(`bad ${table} row: ${field}`)
}

test('rejects a non-object row', () => {
  expect(() => fromRemote('weights', null)).toThrow('bad weights row: row')
  expect(() => fromRemote('custom_foods', [])).toThrow('bad custom_foods row: row')
})

test.each([
  [{ name: 7 }, 'name'],
  [{ hall: 1 }, 'hall'],
  [{ servings: '1' }, 'servings'],
  [{ servings: Infinity }, 'servings'],
  [{ date: '9/18/2026' }, 'date'],
  [{ updated_at: 'not a time' }, 'updated_at'],
  [{ deleted_at: 'nope' }, 'deleted_at'],
  [{ meal: 'brunch' }, 'meal'],
  [{ per_serving: null }, 'per_serving'],
  [{ per_serving: { ...per, sodium: undefined } }, 'per_serving.sodium'],
  [{ per_serving: { ...per, fat: -1 } }, 'per_serving.fat'],
])('food_log rejects %j', (patch, field) => { bad('food_log', patch, field) })

test.each([
  [{ adaptive_enabled: 'yes' }, 'adaptive_enabled'],
  [{ sex: 'other' }, 'sex'],
  [{ override: [] }, 'override'],
  [{ override: { protein: 'x' } }, 'override.protein'],
  [{ tdee_updated_on: '2026-9-1' }, 'tdee_updated_on'],
])('profile rejects %j', (patch, field) => { bad('profile', patch, field) })
