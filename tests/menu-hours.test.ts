import { describe, expect, test } from 'vitest'
import {
  dayIndex, dayText, formatTime, hallStatus, parseDay, parseHours, statusText, UNKNOWN_HOURS,
  type Week,
} from '../src/menu/hours'

const body = (halls: string): string =>
  `const diningHours = {"Fall 2026 Semester (08/24/26 - 12/15/26)": {\n"Dining Halls": {${halls}},\n"Restaurants": {}}};`

// Monday-first, as published: index 5 is Saturday.
const WEEKDAYS = '"7:00am-10:00pm","7:00am-10:00pm","7:00am-10:00pm","7:00am-10:00pm","7:00am-9:00pm"'
const J2 = `"J2 Dining":[${WEEKDAYS},"9:00am-2:00pm|4:30pm-9:00pm","9:00am-2:00pm|4:30pm-10:00pm"]`

const at = (day: number, hour: number, minute = 0): Date => new Date(2026, 8, 14 + day, hour, minute) // 2026-09-14 is a Monday
const week = (...days: string[]): Week => days.map(parseDay)

describe('parseDay', () => {
  test('a single window', () => { expect(parseDay('7:00am-10:00pm')).toEqual([{ open: 420, close: 1320 }]) })
  test('a split window', () => {
    expect(parseDay('9:00am-2:00pm|4:30pm-9:00pm')).toEqual([{ open: 540, close: 840 }, { open: 990, close: 1260 }])
  })
  test('Closed, in any case, with spaces', () => {
    expect(parseDay('Closed')).toEqual([])
    expect(parseDay('  closed ')).toEqual([])
  })
  test('Midnight and Noon as boundaries; a close at or before the open runs into the next day', () => {
    expect(parseDay('4:00pm-Midnight')).toEqual([{ open: 960, close: 1440 }])
    expect(parseDay('9:00pm-1:00am')).toEqual([{ open: 1260, close: 1500 }])
    expect(parseDay('Noon-11:00pm')).toEqual([{ open: 720, close: 1380 }])
  })
  test('garbage is unknown, not a crash', () => {
    expect(parseDay('sometimes')).toBeNull()
    expect(parseDay('7:00am-')).toBeNull()
    expect(parseDay('25:00am-3:00pm')).toBeNull()
    expect(parseDay('7:70am-3:00pm')).toBeNull()
    expect(parseDay('7:00-3:00pm')).toBeNull()
    expect(parseDay('9:00am-2:00pm|nope')).toBeNull()
  })
})

describe('parseHours', () => {
  test('strips the assignment and maps the three dining halls, JCL by its published name', () => {
    const hours = parseHours(body(`${J2},"Jester City Limits":["Closed","Closed","Closed","Closed","Closed","Closed","Closed"],"Kins Dining":[]`), '2026-09-19')
    expect(hours.J2[5]).toEqual([{ open: 540, close: 840 }, { open: 990, close: 1260 }]) // Saturday, verified against the feed
    expect(hours.JCL[0]).toEqual([])
    expect(dayText(hours.Kins[0] ?? null)).toBe('Unknown') // a week the feed did not fill in reads as unknown
  })

  test('a hall that is missing, or whose days are not strings, is unknown rather than an error', () => {
    const hours = parseHours(body('"J2 Dining":[1,2,3,4,5,6,7]'), '2026-09-19')
    expect(hours.J2).toEqual(UNKNOWN_HOURS.J2)
    expect(hours.JCL).toEqual(UNKNOWN_HOURS.JCL)
  })

  test('picks the semester whose label range contains today, else the first one', () => {
    const two = 'const diningHours = {'
      + '"Summer 2026 (05/01/26 - 08/01/26)": {"Dining Halls": {"J2 Dining":["Closed","Closed","Closed","Closed","Closed","Closed","Closed"]}},'
      + `"Fall 2026 Semester (08/24/26 - 12/15/26)": {"Dining Halls": {${J2}}}};`
    expect(parseHours(two, '2026-09-19').J2[0]).toEqual([{ open: 420, close: 1320 }])
    expect(parseHours(two, '2026-06-01').J2[0]).toEqual([])
    expect(parseHours(two, '2027-01-04').J2[0]).toEqual([]) // outside every range: the first block
  })

  test('a semester label with no date range falls through to the first block', () => {
    expect(parseHours(`const diningHours = {"Whenever": {"Dining Halls": {${J2}}}};`, '2026-09-19').J2[0])
      .toEqual([{ open: 420, close: 1320 }])
  })

  test('an empty feed, a non-object body and a missing group are all unknown', () => {
    expect(parseHours('const diningHours = {};', '2026-09-19')).toEqual(UNKNOWN_HOURS)
    expect(parseHours('const diningHours = {"Fall (08/24/26 - 12/15/26)": 5};', '2026-09-19')).toEqual(UNKNOWN_HOURS)
    expect(parseHours('const diningHours = {"Fall (08/24/26 - 12/15/26)": {"Restaurants": {}}};', '2026-09-19')).toEqual(UNKNOWN_HOURS)
  })

  test('a body that is not the expected assignment throws, so the cache can be used instead', () => {
    expect(() => parseHours('404 Not Found', '2026-09-19')).toThrow(/no assignment/)
    expect(() => parseHours('const diningHours = {nope};', '2026-09-19')).toThrow()
    expect(() => parseHours('const diningHours = [1, 2];', '2026-09-19')).toThrow(/root/)
  })
})

