import { expect, test } from 'vitest'
import { dailyIntake } from '../src/adaptiveRun'
import type { LogEntry } from '../src/db/types'

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
