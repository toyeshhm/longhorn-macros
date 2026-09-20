import { evaluateAdaptive, ewmaTrend, type WeightPoint } from './adaptive'
import { dailyIntake } from './adaptiveRun'
import { addDays, dateLabel, daysBetween } from './dates'
import type { LogEntry, ProfileRow, WeightEntry } from './db/types'
import { round1 } from './nutrition'
import { n } from './ui/format'

/**
 * Everything the Progress screen works out: which days a range covers, the series it can draw (weight,
 * daily calories, and weight predicted from what was eaten), the numbers printed under the chart, and the
 * geometry of the hand-inked chart itself. The screen draws what these return and judges nothing.
 *
 * The same two rules Health follows hold here. A day with nothing logged is absent from every average and
 * from the prediction, never a zero. And nothing is quietly assumed: the prediction says out loud which
 * maintenance figure it ran on, because that figure is an estimate and it moves.
 */

export interface Point { readonly date: string; readonly value: number }

export const RANGES = ['30', '90', 'all'] as const
export type Range = (typeof RANGES)[number]

/** The pound of body mass the prediction converts a calorie surplus or deficit with. */
export const KCAL_PER_LB = 3500
/** Days the calories view's moving average looks back over, today included. */
export const MEAN_DAYS = 7

const byDate = (a: Point, b: Point): number => a.date.localeCompare(b.date)

export function rangeDays(range: Range): number | null {
  return range === 'all' ? null : Number(range)
}

/** The first day a range covers, today included, or null for all of it. */
export function rangeStart(today: string, range: Range): string | null {
  const days = rangeDays(range)
  return days === null ? null : addDays(today, -(days - 1))
}

/** A range shorter than the data clips it; a range longer than the data simply holds all of it. */
export function inRange(date: string, today: string, range: Range): boolean {
  const start = rangeStart(today, range)
  return date <= today && (start === null || date >= start)
}

/**
 * Weigh-ins in range with the smoothed trend beside them. The EWMA runs over the whole history and is
 * windowed afterwards, so the trend that arrives at the left edge is already warmed up instead of starting
 * over from whichever point the reader happens to be looking at.
 */
export function weightSeries(weights: readonly WeightEntry[], today: string, range: Range): { weighIns: Point[]; trend: Point[] } {
  const history: WeightPoint[] = weights.map((w) => ({ date: w.date, weightLb: w.weightLb }))
  const keep = (p: WeightPoint): boolean => inRange(p.date, today, range)
  const point = (p: WeightPoint): Point => ({ date: p.date, value: p.weightLb })
  return { weighIns: history.filter(keep).map(point).sort(byDate), trend: ewmaTrend(history).filter(keep).map(point) }
}

/** One point per day with at least one live row, ascending. A day with nothing logged is absent, not a zero. */
export function calorieSeries(entries: readonly LogEntry[], today: string, range: Range): Point[] {
  return dailyIntake(entries).filter((d) => inRange(d.date, today, range)).map((d) => ({ date: d.date, value: d.calories }))
}

/**
 * Trailing mean over the days that exist, one value per logged day. A week with three days logged averages
 * those three; it does not divide by seven and report a fast.
 * ponytail: O(n²) over at most a few hundred days, and it runs once per render. A sliding window if that changes.
 */
export function movingMean(points: readonly Point[], days: number): Point[] {
  return points.map((p) => {
    const from = addDays(p.date, -(days - 1))
    const window = points.filter((q) => q.date >= from && q.date <= p.date)
    return { date: p.date, value: window.reduce((sum, q) => sum + q.value, 0) / window.length }
  })
}

/**
 * Weight predicted from intake: start at the first weigh-in in range and add (intake − maintenance) ÷ 3,500 lb
 * for every logged day after it. Two deliberate choices, both stated on screen:
 *
 * - A day with nothing logged is skipped, so the line holds flat across a gap rather than inventing a fast.
 * - The anchor day's own food counts from the next day, because a weigh-in comes before the day is eaten.
 *
 * `weighIns` must be ascending, as weightSeries returns them.
 */
