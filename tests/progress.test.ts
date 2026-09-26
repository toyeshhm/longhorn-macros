import { expect, test } from 'vitest'
import { addDays } from '../src/dates'
import type { LogEntry, ProfileRow, WeightEntry } from '../src/db/types'
import { translator } from '../src/i18n'
import {
  adaptiveStatus as adaptiveStatusIn, ASSUMED_KCAL, assumedCalories, calorieSeries, chartDates, chartGeometry as chartGeometryIn, inRange,
  movingMean, predictedSeries, predictionNote as predictionNoteIn, rangeDays, rangeStart, signed as signedIn,
  summarize as summarizeIn, weightSeries,
  type ChartGeometry, type ChartSeries, type Point, type Summary,
} from '../src/progress'

// English here; the Spanish run of the same figures is in tests/i18n.test.ts.
const t = translator('en')
const predictionNote = (maintenance: number | null, learned = true): string => predictionNoteIn(maintenance, learned, t)
const signed = (lb: number): string => signedIn(lb, t)
const summarize = (a: Omit<Parameters<typeof summarizeIn>[0], 't'>): Summary => summarizeIn({ ...a, t })
const adaptiveStatus = (...a: [ProfileRow | null | undefined, readonly WeightEntry[], readonly LogEntry[], string]): string =>
  adaptiveStatusIn(...a, t)
const chartGeometry = (a: Omit<Parameters<typeof chartGeometryIn>[0], 't'>): ChartGeometry => chartGeometryIn({ ...a, t })

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
  const weights = [weigh(TODAY, 168), weigh('2026-08-15', 180), weigh('2026-09-18', 169)]
  const { weighIns, trend } = weightSeries(weights, TODAY, '30')
  expect(weighIns).toEqual([{ date: '2026-09-18', value: 169 }, { date: TODAY, value: 168 }])
  // The August weigh-in is outside the range but still seeds the EWMA, so the trend arrives at the window edge
  // already carrying it rather than starting over at the first in-range reading: a trend that restarts at the
  // edge of whatever the reader is looking at is not a trend. 34 days of decay leaves it near the new reading
  // without landing on it; one more day moves it a tenth of the way to the next.
  expect(trend.map((p) => p.date)).toEqual(['2026-09-18', TODAY])
  expect(trend[0]?.value).toBeCloseTo(169.31, 2)
  expect(trend[1]?.value).toBeCloseTo(169.18, 2)
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

test('an unlogged finished day after the first log is assumed at 1,500; before the first log and today are not', () => {
  const entries = [entry('2026-09-15', 2000), { ...entry('2026-09-17', 2000), deletedAt: '2026-09-18T00:00:00.000Z' }, entry('2026-09-18', 1800)]
  // 16th and 17th (only a deleted row) are assumed; the 14th is before any log; today is not over.
  expect(assumedCalories(entries, TODAY, '30')).toEqual([
    { date: '2026-09-16', value: ASSUMED_KCAL }, { date: '2026-09-17', value: ASSUMED_KCAL },
  ])
  // A range that starts after the first log clips the fill to the range.
  expect(assumedCalories([entry('2026-06-01', 2000), entry('2026-09-18', 2000)], TODAY, '30')[0]?.date).toBe(addDays(TODAY, -29))
  expect(assumedCalories([], TODAY, '30')).toEqual([])
})

test('summary averages over logged and assumed days but counts only the logged ones', () => {
  const s = summarize({ trend: [], calories: [{ date: '2026-09-17', value: 2100 }], assumed: [{ date: '2026-09-18', value: 1500 }], range: '30' })
  expect(s).toMatchObject({ avgCalories: 1800, daysLogged: 1 })
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
    // Nothing logged on the 18th: it counts as the assumed 1,500, 900 under maintenance.
    { date: '2026-09-18', value: 170 + 2850 / 3500 - 900 / 3500 },
    { date: TODAY, value: 170 + 2850 / 3500 - 900 / 3500 - 1500 / 3500 },
  ])
})

