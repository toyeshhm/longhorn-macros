import type { T } from './i18n'

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/
function parts(key: string): [number, number, number] {
  const m = KEY.exec(key)
  if (!m) throw new Error(`invalid date key: ${key}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}
const pad = (n: number): string => String(n).padStart(2, '0')
export function localDateKey(d: Date): string { return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function utcNoon(key: string): number { const [y, m, d] = parts(key); return Date.UTC(y, m - 1, d, 12) }
export function addDays(key: string, n: number): string {
  const t = new Date(utcNoon(key) + n * 86_400_000)
  return `${String(t.getUTCFullYear())}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}
export function daysBetween(a: string, b: string): number { return Math.round((utcNoon(b) - utcNoon(a)) / 86_400_000) }
export function feedDateToKey(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (!m) throw new Error(`invalid feed date: ${s}`)
  const month = Number(m[1])
  const day = Number(m[2])
  const year = Number(m[3])
  return `${String(year)}-${pad(month)}-${pad(day)}`
}

// Menu day chips print the date, not "Today"/"Tomorrow": a relative word is ambiguous on a phone left open
// overnight, and the weekday alone does not say which week. `full` is the chip's accessible name, and it starts
// with the two strings the chip prints: a name that replaced the visible text failed WCAG 2.5.3, so "tap 9/19"
// and "tap Sat" both missed for anyone driving the app by voice.
// The chip's own language, not the device's: `undefined` here handed a Spanish reader an English weekday under a
// Spanish heading, because the browser locale and the app's are two different settings.
export function dateLabel(key: string, t: T): { date: string; weekday: string; full: string } {
  const [y, m, d] = parts(key)
  const at = new Date(y, m - 1, d, 12)
  const date = t.date(at, { month: 'numeric', day: 'numeric' })
  const weekday = t.date(at, { weekday: 'short' })
  const spoken = t.date(at, { weekday: 'long', month: 'long', day: 'numeric' })
  return { date, weekday, full: `${date} ${weekday}, ${spoken}` }
}