export function predictedSeries(a: {
  weighIns: readonly Point[]
  entries: readonly LogEntry[]
  maintenance: number
  today: string
  range: Range
}): Point[] {
  const anchor = a.weighIns[0]
  if (anchor === undefined) return []
  const out: Point[] = [anchor]
  let lb = anchor.value
  for (const day of calorieSeries(a.entries, a.today, a.range)) {
    if (day.date <= anchor.date) continue
    lb += (day.value - a.maintenance) / KCAL_PER_LB
    out.push({ date: day.date, value: lb })
  }
  return out
}

/** What the prediction assumed, always printed with it: the estimate moves, and a line drawn from it is only as good. */
export function predictionNote(maintenance: number | null): string {
  if (maintenance === null) return 'No maintenance estimate yet, so there is nothing to predict from. Set up your goals first.'
  return `Predicted from intake at ${n(maintenance)} kcal a day of maintenance, ${n(KCAL_PER_LB)} kcal to the pound. Days you did not log are skipped, so the line holds flat across a gap.`
}

export interface Summary {
  /** The smoothed trend at its last weigh-in in range, which is the weight to read rather than the last scale number. */
  readonly trendWeight: number | null
  readonly changeLb: number | null
  /** Days between the first and last weigh-in in range: what the change is actually over. */
  readonly spanDays: number
  /** The change's own label, because a change is meaningless without the days it happened over. */
  readonly changeLabel: string
  readonly avgCalories: number | null
  readonly daysLogged: number
  readonly rangeDays: number | null
}

export function summarize(a: { trend: readonly Point[]; calories: readonly Point[]; range: Range }): Summary {
  const first = a.trend[0]
  const last = a.trend[a.trend.length - 1]
  const ends = first === undefined || last === undefined ? null : { first, last }
  const days = a.calories.length
  const spanDays = ends === null ? 0 : daysBetween(ends.first.date, ends.last.date)
  return {
    trendWeight: ends === null ? null : round1(ends.last.value),
    changeLb: ends === null ? null : round1(ends.last.value - ends.first.value),
    spanDays,
    changeLabel: spanDays === 0 ? 'Change' : `Change over ${spanDays === 1 ? 'a day' : `${String(spanDays)} days`}`,
    avgCalories: days === 0 ? null : a.calories.reduce((sum, p) => sum + p.value, 0) / days,
    daysLogged: days,
    rangeDays: rangeDays(a.range),
  }
}

/** Signed so a gain never reads as a loss: the sign is the whole point of the figure. */
export function signed(lb: number): string {
  return lb > 0 ? `+${String(lb)}` : String(lb)
}

