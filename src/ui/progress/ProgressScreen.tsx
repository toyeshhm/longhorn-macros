import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { maintenance } from '../../goals'
import type { Key } from '../../i18n'
import { log } from '../../log'
import {
  adaptiveStatus, ASSUMED_KCAL, assumedCalories, calorieSeries, movingMean, MEAN_DAYS, predictedSeries, predictionNote, RANGES,
  signed, summarize, weightSeries, type ChartSeries, type Range,
} from '../../progress'
import { useApp } from '../context'
import { useT } from '../i18n'
import { useLatestWeight, useLive, useProfile } from '../hooks'
import { ScaleDoodle } from '../icons/Doodles'
import { Chips } from '../menu/MenuScreen'
import { InkChart } from './InkChart'

const VIEWS = ['weight', 'calories', 'predicted'] as const
type View = (typeof VIEWS)[number]
// The chart's own title is spelled out where the control is not: "Predicted vs actual" names a switch, and
// "Predicted and actual weight, the last 30 days" is what a screen reader should hear the picture called.
const VIEW_LABEL: Readonly<Record<View, Key>> = { weight: 'progress.view.weight', calories: 'progress.view.calories', predicted: 'progress.view.predicted' }
const VIEW_TITLE: Readonly<Record<View, Key>> = { weight: 'progress.title.weight', calories: 'progress.title.calories', predicted: 'progress.title.predicted' }
const VIEW_EMPTY: Readonly<Record<View, Key>> = { weight: 'progress.empty.weight', calories: 'progress.empty.calories', predicted: 'progress.empty.predicted' }
const RANGE_LABEL: Readonly<Record<Range, Key>> = { '30': 'progress.range.30', '90': 'progress.range.90', 'all': 'progress.range.all' }
const RANGE_WORDS: Readonly<Record<Range, Key>> = { '30': 'progress.words.30', '90': 'progress.words.90', 'all': 'progress.words.all' }
const MIN_LB = 50
const MAX_LB = 700
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

// The message is shown at the field it is about (aria-describedby), not as one message at the foot of the form.
interface Invalid { field: 'weight' | 'date' | 'form'; message: string }

// Value first in the DOM because the tile prints it first. The order used to be label-then-value flipped back by
// `flex-direction: column-reverse`, which is exactly the reading-order-against-visual-order split WCAG 1.3.2 is about.
function Stat({ label, value, unit }: { label: string; value: string | null; unit: string }) {
  return (
    <div class="stat">
      <span class="stat-value">{value === null ? '—' : <>{value}<small> {unit}</small></>}</span>
      <span class="stat-label">{label}</span>
    </div>
  )
}

