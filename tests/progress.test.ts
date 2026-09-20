import { expect, test } from 'vitest'
import { addDays } from '../src/dates'
import type { LogEntry, ProfileRow, WeightEntry } from '../src/db/types'
import {
  adaptiveStatus, calorieSeries, chartDates, chartGeometry, inRange, movingMean, predictedSeries, predictionNote,
  rangeDays, rangeStart, signed, summarize, weightSeries, type ChartSeries, type Point,
} from '../src/progress'

const TODAY = '2026-09-19'

function weigh(date: string, weightLb: number): WeightEntry {
  return { id: date, date, weightLb, updatedAt: '2026-09-19T12:00:00.000Z', deletedAt: null }
}

function entry(date: string, calories: number, servings = 1): LogEntry {
  return {
    id: `${date}-${String(calories)}`, date, meal: 'lunch', hall: null, station: null, name: 'food',
    recipeNumber: null, customFoodId: null, portion: '1 serving', servings,
    updatedAt: '2026-09-19T12:00:00.000Z', deletedAt: null,
    perServing: { calories, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  }
}

const profile = (over: Partial<ProfileRow>): ProfileRow => ({
  id: 'u', updatedAt: '', deletedAt: null, sex: 'male', birthYear: 2005, heightIn: 70, activity: 'moderate',
  goal: 'cut', rateLbPerWeek: 1, override: null, adaptiveEnabled: false, tdeeEstimate: null, tdeeUpdatedOn: null,
  tdeePrevious: null, ...over,
})

// --------------------------------------------------------------------------------------------------- ranges

test('a range covers its own number of days, today included; all has no start', () => {
  expect(rangeDays('30')).toBe(30)
  expect(rangeDays('all')).toBeNull()
  expect(rangeStart(TODAY, '30')).toBe('2026-08-21')
  expect(rangeStart(TODAY, '90')).toBe('2026-06-22')
  expect(rangeStart(TODAY, 'all')).toBeNull()
})

test('in range: today is in, the first covered day is in, the day before it is out, and the future is never in', () => {
  expect(inRange(TODAY, TODAY, '30')).toBe(true)
  expect(inRange('2026-08-21', TODAY, '30')).toBe(true)
  expect(inRange('2026-08-20', TODAY, '30')).toBe(false)
  expect(inRange('2026-08-20', TODAY, 'all')).toBe(true)
  expect(inRange(addDays(TODAY, 1), TODAY, 'all')).toBe(false)
})

test('a range longer than the data holds all of it', () => {
  const weights = [weigh('2026-09-18', 170), weigh(TODAY, 171)]
  expect(weightSeries(weights, TODAY, '90').weighIns).toHaveLength(2)
  expect(weightSeries(weights, TODAY, 'all').weighIns).toHaveLength(2)
})

// --------------------------------------------------------------------------------------------------- series

test('weight series sorts the weigh-ins and windows a trend that was warmed up over the whole history', () => {
  const weights = [weigh(TODAY, 168), weigh('2026-07-01', 180), weigh('2026-09-18', 169)]
  const { weighIns, trend } = weightSeries(weights, TODAY, '30')
  expect(weighIns).toEqual([{ date: '2026-09-18', value: 169 }, { date: TODAY, value: 168 }])
  // The July weigh-in is outside the range but still seeds the EWMA: the trend arrives at 180 − 1.1 = 178.9,
  // not at the first in-range reading. A trend that restarts at the window edge is not a trend.
  expect(trend).toEqual([{ date: '2026-09-18', value: 178.9 }, { date: TODAY, value: 177.81 }])
})

test('no weigh-ins at all gives empty series rather than a chart of nothing', () => {
  expect(weightSeries([], TODAY, '30')).toEqual({ weighIns: [], trend: [] })
})

test('calorie series is one point per logged day in range, servings applied, gaps simply absent', () => {
  const entries = [
    entry(TODAY, 300, 2), entry(TODAY, 100), // two rows, one day: 700
    entry('2026-09-17', 500), // a gap on the 18th: no point, not a zero
    entry('2026-08-01', 900), // out of a 30 day range
  ]
  expect(calorieSeries(entries, TODAY, '30')).toEqual([{ date: '2026-09-17', value: 500 }, { date: TODAY, value: 700 }])
  expect(calorieSeries(entries, TODAY, 'all')).toHaveLength(3)
  expect(calorieSeries([], TODAY, '30')).toEqual([])
})

test('the moving mean averages the days that exist in its window, never dividing by days that do not', () => {
  const points: Point[] = [{ date: '2026-09-13', value: 2000 }, { date: '2026-09-17', value: 3000 }, { date: TODAY, value: 1000 }]
  expect(movingMean(points, 7)).toEqual([
    { date: '2026-09-13', value: 2000 }, // nothing before it
    { date: '2026-09-17', value: 2500 }, // both days in the window, not 5000/7
    { date: TODAY, value: 2000 }, // the 13th has fallen out: (3000 + 1000) / 2
  ])
})

// ----------------------------------------------------------------------------------------------- prediction

test('prediction starts at the first weigh-in in range and adds each later day of intake over maintenance', () => {
  const { weighIns } = weightSeries([weigh('2026-09-16', 170), weigh(TODAY, 171)], TODAY, '30')
  const entries = [
    entry('2026-09-15', 4000), // before the anchor: not counted
    entry('2026-09-16', 4000), // the anchor's own day: a weigh-in comes before the day is eaten
    entry('2026-09-17', 5250), // +2850 over maintenance → +0.814...
    entry(TODAY, 900), // −1500 under → −0.428...
  ]
  expect(predictedSeries({ weighIns, entries, maintenance: 2400, today: TODAY, range: '30' })).toEqual([
    { date: '2026-09-16', value: 170 },
    { date: '2026-09-17', value: 170 + 2850 / 3500 },
    { date: TODAY, value: 170 + 2850 / 3500 - 1500 / 3500 },
  ])
})

test('prediction with no weigh-ins is empty, and with one weigh-in and nothing logged is just that point', () => {
  expect(predictedSeries({ weighIns: [], entries: [entry(TODAY, 2000)], maintenance: 2400, today: TODAY, range: '30' })).toEqual([])
  const { weighIns } = weightSeries([weigh(TODAY, 170)], TODAY, '30')
  expect(predictedSeries({ weighIns, entries: [], maintenance: 2400, today: TODAY, range: '30' })).toEqual([{ date: TODAY, value: 170 }])
})

test('the prediction always says what it assumed, and says so plainly when it cannot assume anything', () => {
  expect(predictionNote(2400)).toContain('2,400 kcal a day of maintenance')
  expect(predictionNote(2400)).toContain('3,500 kcal to the pound')
  expect(predictionNote(2400)).toContain('Days you did not log are skipped')
  expect(predictionNote(null)).toBe('No maintenance estimate yet, so there is nothing to predict from. Set up your goals first.')
})

// -------------------------------------------------------------------------------------------------- summary

test('summary reads the trend, its change over the days it actually spans, and the logged-day average', () => {
  const trend: Point[] = [{ date: '2026-09-01', value: 172.44 }, { date: TODAY, value: 170.02 }]
  const calories: Point[] = [{ date: '2026-09-01', value: 2000 }, { date: TODAY, value: 2500 }]
  expect(summarize({ trend, calories, range: '30' })).toEqual({
    trendWeight: 170, changeLb: -2.4, spanDays: 18, changeLabel: 'Change over 18 days',
    avgCalories: 2250, daysLogged: 2, rangeDays: 30,
  })
})

test('summary with nothing at all reports nulls, not zeros', () => {
  expect(summarize({ trend: [], calories: [], range: 'all' })).toEqual({
    trendWeight: null, changeLb: null, spanDays: 0, changeLabel: 'Change', avgCalories: null, daysLogged: 0, rangeDays: null,
  })
})

test('summary with a single weigh-in has a weight but no change to speak of', () => {
  const one = summarize({ trend: [{ date: TODAY, value: 170 }], calories: [], range: '30' })
  expect(one).toMatchObject({ trendWeight: 170, changeLb: 0, spanDays: 0, changeLabel: 'Change' })
  const twoDays = summarize({ trend: [{ date: '2026-09-18', value: 170 }, { date: TODAY, value: 170.5 }], calories: [], range: '30' })
  expect(twoDays.changeLabel).toBe('Change over a day')
})

test('a gain never prints as a loss', () => {
  expect(signed(1.3)).toBe('+1.3')
  expect(signed(-2.4)).toBe('-2.4')
  expect(signed(0)).toBe('0')
})

// ------------------------------------------------------------------------------------------ adaptive status

const window21 = Array.from({ length: 21 }, (_, i) => addDays('2026-08-30', i)) // 2026-08-30 … 2026-09-19

test('adaptive status prints the estimate once there is one', () => {
  const status = adaptiveStatus(profile({ tdeeEstimate: 2480, tdeeUpdatedOn: '2026-09-14' }), [], [], TODAY)
  expect(status).toMatch(/^Maintenance estimate: 2,480 kcal \(updated .+\)$/)
})

test('adaptive status counts what is still missing, and names a single weigh-in in the singular', () => {
  expect(adaptiveStatus(null, [], [], TODAY)).toBe('Needs ~14 more logged days and 8 weigh-ins')
  const sevenWeighIns = window21.slice(0, 7).map((d) => weigh(d, 170))
  const twoDays = window21.slice(0, 2).map((d) => entry(d, 2000))
  expect(adaptiveStatus(undefined, sevenWeighIns, twoDays, TODAY)).toBe('Needs ~12 more logged days and 1 weigh-in')
})

test('adaptive status, once there is enough data, says whether the estimate will actually update', () => {
  const weights = window21.map((d, i) => weigh(d, 172 - 0.1 * i))
  const entries = window21.map((d) => entry(d, 2400))
  expect(adaptiveStatus(profile({}), weights, entries, TODAY)).toBe('Enough data. Turn on adaptive TDEE in Goals to learn your maintenance.')
  expect(adaptiveStatus(profile({ adaptiveEnabled: true }), weights, entries, TODAY))
    .toBe('Enough data. Your maintenance estimate updates next time you open the app.')
})

// ------------------------------------------------------------------------------------------ chart geometry

const dots = (points: readonly Point[]): ChartSeries => ({ id: 'a', label: 'A', mark: 'dots', points })
// The real screen prints weights to a tenth; a formatter that never rounds would make every label 18 chars wide.
const oneDp = (v: number): string => String(Math.round(v * 10) / 10)
const geo = (series: readonly ChartSeries[], width: number, height: number, font: number) =>
  chartGeometry({ series, width, height, font, yPad: 1, format: oneDp })

test('an empty chart has no marks, no ticks and no labels, only a frame to draw nothing in', () => {
  expect(geo([dots([])], 100, 60, 10)).toEqual({ plots: [], yTicks: [], xLabels: [], frame: { x0: 10, y0: 7, x1: 94, y1: 41 } })
})

test('a single point sits in the middle of the frame, its scale is the value ± the padding', () => {
  const g = geo([dots([{ date: '2026-09-18', value: 170 }])], 100, 60, 10)
  expect(g.frame).toEqual({ x0: 28, y0: 7, x1: 94, y1: 41 }) // left pad = the widest y label ("169") + a gutter
  expect(g.plots).toEqual([{ id: 'a', label: 'A', mark: 'dots', xy: [[61, 24]] }])
  expect(g.yTicks).toEqual([{ y: 41, label: '169' }, { y: 7, label: '171' }])
  expect(g.xLabels).toEqual([{ x: 61, y: 54.5, label: '9/18', anchor: 'middle' }])
})

test('x is linear in calendar days across every series, y spans all of them together', () => {
  const g = chartGeometry({
    series: [
      // Neither series is given in date order: the extents of the chart are found, not assumed from the first row.
      dots([{ date: '2026-09-03', value: 172 }, { date: '2026-09-01', value: 170 }]),
      { id: 'b', label: 'B', mark: 'trend', points: [{ date: '2026-09-03', value: 170.2 }, { date: '2026-09-01', value: 170 }] },
    ],
    width: 400, height: 200, font: 10, yPad: 1, format: oneDp,
  })
  const [a, b] = g.plots
  expect(a?.xy).toEqual([[40, 137.5], [394, 50.5]])
  expect(b?.xy).toEqual([[40, 137.5], [394, 128.8]]) // sorted by date, whatever order it came in
  expect(g.yTicks.map((t) => t.label)).toEqual(['169', '170.3', '171.7', '173'])
})

test('date labels are anchored so the first and last cannot hang off the ends of the chart', () => {
  const week = Array.from({ length: 5 }, (_, i) => ({ date: addDays('2026-09-01', i), value: 170 + i }))
  const g = geo([dots(week)], 400, 200, 10)
  expect(g.xLabels.map((l) => l.label)).toEqual(['9/1', '9/2', '9/3', '9/4', '9/5'])
  expect(g.xLabels.map((l) => l.anchor)).toEqual(['start', 'middle', 'middle', 'middle', 'end'])
})

test('bigger text means fewer labels and fewer gridlines, never labels printed over each other', () => {
  const month = Array.from({ length: 30 }, (_, i) => ({ date: addDays('2026-09-01', i), value: 170 + i * 0.1 }))
  const small = geo([dots(month)], 340, 220, 15)
  const large = geo([dots(month)], 340, 220, 32) // the reader's text at 200%
  expect(small.xLabels).toHaveLength(5)
  expect(small.yTicks).toHaveLength(4)
  expect(large.xLabels.length).toBeLessThan(small.xLabels.length)
  expect(large.yTicks).toHaveLength(2)
  // Whatever the size, the labels fit between the axis and the right edge without overlapping.
  for (const g of [small, large]) {
    const gap = (g.xLabels[1]?.x ?? g.frame.x1) - (g.xLabels[0]?.x ?? 0)
    expect(gap).toBeGreaterThan(5 * 0.6 * (g === small ? 15 : 32))
    expect(g.xLabels[g.xLabels.length - 1]?.x).toBeLessThanOrEqual(g.frame.x1)
  }
})

test('the text alternative has a row for every date any series has a point on', () => {
  const series: ChartSeries[] = [
    dots([{ date: '2026-09-03', value: 1 }, { date: '2026-09-01', value: 2 }]),
    { id: 'b', label: 'B', mark: 'predicted', points: [{ date: '2026-09-02', value: 3 }, { date: '2026-09-03', value: 4 }] },
  ]
  expect(chartDates(series)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
  expect(chartDates([])).toEqual([])
})
