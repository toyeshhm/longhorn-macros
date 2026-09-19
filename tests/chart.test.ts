import { expect, test } from 'vitest'
import { chartGeometry, weeklyStats } from '../src/chart'
import type { LogEntry } from '../src/db/types'
import { addDays } from '../src/dates'

test('empty series → empty strings, no ticks or labels', () => {
  expect(chartGeometry([], [], 100, 60, 10)).toEqual({ points: '', trend: '', yTicks: [], xLabels: [] })
})

test('single point is centered; y-range is value ± 1 lb', () => {
  const p = [{ date: '2026-09-18', weightLb: 170 }]
  expect(chartGeometry(p, p, 100, 60, 10)).toEqual({
    points: '50,30',
    trend: '50,30',
    yTicks: [{ y: 50, label: '169' }, { y: 36.7, label: '169.7' }, { y: 23.3, label: '170.3' }, { y: 10, label: '171' }],
    xLabels: [{ x: 50, label: 'Sep 18' }],
  })
})

test('multi point: x by date, y over min/max of raw ∪ trend ± 1, 4 ticks bottom→top', () => {
  const raw = [{ date: '2026-09-03', weightLb: 172 }, { date: '2026-09-01', weightLb: 170 }]
  const trend = [{ date: '2026-09-01', weightLb: 170 }, { date: '2026-09-03', weightLb: 170.2 }]
  expect(chartGeometry(raw, trend, 100, 60, 10)).toEqual({
    points: '10,40 90,20', // sorted by date
    trend: '10,40 90,38',
    yTicks: [{ y: 50, label: '169' }, { y: 36.7, label: '170.3' }, { y: 23.3, label: '171.7' }, { y: 10, label: '173' }],
    xLabels: [{ x: 10, label: 'Sep 1' }, { x: 50, label: 'Sep 2' }, { x: 90, label: 'Sep 3' }],
  })
})

test('long spans get at most 5 evenly spaced date labels spanning first → last', () => {
  const raw = [{ date: '2026-08-20', weightLb: 170 }, { date: '2026-09-19', weightLb: 168 }]
  const g = chartGeometry(raw, raw, 100, 60, 10)
  expect(g.xLabels.map((l) => l.label)).toEqual(['Aug 20', 'Aug 28', 'Sep 4', 'Sep 12', 'Sep 19'])
  expect(g.xLabels[0]?.x).toBe(10)
  expect(g.xLabels[4]?.x).toBe(90)
})

function entry(id: string, date: string, servings: number, calories: number, protein: number, deletedAt: string | null = null): LogEntry {
  return {
    id, date, meal: 'lunch', hall: null, station: null, name: id, recipeNumber: null, customFoodId: null, portion: '1 serving',
    servings, updatedAt: '2026-09-18T12:00:00.000Z', deletedAt,
    perServing: { calories, protein, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  }
}

test('weeklyStats averages the trailing 7 days (incl. today) over logged days only', () => {
  const today = '2026-09-18'
  const entries = [
    entry('a', today, 2, 300, 10), // 600 kcal, 20 g
    entry('b', addDays(today, -6), 1, 500, 10), // oldest day in window
    entry('c', addDays(today, -6), 1, 100, 0), // same day → still one logged day
    entry('old', addDays(today, -7), 1, 9999, 99),
    entry('future', addDays(today, 1), 1, 9999, 99),
    entry('gone', today, 1, 9999, 99, '2026-09-18T13:00:00.000Z'),
  ]
  expect(weeklyStats(entries, today)).toEqual({ avgCalories: 600, avgProtein: 15, daysLogged: 2 })
})

test('weeklyStats with nothing logged → null averages', () => {
  expect(weeklyStats([], '2026-09-18')).toEqual({ avgCalories: null, avgProtein: null, daysLogged: 0 })
})
