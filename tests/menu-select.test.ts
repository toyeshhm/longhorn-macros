import { expect, test } from 'vitest'
import { currentMeal, groupByStation, HALLS } from '../src/menu/select'
import type { MenuItem } from '../src/menu/feed'
import { zeroNutrients } from '../src/nutrition'

function item(name: string, station: string): MenuItem {
  return { recipeNumber: name, name, station, portion: '1 serving', nutrients: zeroNutrients(), legends: [] }
}

test('HALLS lists the three dining halls', () => {
  expect(HALLS).toEqual([{ id: 'J2', label: 'J2' }, { id: 'JCL', label: 'JCL' }, { id: 'Kins', label: 'Kins' }])
})

test('groupByStation preserves feed order', () => {
  const items = [item('a', 'Grill'), item('b', 'Bakery'), item('c', 'Grill')]
  expect(groupByStation(items)).toEqual([
    { station: 'Grill', items: [items[0], items[2]] },
    { station: 'Bakery', items: [items[1]] },
  ])
})

test('currentMeal picks Breakfast before 10:30, Lunch before 4pm, else Dinner', () => {
  expect(currentMeal(['Breakfast', 'Lunch', 'Dinner'], new Date(2026, 8, 18, 8, 0))).toBe('Breakfast')
  expect(currentMeal(['Breakfast', 'Lunch', 'Dinner'], new Date(2026, 8, 18, 12, 0))).toBe('Lunch')
  expect(currentMeal(['Breakfast', 'Lunch', 'Dinner'], new Date(2026, 8, 18, 18, 0))).toBe('Dinner')
})

test('falls back to Brunch when Breakfast preferred but only Brunch available', () => {
  expect(currentMeal(['Brunch', 'Dinner'], new Date(2026, 8, 19, 9, 0))).toBe('Brunch')
})

test('falls back to first available meal when nothing matches', () => {
  expect(currentMeal(['Lunch', 'Dinner'], new Date(2026, 8, 18, 8, 0))).toBe('Lunch')
  expect(currentMeal(['Breakfast'], new Date(2026, 8, 18, 12, 0))).toBe('Breakfast')
})

test('empty available list returns null', () => {
  expect(currentMeal([], new Date(2026, 8, 18, 8, 0))).toBeNull()
})
