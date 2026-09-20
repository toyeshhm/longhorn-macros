import { isPlainObject } from '../guard'
import type { T } from '../i18n'
import type { HallId } from './feed'

// UT serves this as text/plain JavaScript: `const diningHours = { ... };`. Strip the assignment, parse the rest.
export const HOURS_URL = 'https://hf-foodpro.austin.utexas.edu/foodpro/data_all_endpoint.php?hours=1'

/** Minutes from local midnight. `close` may exceed 1440 for a window that runs past midnight. */
export interface OpenWindow { readonly open: number; readonly close: number }
/** `null` = the feed said something we could not read. `[]` = closed all day. */
export type DayHours = readonly OpenWindow[] | null
/** Monday first, seven entries. A shorter array is treated as unknown for the missing days. */
export type Week = readonly DayHours[]
export type Hours = Readonly<Record<HallId, Week>>

// The menu feed calls Jester City Limits "JCL Dining"; the hours feed spells it out.
const HALL_NAMES: Readonly<Record<HallId, string>> = { J2: 'J2 Dining', JCL: 'Jester City Limits', Kins: 'Kins Dining' }
const UNKNOWN_WEEK: Week = [null, null, null, null, null, null, null]
export const UNKNOWN_HOURS: Hours = { J2: UNKNOWN_WEEK, JCL: UNKNOWN_WEEK, Kins: UNKNOWN_WEEK }

const DAY = 1440
// Anchored and fully validating, so the captures are known-good and need no second guard.
const CLOCK = /^(0?[1-9]|1[0-2]):([0-5]\d)(am|pm)$/
const LABEL_RANGE = /\(\d{2}\/\d{2}\/\d{2} *- *\d{2}\/\d{2}\/\d{2}\)/

function clockMinutes(token: string): number | null {
  const t = token.trim().toLowerCase()
  if (t === 'midnight') return 0
  if (t === 'noon') return 12 * 60
  const m = CLOCK.exec(t)
  if (m === null) return null
  return ((Number(m[1]) % 12) + (m[3] === 'pm' ? 12 : 0)) * 60 + Number(m[2])
}

/** One day's cell: "Closed", "7:00am-10:00pm", or windows joined by "|". Anything else is unknown. */
export function parseDay(raw: string): DayHours {
  const text = raw.trim()
  if (text.toLowerCase() === 'closed') return []
  const windows: OpenWindow[] = []
  for (const part of text.split('|')) {
    const dash = part.indexOf('-')
    if (dash < 0) return null
    const open = clockMinutes(part.slice(0, dash))
    const close = clockMinutes(part.slice(dash + 1))
    if (open === null || close === null) return null
    // "9:00pm-1:00am" and "4:00pm-Midnight" both close on the next calendar day.
    windows.push({ open, close: close <= open ? close + DAY : close })
  }
  return windows
}

function parseWeek(v: unknown): Week {
  if (!Array.isArray(v)) return UNKNOWN_WEEK
  return v.map((d: unknown) => (typeof d === 'string' ? parseDay(d) : null))
}

// "Fall 2026 Semester (08/24/26 - 12/15/26)" → ["2026-08-24", "2026-12-15"].
function labelRange(label: string): readonly [string, string] | null {
  const found = LABEL_RANGE.exec(label)
  if (found === null) return null
  const digits = found[0].replace(/\D/g, '') // mmddyy mmddyy
  const key = (at: number): string => `20${digits.slice(at + 4, at + 6)}-${digits.slice(at, at + 2)}-${digits.slice(at + 2, at + 4)}`
  return [key(0), key(6)]
}

// Only one semester is published at a time today, but the label carries a date range, so honour it.
function semester(root: Record<string, unknown>, today: string): unknown {
  const entries = Object.entries(root)
  for (const [label, value] of entries) {
    const range = labelRange(label)
    if (range !== null && range[0] <= today && today <= range[1]) return value
  }
  return entries[0]?.[1]
}

export function parseHours(body: string, today: string): Hours {
  const eq = body.indexOf('=')
  if (eq < 0) throw new Error('UT hours feed format changed: no assignment')
  const root: unknown = JSON.parse(body.slice(eq + 1).trim().replace(/;$/, ''))
  if (!isPlainObject(root)) throw new Error('UT hours feed format changed: root')
  const chosen = semester(root, today)
  const group: unknown = isPlainObject(chosen) ? chosen['Dining Halls'] : undefined
  const halls: Record<string, unknown> = isPlainObject(group) ? group : {}
  return { J2: parseWeek(halls[HALL_NAMES.J2]), JCL: parseWeek(halls[HALL_NAMES.JCL]), Kins: parseWeek(halls[HALL_NAMES.Kins]) }
}

/** Monday-first index, matching the feed's array order. */
export function dayIndex(d: Date): number { return (d.getDay() + 6) % 7 }

/** The week's short day names in the reader's language, Monday first, for the Profile hours table. */
export function dayNames(t: T): string[] {
  // 2024-01-01 was a Monday; the names come from Intl rather than a list, so they move with the language.
  return Array.from({ length: 7 }, (_, i) => t.date(new Date(2024, 0, 1 + i), { weekday: 'short' }))
}
function minutesOf(d: Date): number { return d.getHours() * 60 + d.getMinutes() }
function dayAt(week: Week, i: number): DayHours { return week[i] ?? null }

