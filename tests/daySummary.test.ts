import { expect, test } from 'vitest'
import { summarizeDay } from '../src/daySummary'
import type { LogEntry, Meal } from '../src/db/types'

function entry(id: string, meal: Meal, servings: number, calories: number, deletedAt: string | null = null): LogEntry {
  return {
    id, date: '2026-09-18', meal, hall: 'J2', station: 'Grill', name: `food ${id}`, recipeNumber: null, customFoodId: null,
    portion: '1 cup', servings, updatedAt: '2026-09-18T12:00:00.000Z', deletedAt,
    perServing: { calories, protein: 10, carbs: 20, fat: 5, fiber: 1, sugar: 2, sodium: 100 },
  }
}

const targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 }

test('totals scale by servings and exclude deleted rows', () => {
  const s = summarizeDay([entry('a', 'lunch', 2, 300), entry('b', 'dinner', 1, 500), entry('c', 'lunch', 1, 900, '2026-09-18T13:00:00.000Z')], targets)
  expect(s.total).toEqual({ calories: 1100, protein: 30, carbs: 60, fat: 15, fiber: 3, sugar: 6, sodium: 300 })
  expect(s.remaining).toEqual({ calories: 900, protein: 120, carbs: 140, fat: 45 })
})

test('byMeal follows MEALS order, skips empty meals, carries subtotals', () => {
  const s = summarizeDay([entry('s', 'snack', 1, 100), entry('d', 'dinner', 1, 500), entry('b', 'breakfast', 0.5, 400), entry('b2', 'breakfast', 1, 50)], null)
  expect(s.byMeal.map((g) => g.meal)).toEqual(['breakfast', 'dinner', 'snack'])
  expect(s.byMeal.map((g) => g.calories)).toEqual([250, 500, 100])
  expect(s.byMeal[0]?.entries.map((e) => e.id)).toEqual(['b', 'b2'])
})

test('remaining goes negative when over; null without targets', () => {
  expect(summarizeDay([entry('a', 'lunch', 1, 2500)], targets).remaining?.calories).toBe(-500)
  const empty = summarizeDay([], null)
  expect(empty.remaining).toBeNull()
  expect(empty.byMeal).toEqual([])
  expect(empty.total.calories).toBe(0)
})
