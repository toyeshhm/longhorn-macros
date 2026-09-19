export interface Nutrients { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }
export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const
export function zeroNutrients(): Nutrients { return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 } }
export function scaleNutrients(n: Nutrients, servings: number): Nutrients {
  const out = zeroNutrients(); for (const k of NUTRIENT_KEYS) out[k] = n[k] * servings; return out
}
export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  const out = zeroNutrients(); for (const n of list) for (const k of NUTRIENT_KEYS) out[k] += n[k]; return out
}
export function round1(n: number): number { const r = Math.round(n * 10) / 10; return r === 0 ? 0 : r }
