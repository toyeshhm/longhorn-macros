import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import {
  DARK_PRESS_IDS, DEFAULT_PREFS, formatPrefs, LIGHT_PRESS_IDS, parsePrefs, PRESS_CHOICES, PRESS_IDS,
  PRESS_STORAGE_KEY, PRESSES, pressVars, resolvePress, type Press, type PressId,
} from '../src/theme'

test('the presses split into the two schemes and nothing is in both or neither', () => {
  expect([...LIGHT_PRESS_IDS, ...DARK_PRESS_IDS].toSorted()).toEqual([...PRESS_IDS].toSorted())
  for (const id of LIGHT_PRESS_IDS) expect(PRESSES[id].scheme).toBe('light')
  for (const id of DARK_PRESS_IDS) expect(PRESSES[id].scheme).toBe('dark')
  expect(LIGHT_PRESS_IDS.length).toBeGreaterThan(0)
  expect(DARK_PRESS_IDS.length).toBeGreaterThan(0)
  expect(PRESS_CHOICES).toEqual(['auto', ...PRESS_IDS])
})

test('every press inks the whole token set, and no two presses are the same run', () => {
  const stocks = new Set<string>()
  for (const id of PRESS_IDS) {
    const p = PRESSES[id]
    for (const [key, value] of Object.entries(p)) {
      expect(value, `${id}.${key}`).not.toBe('')
      expect(value, `${id}.${key}`).not.toBeUndefined()
    }
    // The four macro inks mean one nutrient each and have to stay apart on the stock they print on.
    expect(new Set([p.orange, p.blue, p.teal, p.mustard]).size, `${id} macro inks`).toBe(4)
    stocks.add(p.paper)
  }
  expect(stocks.size, 'two presses on the same stock').toBe(PRESS_IDS.length)
})

test('stored prefs survive a round trip, and anything unreadable falls back per field', () => {
  const prefs = { choice: 'cherry', light: 'meadow', dark: 'blueprint' } as const
  expect(parsePrefs(formatPrefs(prefs))).toEqual(prefs)
  expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
  expect(parsePrefs('')).toEqual(DEFAULT_PREFS)
  expect(parsePrefs('junk|junk|junk')).toEqual(DEFAULT_PREFS)
  // A press retired from one field does not cost the reader the other two.
  expect(parsePrefs('gone|newsprint|blueprint')).toEqual({ choice: 'auto', light: 'newsprint', dark: 'blueprint' })
  // A light press offered for the dark slot is not a dark press: the field falls back rather than printing
  // cream stock whenever the phone goes dark.
  expect(parsePrefs('auto|night|meadow')).toEqual(DEFAULT_PREFS)
})

test('Match phone follows the device and picks the reader\'s press for each side; a named press does not', () => {
  const prefs = { choice: 'auto', light: 'newsprint', dark: 'blueprint' } as const
  expect(resolvePress(prefs, true)).toBe('blueprint')
  expect(resolvePress(prefs, false)).toBe('newsprint')
  expect(resolvePress({ ...prefs, choice: 'meadow' }, true)).toBe('meadow')
  expect(resolvePress({ ...prefs, choice: 'night' }, false)).toBe('night')
})

test('a press writes every token the stylesheet reads, and re-states nothing per press', () => {
  const names = Object.keys(pressVars('day'))
  for (const id of PRESS_IDS) {
    const vars = pressVars(id)
    expect(Object.keys(vars), `${id} token set`).toEqual(names)
    for (const [name, value] of Object.entries(vars)) expect(value, `${id} ${name}`).not.toBe('')
  }
  const day = pressVars('day')
  const night = pressVars('night')
  expect(day['--paper']).toBe(PRESSES.day.paper)
  expect(day['--orange-rgb']).toBe('191 87 0')
  expect(day['--blend']).toBe('multiply')
  expect(night['--blend']).toBe('screen')
  // An alpha plate mixes toward the stock, so on dark stock every plate is lifted or it prints muddy.
  expect(day['--plate-k']).toBe('1')
  expect(night['--plate-k']).toBe('1.7')
  // The sheet's veil is 1 minus the page grain, so the two layers always match.
  expect(day['--veil']).toBe(String(1 - PRESSES.day.grainStrength))
})

