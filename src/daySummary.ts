import { MEALS, type LogEntry, type Meal } from './db/types'
import type { Targets } from './goals'
import { scaleNutrients, sumNutrients, type Nutrients } from './nutrition'

export interface DaySummary {
  total: Nutrients
  byMeal: readonly { meal: Meal; entries: readonly LogEntry[]; calories: number }[]
  remaining: Targets | null
}

// Deleted rows are excluded; byMeal is in MEALS order with empty meals dropped; remaining may be negative (over).
export function summarizeDay(entries: readonly LogEntry[], targets: Targets | null): DaySummary {
  const live = entries.filter((e) => e.deletedAt === null)
  const total = sumNutrients(live.map((e) => scaleNutrients(e.perServing, e.servings)))
  const byMeal = MEALS.flatMap((meal) => {
    const mine = live.filter((e) => e.meal === meal)
    if (mine.length === 0) return []
    return [{ meal, entries: mine, calories: mine.reduce((sum, e) => sum + e.perServing.calories * e.servings, 0) }]
  })
  const remaining = targets && {
    calories: targets.calories - total.calories,
    protein: targets.protein - total.protein,
    carbs: targets.carbs - total.carbs,
    fat: targets.fat - total.fat,
  }
  return { total, byMeal, remaining }
}

// Copies live entries onto `toDate` as new rows (fresh ids), e.g. "repeat yesterday's lunch".
export function copyMeal(entries: readonly LogEntry[], toDate: string, now: () => string): LogEntry[] {
  return entries
    .filter((e) => e.deletedAt === null)
    .map((e) => ({ ...e, id: crypto.randomUUID(), date: toDate, updatedAt: now() }))
}
