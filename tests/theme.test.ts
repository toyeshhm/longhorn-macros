import { expect, test } from 'vitest'
import { isThemeChoice, resolveTheme, THEME_CHOICES, THEME_COLOR } from '../src/theme'

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
