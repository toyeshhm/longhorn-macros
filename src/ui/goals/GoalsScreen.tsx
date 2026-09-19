import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import type { ProfileRow } from '../../db/types'
import {
  bmr, computeTargets, formulaTdee, maintenance, RATE_OPTIONS, validateProfile,
  type Activity, type Goal, type Profile, type Sex, type Targets,
} from '../../goals'
import { log } from '../../log'
import { supabase } from '../../supabase/client'
import { useApp } from '../context'
import { n } from '../format'
import { useLatestWeight, useProfile } from '../hooks'
import { Swatch } from '../icons/Marks'
import { Chips } from '../menu/MenuScreen'

const SEX_OPTIONS = [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] as const
const GOAL_OPTIONS = [{ value: 'cut', label: 'Cut' }, { value: 'maintain', label: 'Maintain' }, { value: 'bulk', label: 'Bulk' }] as const
const ACTIVITY_OPTIONS: readonly { value: Activity; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary: mostly sitting' },
  { value: 'light', label: 'Light: walking to class daily' },
  { value: 'moderate', label: 'Moderate: exercise 3–5×/wk' },
  { value: 'active', label: 'Active: hard training 6–7×/wk' },
  { value: 'very_active', label: 'Very active: athlete, 2-a-days' },
]
const TARGET_FIELDS: readonly { key: keyof Targets; label: string }[] = [
  { key: 'calories', label: 'Calories (kcal)' }, { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' }, { key: 'fat', label: 'Fat (g)' },
]
const MIN_LB = 50
const MAX_LB = 700

type ErrorKey = 'birthYear' | 'height' | 'rate' | 'weight' | keyof Targets | 'form'

function paceLabel(goal: Goal, rate: number): string {
  if (goal === 'maintain') return 'maintain weight'
  return `${goal === 'cut' ? 'lose' : 'gain'} ${String(rate)} lb/week`
}

// Blank means "not entered" (Number('') would be 0).
function num(s: string): number {
  return s.trim() === '' ? NaN : Number(s)
}

// validateProfile's messages lead with the field they concern; route each to its input.
function errorKey(message: string): ErrorKey {
  if (message.startsWith('birth year')) return 'birthYear'
  if (message.startsWith('height')) return 'height'
  if (message.startsWith('rate')) return 'rate'
  const override = /^override (calories|protein|carbs|fat) /.exec(message)?.[1]
  return TARGET_FIELDS.find((f) => f.key === override)?.key ?? 'form'
}

export function GoalsScreen() {
  const profile = useProfile()
  const weight = useLatestWeight()
  // The first save turns `profile` from null into a row, which remounts the form (its key changes) and would wipe a
  // "Saved" message held inside it, so the message lives out here where it survives that swap and can be announced.
  const [status, setStatus] = useState<string | null>(null)
  if (profile === undefined || weight === undefined) return <p class="loading">Loading…</p>
  return (
    <GoalsForm key={profile === null ? 'new' : 'existing'} profile={profile} latestWeightLb={weight?.weightLb ?? null}
      status={status} setStatus={setStatus} />
  )
}

function GoalsForm({ profile, latestWeightLb, status, setStatus }: {
  profile: ProfileRow | null; latestWeightLb: number | null; status: string | null; setStatus: (s: string | null) => void
}) {
  const { store, userId } = useApp()
  const firstRun = profile === null
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male')
  const [birthYear, setBirthYear] = useState(profile ? String(profile.birthYear) : '')
  const [feet, setFeet] = useState(profile ? String(Math.floor(profile.heightIn / 12)) : '')
  const [inches, setInches] = useState(profile ? String(profile.heightIn % 12) : '')
  const [activity, setActivity] = useState<Activity>(profile?.activity ?? 'moderate')
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain')
  const [rate, setRate] = useState(profile?.rateLbPerWeek ?? 0)
  const [weight, setWeight] = useState('')
  const [overrides, setOverrides] = useState<Record<keyof Targets, string>>(() => {
    const o = profile?.override
    const s = (v: number | undefined): string => (v === undefined ? '' : String(v))
    return { calories: s(o?.calories), protein: s(o?.protein), carbs: s(o?.carbs), fat: s(o?.fat) }
  })
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(profile?.adaptiveEnabled ?? true)
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({})
  const [busy, setBusy] = useState(false)

  const override: Partial<Targets> = {}
  for (const { key } of TARGET_FIELDS) if (overrides[key].trim() !== '') override[key] = num(overrides[key])
  const draft: Profile = {
    sex, birthYear: num(birthYear), heightIn: num(feet) * 12 + (inches.trim() === '' ? 0 : Number(inches)),
    activity, goal, rateLbPerWeek: rate, override: Object.keys(override).length > 0 ? override : null, adaptiveEnabled,
    tdeeEstimate: profile?.tdeeEstimate ?? null, tdeeUpdatedOn: profile?.tdeeUpdatedOn ?? null, tdeePrevious: profile?.tdeePrevious ?? null,
  }
  const weightLb = firstRun ? num(weight) : latestWeightLb
  const weightOk = weightLb !== null && Number.isFinite(weightLb) && weightLb >= MIN_LB && weightLb <= MAX_LB

  const validate = (): Partial<Record<ErrorKey, string>> => {
    const found: Partial<Record<ErrorKey, string>> = {}
    for (const m of validateProfile(draft)) found[errorKey(m)] ??= m
    if (firstRun && !weightOk) found.weight = `weight must be between ${String(MIN_LB)} and ${String(MAX_LB)} lb`
    return found
  }

  const save = async (): Promise<void> => {
    const found = validate()
    setErrors(found)
    setStatus(null)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    try {
      const today = localDateKey(new Date())
      if (firstRun && weightLb !== null) {
        const existing = await store.weightForDate(today)
        await store.put('weights', { id: existing?.id ?? crypto.randomUUID(), date: today, weightLb, updatedAt: '', deletedAt: null })
      }
      // Re-read so a concurrent adaptive update's tdee fields aren't clobbered by the form's snapshot.
      const current = await store.get('profile', userId)
      await store.put('profile', {
        ...draft, id: userId, updatedAt: '', deletedAt: null,
        tdeeEstimate: current?.tdeeEstimate ?? null, tdeeUpdatedOn: current?.tdeeUpdatedOn ?? null, tdeePrevious: current?.tdeePrevious ?? null,
      })
      setStatus('Saved')
    } catch (e) {
      log.error('ui.profile_put_failed', { error: String(e) })
      setErrors({ form: `Couldn't save: ${String(e)}` })
    }
    setBusy(false)
  }

  const err = (k: ErrorKey) => {
    const m = errors[k]
    return m === undefined ? null : <p id={`goals-err-${k}`} role="alert" class="error">{m}</p>
  }
  const describedBy = (k: ErrorKey): string | undefined => (errors[k] === undefined ? undefined : `goals-err-${k}`)
  const year = new Date().getFullYear()
  const live = weightOk && validateProfile(draft).length === 0 ? { weightLb, targets: computeTargets(draft, weightLb, year) } : null

  return (
    <div class="goals">
      {firstRun && <p class="notice">Welcome! Set up your profile and first weigh-in to get daily targets.</p>}
      <form class="goals-form" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
        <Chips legend="Sex" name="sex" options={SEX_OPTIONS} value={sex} onSelect={setSex} />
        <label class="field">
          Birth year
          <input type="number" inputMode="numeric" min={1900} max={2015} value={birthYear} aria-invalid={errors.birthYear !== undefined}
            aria-describedby={describedBy('birthYear')} onInput={(ev) => { setBirthYear(ev.currentTarget.value) }} />
        </label>
        {err('birthYear')}
        <fieldset class="height">
          <legend>Height</legend>
          <label class="field">
            Feet
            <input type="number" inputMode="numeric" min={4} max={8} value={feet} aria-invalid={errors.height !== undefined}
              aria-describedby={describedBy('height')} onInput={(ev) => { setFeet(ev.currentTarget.value) }} />
          </label>
          <label class="field">
            Inches
            <input type="number" inputMode="decimal" min={0} max={11} step="any" value={inches} aria-invalid={errors.height !== undefined}
              aria-describedby={describedBy('height')} onInput={(ev) => { setInches(ev.currentTarget.value) }} />
          </label>
        </fieldset>
        {err('height')}
        {firstRun && (
          <>
            <label class="field">
              Current weight (lb)
              <input type="number" inputMode="decimal" min={MIN_LB} max={MAX_LB} step="any" value={weight} aria-invalid={errors.weight !== undefined}
                aria-describedby={describedBy('weight')} onInput={(ev) => { setWeight(ev.currentTarget.value) }} />
            </label>
            {err('weight')}
          </>
        )}
        <label class="field">
          Activity
          <select value={activity} onChange={(ev) => {
            const v = ACTIVITY_OPTIONS.find((o) => o.value === ev.currentTarget.value)?.value
            if (v) setActivity(v)
          }}>
            {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <Chips legend="Goal" name="goal" options={GOAL_OPTIONS} value={goal} onSelect={(g) => {
          setGoal(g)
          if (!RATE_OPTIONS[g].includes(rate)) setRate(RATE_OPTIONS[g][0] ?? 0)
        }} />
        <label class="field">
          Pace
          <select value={String(rate)} aria-invalid={errors.rate !== undefined} aria-describedby={describedBy('rate')} onChange={(ev) => { setRate(Number(ev.currentTarget.value)) }}>
            {RATE_OPTIONS[goal].map((r) => <option key={r} value={String(r)}>{paceLabel(goal, r)}</option>)}
          </select>
        </label>
        {err('rate')}

        <details class="overrides" open={draft.override !== null}>
          <summary>Adjust targets manually</summary>
          <p class="muted">Leave a field blank to use the computed value.</p>
          <div class="nutrient-grid">
            {TARGET_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label class="field">
                  {label}
                  <input type="number" inputMode="decimal" min={0} max={10000} step="any" value={overrides[key]}
                    placeholder={live ? String(computeTargets({ ...draft, override: null }, live.weightLb, year)[key]) : ''}
                    aria-invalid={errors[key] !== undefined} aria-describedby={describedBy(key)}
                    onInput={(ev) => { const v = ev.currentTarget.value; setOverrides((prev) => ({ ...prev, [key]: v })) }} />
                </label>
                {err(key)}
              </div>
            ))}
          </div>
        </details>

        <label class="toggle">
          <input type="checkbox" checked={adaptiveEnabled} onChange={(ev) => { setAdaptiveEnabled(ev.currentTarget.checked) }} />
          Adaptive TDEE: learn my maintenance from my weight trend
        </label>

        {errors.form !== undefined && <p role="alert" class="error">{errors.form}</p>}
        <button type="submit" class="primary" disabled={busy}>Save</button>
        {status !== null && <p role="status" class="muted">{status}</p>}
      </form>

      {live ? (
        <section class="goal-panel" aria-label="Your targets">
          <h2>Your daily targets</h2>
          <dl>
            <dt>BMR</dt><dd>{n(bmr(draft, live.weightLb, year))} kcal</dd>
            <dt>Formula TDEE</dt><dd>{n(formulaTdee(draft, live.weightLb, year))} kcal</dd>
            <dt>Maintenance used</dt>
            <dd>{n(maintenance(draft, live.weightLb, year))} kcal{draft.tdeeEstimate !== null && ' (learned from your data)'}</dd>
            <dt class="target">Calories</dt><dd class="target">{n(live.targets.calories)} kcal</dd>
            <dt class="target"><Swatch ink="protein" />Protein</dt><dd class="target">{live.targets.protein} g</dd>
            <dt class="target"><Swatch ink="carbs" />Carbs</dt><dd class="target">{live.targets.carbs} g</dd>
            <dt class="target"><Swatch ink="fat" />Fat</dt><dd class="target">{live.targets.fat} g</dd>
          </dl>
        </section>
      ) : (
        <p class="muted">Fill in your profile{firstRun ? ' and current weight' : ''} to see your targets.</p>
      )}

      <button type="button" onClick={() => {
        supabase.auth.signOut().then(
          ({ error }) => { if (error) log.warn('auth.sign_out_failed', { userId, reason: error.message }) },
          (e: unknown) => { log.error('auth.sign_out_failed', { userId, error: String(e) }) },
        )
      }}>Log out</button>
    </div>
  )
}
