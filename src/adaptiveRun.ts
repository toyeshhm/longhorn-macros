import type { DayIntake } from './adaptive'
import type { LogEntry } from './db/types'

// Non-deleted entries grouped by date (servings × kcal summed), ascending — days without entries are absent, not 0.
export function dailyIntake(entries: readonly LogEntry[]): DayIntake[] {
  const byDate = new Map<string, number>()
  for (const e of entries) {
    if (e.deletedAt !== null) continue
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.perServing.calories * e.servings)
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, calories]) => ({ date, calories }))
}