test('before the first log there is nothing to assume, so the prediction holds flat until it', () => {
  const { weighIns } = weightSeries([weigh('2026-09-15', 170)], TODAY, '30')
  expect(predictedSeries({ weighIns, entries: [entry('2026-09-17', 2400), entry('2026-09-18', 2400)], maintenance: 2400, today: TODAY, range: '30' }))
    .toEqual([
      { date: '2026-09-15', value: 170 },
      { date: '2026-09-16', value: 170 }, // no log yet: carried, not assumed
      { date: '2026-09-17', value: 170 },
      { date: '2026-09-18', value: 170 },
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
  expect(predictionNote(2400)).toContain('Days you did not log count as 1,500 kcal')
  // A learned estimate and a formula guess are not the same claim, and the note is the only place that says which.
  expect(predictionNote(2400, false)).toContain('at an estimated 2,400 kcal a day of maintenance')
  expect(predictionNote(2400, false)).toContain('rather than learned from your own data')
  expect(predictionNote(2400, true)).not.toContain('estimated')
  expect(predictionNote(null)).toBe('No maintenance estimate yet, so there is nothing to predict from. Set up your goals first.')
})

// -------------------------------------------------------------------------------------------------- summary

test('summary reads the trend, its change over the days it actually spans, and the logged-day average', () => {
  const trend: Point[] = [{ date: '2026-09-01', value: 172.44 }, { date: TODAY, value: 170.02 }]
  const calories: Point[] = [{ date: '2026-09-01', value: 2000 }, { date: TODAY, value: 2500 }]
  expect(summarize({ trend, calories, assumed: [], range: '30' })).toEqual({
    trendWeight: 170, changeLb: -2.4, spanDays: 18, changeLabel: 'Change over 18 days (smoothed)',
    avgCalories: 2250, daysLogged: 2, rangeDays: 30,
  })
})

test('summary with nothing at all reports nulls, not zeros', () => {
  expect(summarize({ trend: [], calories: [], assumed: [], range: 'all' })).toEqual({
    trendWeight: null, changeLb: null, spanDays: 0, changeLabel: 'Change (smoothed)', avgCalories: null, daysLogged: 0, rangeDays: null,
  })
})

test('summary with a single weigh-in has a weight but no change to speak of', () => {
  const one = summarize({ trend: [{ date: TODAY, value: 170 }], calories: [], assumed: [], range: '30' })
  expect(one).toMatchObject({ trendWeight: 170, changeLb: 0, spanDays: 0, changeLabel: 'Change (smoothed)' })
  const twoDays = summarize({ trend: [{ date: '2026-09-18', value: 170 }, { date: TODAY, value: 170.5 }], calories: [], assumed: [], range: '30' })
  expect(twoDays.changeLabel).toBe('Change over a day (smoothed)')
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
  expect(small.xLabels).toHaveLength(4)
  expect(small.yTicks).toHaveLength(4)
  expect(large.xLabels.length).toBeLessThan(small.xLabels.length)
  expect(large.yTicks).toHaveLength(2)
  // Boxes, not centres. The first label is start-anchored at x0 and the last end-anchored at x1, so each of those
  // takes a whole label width inside the frame rather than half; budgeting as though every label were centred left
  // the final gap at about a quarter of the others and the last two dates read as one run ("9/17 9/20").
  for (const [g, font] of [[small, 15], [large, 32]] as const) {
    const boxes = g.xLabels.map((l) => {
      const w = l.label.length * 0.6 * font
      const left = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2
      return { left, right: left + w }
    })
    expect(boxes[0]?.left).toBeGreaterThanOrEqual(g.frame.x0)
    expect(boxes[boxes.length - 1]?.right).toBeLessThanOrEqual(g.frame.x1 + 0.1)
    boxes.forEach((box, i) => {
      const next = boxes[i + 1]
      if (next !== undefined) expect(next.left - box.right).toBeGreaterThanOrEqual(0.6 * font)
    })
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