/** Where adaptive TDEE stands: the estimate it landed on, or what it is still short of. */
export function adaptiveStatus(profile: ProfileRow | null | undefined, weights: readonly WeightEntry[], entries: readonly LogEntry[], today: string): string {
  if (profile?.tdeeEstimate != null && profile.tdeeUpdatedOn !== null) {
    const on = new Date(`${profile.tdeeUpdatedOn}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `Maintenance estimate: ${n(profile.tdeeEstimate)} kcal (updated ${on})`
  }
  // Only the eligibility part of the result is used here; previous/pace don't affect it.
  const r = evaluateAdaptive({
    today, lastRunOn: null, previous: 0, plannedLbPerWeek: 0,
    weights: weights.map((w) => ({ date: w.date, weightLb: w.weightLb })), intake: dailyIntake(entries),
  })
  if (r.kind === 'insufficient') {
    const parts = [
      r.loggedDaysNeeded > 0 && `~${String(r.loggedDaysNeeded)} more logged days`,
      r.weighInsNeeded > 0 && `${String(r.weighInsNeeded)} ${r.weighInsNeeded === 1 ? 'weigh-in' : 'weigh-ins'}`,
    ].filter((p) => p !== false)
    return `Needs ${parts.join(' and ')}`
  }
  return profile?.adaptiveEnabled
    ? 'Enough data. Your maintenance estimate updates next time you open the app.'
    : 'Enough data. Turn on adaptive TDEE in Goals to learn your maintenance.'
}

// ------------------------------------------------------------------------------------------------- chart

export type Mark = 'dots' | 'trend' | 'predicted'
export interface ChartSeries { readonly id: string; readonly label: string; readonly mark: Mark; readonly points: readonly Point[] }
export interface Plot { readonly id: string; readonly label: string; readonly mark: Mark; readonly xy: readonly (readonly [number, number])[] }
export type Anchor = 'start' | 'middle' | 'end'
export interface ChartGeometry {
  readonly plots: readonly Plot[]
  readonly yTicks: readonly { readonly y: number; readonly label: string }[]
  readonly xLabels: readonly { readonly x: number; readonly y: number; readonly label: string; readonly anchor: Anchor }[]
  /** The plot rectangle in user units: the axis is drawn on x0/y1 and the gridlines run x0 → x1. */
  readonly frame: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }
}

/** Courier Prime is monospace, so a label's width is known without measuring it: every glyph advances 0.6em. */
const CHAR = 0.6
/** A date label is at most "12/31" wide, and labels are kept a space apart. */
const DATE_CHARS = 5
const MAX_Y_TICKS = 4
const MIN_Y_TICKS = 2
const MAX_X_LABELS = 5
const GUTTER = 10

/**
 * Pure SVG geometry for the hand-inked chart: x is linear in calendar days, y spans the values of every series
 * padded by `yPad`, and the axis labels are laid out for the text size actually in use. That last part is the
 * point of taking `font`: the chart's type is sized in user units, so it does not grow with the reader's text
 * setting the way the page does. The screen passes the reader's own size in, and the number of labels and ticks
 * drops until they fit rather than printing five dates on top of each other.
 */
export function chartGeometry(a: {
  series: readonly ChartSeries[]
  width: number
  height: number
  font: number
  yPad: number
  format: (value: number) => string
}): ChartGeometry {
  const { width, height, font, format } = a
  const all = a.series.flatMap((s) => s.points)
  const x1 = width - font * CHAR
  const y0 = font * 0.7
  const y1 = height - font * 1.9
  if (all.length === 0) return { plots: [], yTicks: [], xLabels: [], frame: { x0: GUTTER, y0, x1, y1 } }

  const values = all.map((p) => p.value)
  const yMin = Math.min(...values) - a.yPad
  const yMax = Math.max(...values) + a.yPad
  const tickCount = Math.max(MIN_Y_TICKS, Math.min(MAX_Y_TICKS, Math.floor((y1 - y0) / (font * 1.6))))
  const tickLabels = Array.from({ length: tickCount }, (_, i) => format(yMin + ((yMax - yMin) * i) / (tickCount - 1)))
  const x0 = Math.max(...tickLabels.map((l) => l.length)) * CHAR * font + GUTTER

  const dates = all.map((p) => p.date)
  const first = dates.reduce((lo, d) => (d < lo ? d : lo))
  const span = daysBetween(first, dates.reduce((hi, d) => (d > hi ? d : hi)))
  const x = (date: string): number => round1(span === 0 ? (x0 + x1) / 2 : x0 + (daysBetween(first, date) / span) * (x1 - x0))
  const y = (value: number): number => round1(y0 + ((yMax - value) / (yMax - yMin)) * (y1 - y0))

  const labelCount = Math.max(1, Math.min(MAX_X_LABELS, span + 1, Math.floor((x1 - x0) / ((DATE_CHARS + 1) * CHAR * font))))
  const anchor = (i: number): Anchor => (labelCount === 1 || (i > 0 && i < labelCount - 1) ? 'middle' : i === 0 ? 'start' : 'end')
  return {
    plots: a.series.map((s) => ({
      id: s.id, label: s.label, mark: s.mark,
      xy: [...s.points].sort(byDate).map((p) => [x(p.date), y(p.value)] as const),
    })),
    yTicks: tickLabels.map((label, i) => ({ y: y(yMin + ((yMax - yMin) * i) / (tickCount - 1)), label })),
    xLabels: Array.from({ length: labelCount }, (_, i) => {
      const date = labelCount === 1 ? first : addDays(first, Math.round((span * i) / (labelCount - 1)))
      return { x: x(date), y: round1(y1 + font * 1.35), label: dateLabel(date).date, anchor: anchor(i) }
    }),
    frame: { x0: round1(x0), y0: round1(y0), x1: round1(x1), y1: round1(y1) },
  }
}

/** Every date any series has a point on, ascending: the rows of the chart's text alternative. */
export function chartDates(series: readonly ChartSeries[]): string[] {
  return [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort((a, b) => a.localeCompare(b))
}
