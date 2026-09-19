import { expect, test } from 'vitest'
import { defaultMealFor, parseServings, stepServings } from '../src/servings'

test('parseServings accepts integers, decimals, fractions and mixed numbers', () => {
  expect(parseServings('1')).toBe(1)
  expect(parseServings('1.5')).toBe(1.5)
  expect(parseServings('.5')).toBe(0.5)
  expect(parseServings('2.')).toBe(2)
  expect(parseServings('1/2')).toBe(0.5)
  expect(parseServings('1 1/2')).toBe(1.5)
  expect(parseServings('  3/4  ')).toBe(0.75)
  expect(parseServings('50')).toBe(50)
})

test('parseServings rejects empty, junk, zero, negatives, >50 and zero denominators', () => {
  for (const bad of ['', ' ', 'abc', '1..5', '-1', '0', '0.0', '0/4', '50.5', '51', '101/2', '1/0', '1 1/0', '1/2/3', '1 1', '1e2', 'Infinity', 'NaN', '1,5', '.']) {
    expect(parseServings(bad), bad).toBeNull()
  }
})

test('stepServings moves by 0.5 on the grid', () => {
  expect(stepServings(1, 1)).toBe(1.5)
  expect(stepServings(1.5, -1)).toBe(1)
})

test('stepServings snaps off-grid values to the next 0.5 in the step direction', () => {
  expect(stepServings(1.3, 1)).toBe(1.5)
  expect(stepServings(1.3, -1)).toBe(1)
  expect(stepServings(0.25, 1)).toBe(0.5)
})

test('stepServings never goes below 0.25 or above 50', () => {
  expect(stepServings(0.5, -1)).toBe(0.25)
  expect(stepServings(0.25, -1)).toBe(0.25)
  expect(stepServings(0.1, -1)).toBe(0.25)
  expect(stepServings(50, 1)).toBe(50)
  expect(stepServings(49.8, 1)).toBe(50)
})

const at = (h: number, m: number): Date => new Date(2026, 8, 19, h, m)

test('defaultMealFor splits the day at 10:30, 16:00 and 21:00', () => {
  expect(defaultMealFor(at(0, 0))).toBe('breakfast')
  expect(defaultMealFor(at(10, 29))).toBe('breakfast')
  expect(defaultMealFor(at(10, 30))).toBe('lunch')
  expect(defaultMealFor(at(15, 59))).toBe('lunch')
  expect(defaultMealFor(at(16, 0))).toBe('dinner')
  expect(defaultMealFor(at(20, 59))).toBe('dinner')
  expect(defaultMealFor(at(21, 0))).toBe('snack')
  expect(defaultMealFor(at(23, 59))).toBe('snack')
})