// Contrast is measured for real on rendered pixels in e2e/press.spec.ts, with the grain layer composited over
// the text. This is the same rule held at the token, so a bad hex fails `make check` without a browser: the
// grain costs about a third of its opacity as mean speck alpha, which is the excursion the e2e then confirms.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** The stock as the reader sees it: the speck tile laid over it at its own strength. */
function grained(stock: string, p: Press): string {
  const alpha = p.grainStrength * 0.3
  const mix = [1, 3, 5].map((i) => {
    const speck = Number.parseInt(p.speck.slice(i, i + 2), 16)
    const paper = Number.parseInt(stock.slice(i, i + 2), 16)
    return Math.round(speck * alpha + paper * (1 - alpha)).toString(16).padStart(2, '0')
  })
  return `#${mix.join('')}`
}

test('every press prints its text at 4.5:1 and its boundaries at 3:1, over its own grained stock', () => {
  const fails: string[] = []
  const check = (name: string, got: number, min: number): void => {
    if (got < min) fails.push(`${name} ${got.toFixed(2)} < ${String(min)}`)
  }
  for (const id of PRESS_IDS) {
    const p = PRESSES[id]
    for (const stock of ['paper', 'paperRaised', 'paperShade'] as const) {
      const over = grained(p[stock], p)
      for (const text of ['ink', 'inkDeep', 'inkSoft', 'over'] as const) {
        check(`${id} ${text} on ${stock}`, ratio(p[text], over), 4.5)
      }
    }
    // Stock-coloured type on the first drum's plate: primary buttons, the toast, a selected stamp.
    check(`${id} stock on the plate`, ratio(p.paper, p.blue), 4.5)
    // The macro inks and the focus ring are boundaries, not text. Fat is the documented exception: it is the
    // one ink that always carries a first-drum outline, and the outline is what has to clear 3:1.
    for (const ink of ['blue', 'orange', 'teal'] as const) {
      check(`${id} ${ink} on its stock`, ratio(p[ink], grained(p.paper, p)), 3)
    }
    check(`${id} the fat ink's outline`, ratio(p.blue, grained(p.paper, p)), 3)
  }
  expect(fails).toEqual([])
})

// public/theme-boot.js picks the press before the first paint, so it cannot import these constants. It can still
// be held to them: the stock table below is the whole reason the boot script exists.
test('the pre-paint boot script knows the same presses, stocks and storage key', () => {
  const boot = readFileSync(new URL('../public/theme-boot.js', import.meta.url), 'utf8')
  expect(boot).toContain(`'${PRESS_STORAGE_KEY}'`)
  for (const id of PRESS_IDS) {
    expect(boot, `${id} in the boot script`).toContain(`${id}: '${PRESSES[id].paper} ${PRESSES[id].scheme}'`)
  }
  // It ships one line per press and no more: a press deleted here but left there would still boot.
  const table: string = boot.slice(boot.indexOf('var STOCK'), boot.indexOf('var raw'))
  expect(table.match(/'#[0-9A-F]{6} (light|dark)'/g)?.length).toBe(PRESS_IDS.length)
  expect(boot).toContain(`'${DEFAULT_PREFS.light}'`)
  expect(boot).toContain(`'${DEFAULT_PREFS.dark}'`)

  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  expect(html.indexOf('theme-boot.js')).toBeGreaterThan(-1)
  expect(html.indexOf('theme-boot.js')).toBeLessThan(html.indexOf('/src/main.tsx')) // before the bundle, or it is pointless
})

test('a press id is the data-theme attribute the boot script and the app both write', () => {
  const ids: readonly PressId[] = PRESS_IDS
  expect(ids).toContain(resolvePress(DEFAULT_PREFS, false))
  expect(ids).toContain(resolvePress(DEFAULT_PREFS, true))
})
