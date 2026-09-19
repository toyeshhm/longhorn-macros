import type { AdaptiveResult, DayIntake } from './adaptive'
import type { LogEntry, ProfileRow } from './db/types'
import type { Profile } from './goals'

// Non-deleted entries grouped by date (servings × kcal summed), ascending — days without entries are absent, not 0.
export function dailyIntake(entries: readonly LogEntry[]): DayIntake[] {
  const byDate = new Map<string, number>()
  for (const e of entries) {
    if (e.deletedAt !== null) continue
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.perServing.calories * e.servings)
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, calories]) => ({ date, calories }))
}

// Only an 'updated' result changes the profile; not-due/insufficient store nothing (re-evaluated next open).
export function applyAdaptive(p: ProfileRow, result: AdaptiveResult, today: string): ProfileRow | null {
  if (result.kind !== 'updated') return null
  return { ...p, tdeePrevious: result.previous, tdeeEstimate: result.next, tdeeUpdatedOn: today }
}

// tdeeUpdatedOn is kept so the undone update isn't immediately re-applied on the next open.
export function undoAdaptive(p: ProfileRow): ProfileRow {
  return { ...p, tdeeEstimate: p.tdeePrevious, tdeePrevious: null }
}

export function plannedLbPerWeek(p: Profile): number {
  if (p.goal === 'maintain') return 0
  return p.goal === 'cut' ? -p.rateLbPerWeek : p.rateLbPerWeek
}
