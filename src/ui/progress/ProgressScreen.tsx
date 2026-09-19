import { useState } from 'preact/hooks'
import { evaluateAdaptive, ewmaTrend, type WeightPoint } from '../../adaptive'
import { dailyIntake } from '../../adaptiveRun'
import { weeklyStats } from '../../chart'
import { addDays, localDateKey } from '../../dates'
import type { LogEntry, ProfileRow } from '../../db/types'
import { log } from '../../log'
import { useApp } from '../context'
import { useLive, useProfile } from '../hooks'
import { Swatch } from '../icons/Marks'
import { Chips } from '../menu/MenuScreen'
import { WeightChart } from './WeightChart'

const RANGES = [{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'All', label: 'All' }] as const
const MIN_LB = 50
const MAX_LB = 700
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

function adaptiveStatus(profile: ProfileRow | null | undefined, weights: readonly WeightPoint[], allLog: readonly LogEntry[], today: string): string {
  if (profile?.tdeeEstimate != null && profile.tdeeUpdatedOn !== null) {
    const on = new Date(`${profile.tdeeUpdatedOn}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `Maintenance estimate: ${String(Math.round(profile.tdeeEstimate))} kcal (updated ${on})`
  }
  // Only the eligibility part of the result is used here; previous/pace don't affect it.
  const r = evaluateAdaptive({ today, lastRunOn: null, previous: 0, plannedLbPerWeek: 0, weights, intake: dailyIntake(allLog) })
  if (r.kind === 'insufficient') {
    const parts = [
      r.loggedDaysNeeded > 0 && `~${String(r.loggedDaysNeeded)} more logged days`,
      r.weighInsNeeded > 0 && `${String(r.weighInsNeeded)} ${r.weighInsNeeded === 1 ? 'weigh-in' : 'weigh-ins'}`,
    ].filter((p) => p !== false)
    return `Needs ${parts.join(' and ')}`
  }
  return profile?.adaptiveEnabled
    ? 'Enough data. Your maintenance estimate updates next time you open the app.'
    : 'Enough data. Turn on adaptive TDEE in Goals to learn your maintenance.'
}

export function ProgressScreen() {
  const { store } = useApp()
  const today = localDateKey(new Date())
  // ponytail: loads every weight and log row; fine for one person's history, index by date if it ever gets slow.
  const weights = useLive(() => store.all('weights'), [])
  const allLog = useLive(() => store.all('food_log'), [])
  const profile = useProfile()
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('30')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(today)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (): Promise<void> => {
    const lb = Number(weight.trim())
    if (weight.trim() === '' || !Number.isFinite(lb) || lb < MIN_LB || lb > MAX_LB) {
      setError(`Weight must be between ${String(MIN_LB)} and ${String(MAX_LB)} lb.`)
      return
    }
    if (!DATE_KEY.test(date) || date > today) { setError('Pick a date on or before today.'); return }
    setBusy(true)
    setError(null)
    try {
      // One row per date (unique user,date): reuse that date's id so the upsert replaces it.
      const existing = await store.weightForDate(date)
      await store.put('weights', { id: existing?.id ?? crypto.randomUUID(), date, weightLb: lb, updatedAt: '', deletedAt: null })
      setWeight('')
    } catch (e) {
      log.error('ui.weight_put_failed', { date, error: String(e) })
      setError(`Couldn't save: ${String(e)}`)
    }
    setBusy(false)
  }

  const points = (weights ?? []).map((w) => ({ date: w.date, weightLb: w.weightLb }))
  const inRange = (d: string): boolean => range === 'All' || d > addDays(today, -Number(range))
  const trend = ewmaTrend(points).filter((p) => inRange(p.date)) // trend over all history, then windowed, so it's warmed up
  const raw = points.filter((p) => inRange(p.date))
  const stats = weeklyStats(allLog ?? [], today)

  return (
    <div class="progress">
      <form class="weight-form" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
        <label class="field">
          Weight (lb)
          <input type="number" inputMode="decimal" min={MIN_LB} max={MAX_LB} step="any" required value={weight}
            onInput={(ev) => { setWeight(ev.currentTarget.value) }} />
        </label>
        <label class="field">
          Date
          <input type="date" max={today} required value={date} onInput={(ev) => { setDate(ev.currentTarget.value) }} />
        </label>
        <button type="submit" class="primary" disabled={busy}>Save weight</button>
        {error !== null && <p role="alert" class="error">{error}</p>}
      </form>

      <Chips legend="Chart range" name="range" options={RANGES} value={range} onSelect={setRange} />
      {weights && <WeightChart raw={raw} trend={trend} />}

      <section class="stats" aria-label="Last 7 days">
        <div class="stat"><span class="stat-label">Avg calories</span><span class="stat-value">{stats.avgCalories === null ? '—' : <>{Math.round(stats.avgCalories)}<small> kcal</small></>}</span></div>
        <div class="stat"><span class="stat-label"><Swatch ink="protein" />Avg protein</span><span class="stat-value">{stats.avgProtein === null ? '—' : <>{Math.round(stats.avgProtein)}<small> g</small></>}</span></div>
        <div class="stat"><span class="stat-label">Days logged</span><span class="stat-value">{stats.daysLogged}<small> / 7</small></span></div>
      </section>
      {weights && allLog && <p class="adaptive-status">{adaptiveStatus(profile, points, allLog, today)}</p>}
    </div>
  )
}
