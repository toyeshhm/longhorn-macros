import type { Meal } from './db/types'

const MIN_STEP = 0.25
const MAX_SERVINGS = 50
const DECIMAL = /^(?:\d+\.?\d*|\.\d+)$/
const FRACTION = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/

// Free-entry servings: "1", "1.5", ".5", "1/2", "1 1/2". Anything else, or outside (0, 50], is null.
export function parseServings(input: string): number | null {
  const s = input.trim()
  let value: number
  if (DECIMAL.test(s)) {
    value = Number(s)
  } else {
    const m = FRACTION.exec(s)
    if (!m) return null
    const denominator = Number(m[3])
    if (denominator === 0) return null
    value = Number(m[1] ?? '0') + Number(m[2]) / denominator
  }
  return value > 0 && value <= MAX_SERVINGS ? value : null
}

const FRACTIONS: readonly (readonly [number, string])[] = [[0.25, '1/4'], [1 / 3, '1/3'], [0.5, '1/2'], [2 / 3, '2/3'], [0.75, '3/4']]

// The stored value is a double, so a typed "1 1/3" comes back as 1.3333333333333333. Print the quarters, thirds
// and halves the parser accepts as fractions again, and round anything else to 2dp. Only the printed form changes.
export function formatServings(value: number): string {
  const whole = Math.floor(value)
  const rest = value - whole
  for (const [amount, text] of FRACTIONS) {
    if (Math.abs(rest - amount) < 1e-6) return whole === 0 ? text : `${String(whole)} ${text}`
  }
  return String(Math.round(value * 100) / 100)
}

// ±0.5; an off-grid value first moves to the next 0.5 in the step direction (1.3 +1 → 1.5, 1.3 −1 → 1).
export function stepServings(current: number, dir: 1 | -1): number {
  const halves = current * 2
  const next = Number.isInteger(halves) ? halves + dir : dir > 0 ? Math.ceil(halves) : Math.floor(halves)
  return Math.min(MAX_SERVINGS, Math.max(MIN_STEP, next / 2))
}

export function defaultMealFor(now: Date): Meal {
  const minutes = now.getHours() * 60 + now.getMinutes()
  if (minutes < 630) return 'breakfast'
  if (minutes < 960) return 'lunch'
  if (minutes < 1260) return 'dinner'
  return 'snack'
}
