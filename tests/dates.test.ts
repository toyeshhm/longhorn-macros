import { expect, test } from 'vitest'
import { addDays, daysBetween, feedDateToKey, localDateKey } from '../src/dates'
test('localDateKey uses local calendar date', () => { expect(localDateKey(new Date(2026, 8, 18, 23, 59))).toBe('2026-09-18') })
test('addDays crosses month/year and DST boundaries', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  expect(addDays('2026-03-08', -1)).toBe('2026-03-07')
})
test('daysBetween', () => { expect(daysBetween('2026-09-01', '2026-09-22')).toBe(21); expect(daysBetween('2026-09-22', '2026-09-01')).toBe(-21) })
test('feedDateToKey', () => {
  expect(feedDateToKey('09/18/2026')).toBe('2026-09-18')
  expect(() => feedDateToKey('2026-09-18')).toThrow(/feed date/)
})
test('addDays rejects malformed key', () => { expect(() => addDays('nope', 1)).toThrow(/date key/) })
