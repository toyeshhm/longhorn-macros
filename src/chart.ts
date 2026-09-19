import type { WeightPoint } from './adaptive'
import { addDays, daysBetween } from './dates'
import type { LogEntry } from './db/types'
import { round1, scaleNutrients, sumNutrients } from './nutrition'

export interface ChartGeometry { points: string; trend: string; yTicks: readonly { y: number; label: string }[]; xLabels: readonly { x: number; label: string }[] }

const Y_TICKS = 4
const MAX_X_LABELS = 5

function monthDay(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

// Pure SVG geometry: x is linear in calendar days, y spans min/max of raw ∪ trend ± 1 lb. Inputs need not be sorted.
export function chartGeometry(raw: readonly WeightPoint[], trend: readonly WeightPoint[], w: number, h: number, pad: number): ChartGeometry {
  const all = [...raw, ...trend]
  if (all.length === 0) return { points: '', trend: '', yTicks: [], xLabels: [] }
  const dates = all.map((p) => p.date)
  const first = dates.reduce((a, b) => (b < a ? b : a))
  const span = daysBetween(first, dates.reduce((a, b) => (b > a ? b : a)))
  const weights = all.map((p) => p.weightLb)
  const yMin = Math.min(...weights) - 1
  const yMax = Math.max(...weights) + 1
  const x = (date: string): number => round1(span === 0 ? w / 2 : pad + (daysBetween(first, date) / span) * (w - 2 * pad))
  const y = (lb: number): number => round1(pad + ((yMax - lb) / (yMax - yMin)) * (h - 2 * pad))
  const line = (ps: readonly WeightPoint[]): string =>
    [...ps].sort((a, b) => a.date.localeCompare(b.date)).map((p) => `${String(x(p.date))},${String(y(p.weightLb))}`).join(' ')
  const yTicks = Array.from({ length: Y_TICKS }, (_, i) => {
    const lb = yMin + ((yMax - yMin) * i) / (Y_TICKS - 1)
    return { y: y(lb), label: String(round1(lb)) }
  })
  const labelCount = Math.min(MAX_X_LABELS, span + 1)
  const xLabels = Array.from({ length: labelCount }, (_, i) => {
    const date = labelCount === 1 ? first : addDays(first, Math.round((span * i) / (labelCount - 1)))
    return { x: x(date), label: monthDay(date) }
  })
  return { points: line(raw), trend: line(trend), yTicks, xLabels }
}

// Trailing 7 days including today; averages divide by days with ≥ 1 live entry, not by 7.
export function weeklyStats(entries: readonly LogEntry[], today: string): { avgCalories: number | null; avgProtein: number | null; daysLogged: number } {
  const start = addDays(today, -7)
  const live = entries.filter((e) => e.deletedAt === null && e.date > start && e.date <= today)
  const daysLogged = new Set(live.map((e) => e.date)).size
  if (daysLogged === 0) return { avgCalories: null, avgProtein: null, daysLogged }
  const total = sumNutrients(live.map((e) => scaleNutrients(e.perServing, e.servings)))
  return { avgCalories: total.calories / daysLogged, avgProtein: total.protein / daysLogged, daysLogged }
}
