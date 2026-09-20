import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { isThemeChoice, resolveTheme, THEME_CHOICES, THEME_COLOR, THEME_STORAGE_KEY } from '../src/theme'

test('only the three published choices are accepted from storage', () => {
  for (const c of THEME_CHOICES) expect(isThemeChoice(c)).toBe(true)
  for (const junk of [null, '', 'dark', 42, undefined]) expect(isThemeChoice(junk)).toBe(false)
})

test('Match phone follows the device; the other two do not', () => {
  expect(resolveTheme('auto', true)).toBe('night')
  expect(resolveTheme('auto', false)).toBe('light')
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('night', false)).toBe('night')
})

test('each press names the stock it is printed on for the browser chrome', () => {
  expect(THEME_COLOR).toEqual({ light: '#F7F3EA', night: '#141A33' })
})

// public/theme-boot.js picks the press before the first paint, so it cannot import these constants. It can still
// be held to them: the numbers below are the whole reason the boot script exists.
test('the pre-paint boot script uses the same storage key and the same two stocks', () => {
  const boot = readFileSync(new URL('../public/theme-boot.js', import.meta.url), 'utf8')
  expect(boot).toContain(`'${THEME_STORAGE_KEY}'`)
  expect(boot).toContain(THEME_COLOR.night)
  expect(boot).toContain(THEME_COLOR.light)
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  expect(html.indexOf('theme-boot.js')).toBeGreaterThan(-1)
  expect(html.indexOf('theme-boot.js')).toBeLessThan(html.indexOf('/src/main.tsx')) // before the bundle, or it is pointless
})
