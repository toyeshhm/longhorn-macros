import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { maintenance } from '../../goals'
import { log } from '../../log'
import { round1 } from '../../nutrition'
import {
  adaptiveStatus, calorieSeries, movingMean, MEAN_DAYS, predictedSeries, predictionNote,
  signed, summarize, weightSeries, type ChartSeries, type Range,
} from '../../progress'
import { useApp } from '../context'
import { n } from '../format'
import { useLatestWeight, useLive, useProfile } from '../hooks'
import { ScaleDoodle } from '../icons/Doodles'
import { Chips } from '../menu/MenuScreen'
import { InkChart } from './InkChart'

const RANGES = [{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'all', label: 'All' }] as const
const VIEWS = [
  { value: 'weight', label: 'Weight' },
  { value: 'calories', label: 'Daily calories' },
  { value: 'predicted', label: 'Predicted vs actual' },
] as const
type View = (typeof VIEWS)[number]['value']
// The chart's own title is spelled out where the control is not: "Predicted vs actual" names a switch, and
// "Predicted and actual weight, the last 30 days" is what a screen reader should hear the picture called.
const VIEW_TITLES: Readonly<Record<View, string>> = { weight: 'Weight', calories: 'Daily calories', predicted: 'Predicted and actual weight' }
const RANGE_WORDS: Readonly<Record<Range, string>> = { '30': 'the last 30 days', '90': 'the last 90 days', 'all': 'all time' }
const MIN_LB = 50
const MAX_LB = 700
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const lb = (v: number): string => String(round1(v))

// The message is shown at the field it is about (aria-describedby), not as one message at the foot of the form.
interface Invalid { field: 'weight' | 'date' | 'form'; message: string }

function Stat({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div class="stat">
      <span class="stat-label">{label}</span>
      <span class="stat-value">{value === null ? '—' : <>{value}<small> {unit}</small></>}</span>
    </div>
  )
}

