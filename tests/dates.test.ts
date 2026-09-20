import { expect, test } from 'vitest'
import { addDays, dateLabel as dateLabelIn, daysBetween, feedDateToKey, localDateKey } from '../src/dates'
import { translator } from '../src/i18n'

// The English chip; the Spanish one (19/9 sáb) is asserted in tests/i18n.test.ts.
const dateLabel = (key: string): { date: string; weekday: string; full: string } => dateLabelIn(key, translator('en'))
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
test('dateLabel prints the date and weekday separately, and speaks both before the full date', () => {
  expect(dateLabel('2026-09-19')).toEqual({ date: '9/19', weekday: 'Sat', full: '9/19 Sat, Saturday, September 19' })
  expect(dateLabel('2027-01-01').full).toBe('1/1 Fri, Friday, January 1')
})
test('the spoken name of a day chip starts with what the chip prints (WCAG 2.5.3)', () => {
  for (const key of ['2026-09-19', '2026-12-31', '2027-03-01']) {
    const { date, weekday, full } = dateLabel(key)
    expect(full.startsWith(`${date} ${weekday}`)).toBe(true)
  }
})
