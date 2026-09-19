import { expect, test } from 'vitest'
import { NUTRIENT_KEYS, round1, scaleNutrients, sumNutrients, zeroNutrients, type Nutrients } from '../src/nutrition'
const a: Nutrients = { calories: 146, protein: 22.4, carbs: 1.1, fat: 4.7, fiber: 0, sugar: 0, sodium: 108 }
test('scale by 1.5', () => {
  const scaled = scaleNutrients(a, 1.5)
  expect(scaled.calories).toBeCloseTo(219)
  expect(scaled.protein).toBeCloseTo(33.6)
  expect(scaled.carbs).toBeCloseTo(1.65)
  expect(scaled.fat).toBeCloseTo(7.05)
  expect(scaled.fiber).toBeCloseTo(0)
  expect(scaled.sugar).toBeCloseTo(0)
  expect(scaled.sodium).toBeCloseTo(162)
})
test('sum and zero', () => { expect(sumNutrients([])).toEqual(zeroNutrients()); expect(sumNutrients([a, a]).calories).toBe(292) })
test('round1', () => { expect(round1(1.25)).toBe(1.3); expect(round1(-0.04)).toBe(0) })
test('NUTRIENT_KEYS covers every field', () => { expect(NUTRIENT_KEYS).toEqual(['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']) })