export function ProgressScreen() {
  const { store } = useApp()
  const today = localDateKey(new Date())
  // ponytail: loads every weight and log row; fine for one person's history, index by date if it ever gets slow.
  const weights = useLive(() => store.all('weights'), [])
  const allLog = useLive(() => store.all('food_log'), [])
  const profile = useProfile()
  const latest = useLatestWeight()
  const [view, setView] = useState<View>('weight')
  const [range, setRange] = useState<Range>('30')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<Invalid | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (): Promise<void> => {
    const value = Number(weight.trim())
    if (weight.trim() === '' || !Number.isFinite(value) || value < MIN_LB || value > MAX_LB) {
      setError({ field: 'weight', message: `Weight must be between ${String(MIN_LB)} and ${String(MAX_LB)} lb.` })
      return
    }
    if (!DATE_KEY.test(date) || date > today) { setError({ field: 'date', message: 'Pick a date on or before today.' }); return }
    setBusy(true)
    setError(null)
    try {
      // One row per date (unique user,date): reuse that date's id so the upsert replaces it.
      const existing = await store.weightForDate(date)
      await store.put('weights', { id: existing?.id ?? crypto.randomUUID(), date, weightLb: value, updatedAt: '', deletedAt: null })
      setWeight('')
    } catch (e) {
      log.error('ui.weight_put_failed', { date, error: String(e) })
      setError({ field: 'form', message: `Couldn't save: ${String(e)}` })
    }
    setBusy(false)
  }

  const { weighIns, trend } = weightSeries(weights ?? [], today, range)
  const calories = calorieSeries(allLog ?? [], today, range)
  const summary = summarize({ trend, calories, range })
  // The prediction runs on the same maintenance the targets do, which is the adaptive estimate once there is one.
  const maint = profile && latest ? Math.round(maintenance(profile, latest.weightLb, new Date().getFullYear())) : null

  const weightMarks: ChartSeries[] = [
    { id: 'weighIns', label: 'Weigh-in', mark: 'dots', points: weighIns },
    { id: 'trend', label: 'Trend (smoothed)', mark: 'trend', points: trend },
  ]
  const chart = {
    weight: { series: weightMarks, yPad: 1, format: lb, empty: 'No weigh-ins in this range yet.' },
    calories: {
      series: [
        { id: 'day', label: 'Day logged', mark: 'dots', points: calories },
        { id: 'mean', label: `${String(MEAN_DAYS)}-day average`, mark: 'trend', points: movingMean(calories, MEAN_DAYS) },
      ] satisfies ChartSeries[],
      yPad: 100, format: n, empty: 'Nothing logged in this range yet.',
    },
    predicted: {
      series: [...weightMarks, {
        id: 'predicted', label: 'Predicted from intake', mark: 'predicted',
        points: maint === null ? [] : predictedSeries({ weighIns, entries: allLog ?? [], maintenance: maint, today, range }),
      }] satisfies ChartSeries[],
      yPad: 1, format: lb, empty: 'No weigh-ins in this range yet, so there is nothing to compare a prediction with.',
    },
  }[view]
  const title = `${VIEW_TITLES[view]}, ${RANGE_WORDS[range]}`
  // The first series is what the view is of: with nothing in it there is no chart to draw, only a line saying so.
  const drawable = (chart.series[0]?.points.length ?? 0) > 0

  return (
    <div class="progress">
      <section aria-label="Chart">
        {/* The masthead already names the page; this heading is here so VO-Cmd-H skims the screen like the others. */}
        <h2 class="visually-hidden">Chart</h2>
        <label class="field chart-pick">
          Chart
          <select value={view} onChange={(ev) => {
            const v = VIEWS.find((o) => o.value === ev.currentTarget.value)?.value
            if (v) setView(v)
          }}>
            {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </label>
        <Chips legend="Range" name="range" options={RANGES} value={range} onSelect={setRange} />
        {view === 'predicted' && <p class="chart-note">{predictionNote(maint)}</p>}
        {weights && allLog && (drawable
          ? <InkChart title={title} series={chart.series} yPad={chart.yPad} format={chart.format} />
          : <div class="empty"><ScaleDoodle /><p>{chart.empty}</p></div>)}
      </section>

      <section aria-label="Summary">
        <h2>Summary</h2>
        <div class="stats">
          <Stat label="Trend weight" value={summary.trendWeight === null ? null : lb(summary.trendWeight)} unit="lb" />
          <Stat label={summary.changeLabel} value={summary.changeLb === null ? null : signed(summary.changeLb)} unit="lb" />
          <Stat label="Avg calories" value={summary.avgCalories === null ? null : n(summary.avgCalories)} unit="kcal" />
          <Stat label="Days logged" value={String(summary.daysLogged)}
            unit={summary.rangeDays === null ? 'days' : `of ${String(summary.rangeDays)}`} />
        </div>
        {weights && allLog && <p class="adaptive-status">{adaptiveStatus(profile, weights, allLog, today)}</p>}
      </section>

      <section aria-label="Log a weigh-in">
        <h2>Log a weigh-in</h2>
        <form class="weight-form" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
          <label class="field">
            Weight (lb)
            <input type="number" inputMode="decimal" enterKeyHint="done" min={MIN_LB} max={MAX_LB} step="any" required value={weight}
              aria-invalid={error?.field === 'weight'} aria-describedby={error?.field === 'weight' ? 'weight-err' : undefined}
              onInput={(ev) => { setWeight(ev.currentTarget.value) }} />
          </label>
          <label class="field">
            Date
            <input type="date" max={today} required value={date}
              aria-invalid={error?.field === 'date'} aria-describedby={error?.field === 'date' ? 'weight-err' : undefined}
              onInput={(ev) => { setDate(ev.currentTarget.value) }} />
          </label>
          {error !== null && <p id="weight-err" role="alert" class="error">{error.message}</p>}
          <button type="submit" class="primary" disabled={busy}>Save weight</button>
        </form>
      </section>
    </div>
  )
}