export type Status =
  | { readonly state: 'open'; readonly until: number; readonly reopens: number | null }
  /** `day` names the day it opens again ("tomorrow", "Mon"); `null` means later today. */
  | { readonly state: 'closed'; readonly opens: number | null; readonly day: string | null; readonly allDay: boolean }
  | { readonly state: 'unknown' }

/** The short weekday `plus` days from `now`, in the app's language (not the device's). */
function weekday(now: Date, plus: number, t: T): string {
  return t.date(new Date(now.getFullYear(), now.getMonth(), now.getDate() + plus), { weekday: 'short' })
}

// Done for the day: walk forward for the next day that opens at all. JCL is shut from Saturday afternoon to Monday
// morning, and "Closed" with no reopening time is exactly the weekend a student needs told. A day the feed wrote in
// a way we cannot read ends the walk: we cannot promise Monday when Sunday is a question mark.
function nextOpening(week: Week, now: Date, i: number, t: T): { opens: number | null; day: string | null } {
  for (let n = 1; n < 7; n++) {
    const ahead = dayAt(week, (i + n) % 7)
    if (ahead === null) break
    const first = ahead[0]
    if (first !== undefined) return { opens: first.open, day: n === 1 ? t.t('hours.tomorrow') : weekday(now, n, t) }
  }
  return { opens: null, day: null }
}

export function hallStatus(week: Week, now: Date, t: T): Status {
  const i = dayIndex(now)
  const minutes = minutesOf(now)
  const today = dayAt(week, i)
  // A window opened yesterday can still be running (close > 1440 means it spills past midnight).
  const late = dayAt(week, (i + 6) % 7)?.find((w) => w.close > DAY && minutes + DAY < w.close)
  // ponytail: no "reopens" on a carried-over window. At 12:30am "Open until 1:00am" is the whole answer.
  if (late !== undefined) return { state: 'open', until: late.close - DAY, reopens: null }
  if (today === null) return { state: 'unknown' }
  const next = today.find((w) => w.open > minutes)
  const open = today.find((w) => w.open <= minutes && minutes < w.close)
  if (open !== undefined) return { state: 'open', until: open.close, reopens: next?.open ?? null }
  if (next !== undefined) return { state: 'closed', opens: next.open, day: null, allDay: false }
  return { state: 'closed', ...nextOpening(week, now, i, t), allDay: today.length === 0 }
}

/** English reads the 12-hour clock UT publishes ("4:30pm"); Spanish reads the 24-hour one it actually uses. */
export function formatTime(minutes: number, t: T): string {
  const m = ((minutes % DAY) + DAY) % DAY
  if (m === 0) return t.t('hours.midnight')
  const h = Math.floor(m / 60)
  const mm = String(m % 60).padStart(2, '0')
  if (!t.hour12) return `${String(h)}:${mm}`
  return `${String(h % 12 === 0 ? 12 : h % 12)}:${mm}${h < 12 ? 'am' : 'pm'}`
}

/** One line for the selected hall: state first, in words, then the times. */
export function statusText(s: Status, t: T): string {
  if (s.state === 'unknown') return t.t('hours.unavailable')
  if (s.state === 'open') {
    const until = formatTime(s.until, t)
    return s.reopens === null
      ? t.t('hours.openUntil', { until })
      : t.t('hours.openUntilReopens', { until, reopens: formatTime(s.reopens, t) })
  }
  const head = s.allDay ? t.t('hours.closedToday') : t.t('hours.closed')
  if (s.opens === null) return head
  const at = formatTime(s.opens, t)
  return s.day === null ? t.t('hours.opens', { head, at }) : t.t('hours.opensDay', { head, day: s.day, at })
}

/** A day's windows written out, for the status line and the week table. */
export function dayText(day: DayHours, t: T): string {
  if (day === null) return t.t('hours.unknown')
  if (day.length === 0) return t.t('hours.closed')
  return day.map((w) => `${formatTime(w.open, t)}–${formatTime(w.close, t)}`).join(', ')
}

/**
 * The hours strip for the day being browsed. `offset` is that day minus today in days: today gets its live status,
 * any other day its own windows under its weekday, because "Today" over a Tuesday menu is a lie. The second line
 * is dropped whenever it would only restate the first (closed all day, unreadable, or already done for today).
 */
export function hoursLine(week: Week, now: Date, offset: number, t: T): { readonly head: string; readonly detail: string | null } {
  if (offset !== 0) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
    const windows = dayText(dayAt(week, dayIndex(at)), t)
    return { head: t.t('hours.dayWindows', { day: weekday(now, offset, t), windows }), detail: null }
  }
  const status = hallStatus(week, now, t)
  const today = dayAt(week, dayIndex(now))
  const spent = status.state === 'closed' && status.day !== null
  const said = spent || today === null || today.length === 0
  return { head: statusText(status, t), detail: said ? null : t.t('hours.todayWindows', { windows: dayText(today, t) }) }
}

export async function fetchHours(fetchFn: typeof fetch): Promise<string> {
  const r = await fetchFn(HOURS_URL)
  if (!r.ok) throw new Error(`UT hours HTTP ${String(r.status)}`)
  return r.text()
}