describe('dayIndex', () => {
  test('is Monday-first, matching the feed order', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((d) => dayIndex(at(d, 12)))).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(dayIndex(new Date(2026, 8, 20, 12))).toBe(6) // a Sunday
  })
})

describe('formatTime', () => {
  test('12-hour clock, with Midnight named', () => {
    expect(formatTime(0)).toBe('Midnight')
    expect(formatTime(1440)).toBe('Midnight')
    expect(formatTime(420)).toBe('7:00am')
    expect(formatTime(720)).toBe('12:00pm')
    expect(formatTime(840)).toBe('2:00pm')
    expect(formatTime(990)).toBe('4:30pm')
    expect(formatTime(75)).toBe('1:15am')
  })
})

describe('hallStatus / statusText', () => {
  const split = week('9:00am-2:00pm|4:30pm-9:00pm', 'Closed', '7:00am-10:00pm', 'nonsense', '9:00pm-1:00am', 'Closed', '8:00am-11:00am')

  test('open, with the reopen time when the day is split', () => {
    expect(statusText(hallStatus(split, at(0, 12)))).toBe('Open until 2:00pm · reopens 4:30pm')
  })
  test('open in the last window of the day says nothing about reopening', () => {
    expect(statusText(hallStatus(split, at(0, 18)))).toBe('Open until 9:00pm')
  })
  test('between two windows', () => {
    expect(statusText(hallStatus(split, at(0, 15)))).toBe('Closed · opens 4:30pm')
  })
  test('before the first window', () => {
    expect(statusText(hallStatus(split, at(0, 7)))).toBe('Closed · opens 9:00am')
  })
  test('a day with no service', () => {
    expect(statusText(hallStatus(split, at(1, 12)))).toBe('Closed today')
  })
  test('a day the feed wrote in a way we cannot read', () => {
    expect(statusText(hallStatus(split, at(3, 12)))).toBe('Hours unavailable')
  })
  test('after the last window, the next opening is named as tomorrow', () => {
    expect(statusText(hallStatus(split, at(6, 12)))).toBe('Closed · opens 9:00am tomorrow') // Sunday, done at 11am
  })
  test('after the last window, a tomorrow that is closed or unreadable just says closed', () => {
    expect(statusText(hallStatus(split, at(0, 22)))).toBe('Closed') // Tuesday is Closed
    expect(statusText(hallStatus(split, at(2, 23)))).toBe('Closed') // Thursday is unreadable
  })
  test("a window that runs past midnight keeps the hall open into the next calendar day", () => {
    expect(statusText(hallStatus(split, at(5, 0, 30)))).toBe('Open until 1:00am') // Friday 9pm-1am, seen on Saturday
    expect(statusText(hallStatus(split, at(5, 2)))).toBe('Closed today') // the window has ended; Saturday is closed
  })
  test('a week the feed did not give us at all', () => {
    expect(statusText(hallStatus([], at(0, 12)))).toBe('Hours unavailable')
    expect(statusText(hallStatus(UNKNOWN_HOURS.J2, at(0, 12)))).toBe('Hours unavailable')
  })
})

describe('dayText', () => {
  test('writes the windows out, and names Closed and Unknown', () => {
    expect(dayText(parseDay('9:00am-2:00pm|4:30pm-9:00pm'))).toBe('9:00am–2:00pm, 4:30pm–9:00pm')
    expect(dayText(parseDay('4:00pm-Midnight'))).toBe('4:00pm–Midnight')
    expect(dayText([])).toBe('Closed')
    expect(dayText(null)).toBe('Unknown')
  })
})