export function ProgressScreen() {
  const t = useT()
  const lb = (v: number): string => t.d(v)
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
      setError({ field: 'weight', message: t.t('progress.weightRange', { min: MIN_LB, max: MAX_LB }) })
      return
    }
    if (!DATE_KEY.test(date) || date > today) { setError({ field: 'date', message: t.t('progress.dateInvalid') }); return }
    setBusy(true)
    setError(null)
    try {
      // One row per date (unique user,date): reuse that date's id so the upsert replaces it.
      const existing = await store.weightForDate(date)
      await store.put('weights', { id: existing?.id ?? crypto.randomUUID(), date, weightLb: value, updatedAt: '', deletedAt: null })
      setWeight('')
    } catch (e) {
      log.error('ui.weight_put_failed', { date, error: String(e) })
      setError({ field: 'form', message: t.t('common.saveFailed', { error: String(e) }) })
    }
    setBusy(false)
  }

  const { weighIns, trend } = weightSeries(weights ?? [], today, range)
  const calories = calorieSeries(allLog ?? [], today, range)
  const assumed = assumedCalories(allLog ?? [], today, range)
  const summary = summarize({ trend, calories, assumed, range, t })
  // The prediction runs on the same maintenance the targets do, which is the adaptive estimate once there is one.
  const maint = profile && latest ? Math.round(maintenance(profile, latest.weightLb, new Date().getFullYear())) : null

  const weightMarks: ChartSeries[] = [
    { id: 'weighIns', label: t.t('progress.series.weighIn'), mark: 'dots', points: weighIns },
    { id: 'trend', label: t.t('progress.series.trend'), mark: 'trend', points: trend },
  ]
  const chart = {
    weight: { series: weightMarks, yPad: 1, format: lb },
    calories: {
      series: [
        { id: 'day', label: t.t('progress.series.day'), mark: 'dots', points: calories },
        { id: 'assumed', label: t.t('progress.series.assumed', { kcal: t.n(ASSUMED_KCAL) }), mark: 'assumed', points: assumed },
        {
          id: 'mean', label: t.t('progress.series.mean', { days: MEAN_DAYS }), mark: 'trend',
          points: movingMean([...calories, ...assumed].sort((a, b) => a.date.localeCompare(b.date)), MEAN_DAYS),
        },
      ] satisfies ChartSeries[],
      yPad: 100, format: t.n,
    },
    predicted: {
      series: [...weightMarks, {
        id: 'predicted', label: t.t('progress.series.predicted'), mark: 'predicted',
        points: maint === null ? [] : predictedSeries({ weighIns, entries: allLog ?? [], maintenance: maint, today, range }),
      }] satisfies ChartSeries[],
      yPad: 1, format: lb,
    },
  }[view]
  const title = t.t('progress.chartTitle', { title: t.t(VIEW_TITLE[view]), range: t.t(RANGE_WORDS[range]) })
  // The first series is what the view is of (for calories, assumed days count): with nothing in it there is no
  // chart to draw, only a line saying so.
  const drawable = (chart.series[0]?.points.length ?? 0) > 0 || (view === 'calories' && assumed.length > 0)

  return (
    <div class="progress">
      <section aria-label={t.t('progress.chart')}>
        {/* The masthead already names the page; this heading is here so VO-Cmd-H skims the screen like the others. */}
        <h2 class="visually-hidden">{t.t('progress.chart')}</h2>
        {/* Both one-of-three picks are one-row segmented bars: wrapping chip stamps stacked three rows deep on a phone. */}
        <Chips segmented legend={t.t('progress.view')} name="view"
          options={VIEWS.map((v) => ({ value: v, label: t.t(VIEW_LABEL[v]) }))} value={view} onSelect={setView} />
        <Chips segmented legend={t.t('progress.range')} name="range"
          options={RANGES.map((r) => ({ value: r, label: t.t(RANGE_LABEL[r]) }))} value={range} onSelect={setRange} />
        {view === 'predicted' && <p class="chart-note">{predictionNote(maint, profile?.tdeeEstimate != null, t)}</p>}
        {weights && allLog && (drawable
          ? <InkChart title={title} series={chart.series} yPad={chart.yPad} format={chart.format} />
          : <div class="empty"><ScaleDoodle /><p>{t.t(VIEW_EMPTY[view])}</p></div>)}
      </section>

      <section aria-label={t.t('progress.summary')}>
        <h2>{t.t('progress.summary')}</h2>
        <div class="stats">
          <Stat label={t.t('progress.trendWeight')} value={summary.trendWeight === null ? null : lb(summary.trendWeight)} unit={t.t('unit.lb')} />
          <Stat label={summary.changeLabel} value={summary.changeLb === null ? null : signed(summary.changeLb, t)} unit={t.t('unit.lb')} />
          <Stat label={t.t('progress.avgCalories')} value={summary.avgCalories === null ? null : t.n(summary.avgCalories)} unit={t.t('unit.kcal')} />
          <Stat label={t.t('progress.daysLogged')} value={t.n(summary.daysLogged)}
            unit={summary.rangeDays === null ? t.t('unit.days') : t.t('progress.ofDays', { days: summary.rangeDays })} />
        </div>
        {weights && allLog && <p class="adaptive-status">{adaptiveStatus(profile, weights, allLog, today, t)}</p>}
      </section>

      <section aria-label={t.t('progress.logWeighIn')}>
        <h2>{t.t('progress.logWeighIn')}</h2>
        <form class="weight-form" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
          <label class="field">
            {t.t('progress.weightLb')}
            <input type="number" inputMode="decimal" enterKeyHint="done" min={MIN_LB} max={MAX_LB} step="any" required value={weight}
              aria-invalid={error?.field === 'weight'} aria-describedby={error?.field === 'weight' ? 'weight-err' : undefined}
              onInput={(ev) => { setWeight(ev.currentTarget.value) }} />
          </label>
          <label class="field">
            {t.t('common.date')}
            <input type="date" max={today} required value={date}
              aria-invalid={error?.field === 'date'} aria-describedby={error?.field === 'date' ? 'weight-err' : undefined}
              onInput={(ev) => { setDate(ev.currentTarget.value) }} />
          </label>
          {error !== null && <p id="weight-err" role="alert" class="error">{error.message}</p>}
          <button type="submit" class="primary" disabled={busy}>{t.t('progress.saveWeight')}</button>
        </form>
      </section>
    </div>
  )
}
