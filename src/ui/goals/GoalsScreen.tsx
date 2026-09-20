import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import type { ProfileRow } from '../../db/types'
import {
  BIRTH_YEAR_RANGE, bmr, computeTargets, formulaTdee, HEIGHT_IN_RANGE, maintenance, OVERRIDE_RANGE,
  RATE_OPTIONS, TARGET_KEYS, validateProfile,
  type Activity, type Goal, type Profile, type ProfileError, type Sex, type Targets,
} from '../../goals'
import type { Key, T } from '../../i18n'
import { log } from '../../log'
import { useApp } from '../context'
import { useT } from '../i18n'
import { useLatestWeight, useProfile } from '../hooks'
import { Swatch } from '../icons/Marks'
import { Chips } from '../menu/MenuScreen'

const SEX_OPTIONS: readonly { value: Sex; label: Key }[] = [
  { value: 'male', label: 'goals.male' }, { value: 'female', label: 'goals.female' },
]
const GOAL_OPTIONS: readonly { value: Goal; label: Key }[] = [
  { value: 'cut', label: 'goals.cut' }, { value: 'maintain', label: 'goals.maintain' }, { value: 'bulk', label: 'goals.bulk' },
]
const ACTIVITY_OPTIONS: readonly { value: Activity; label: Key }[] = [
  { value: 'sedentary', label: 'goals.activity.sedentary' },
  { value: 'light', label: 'goals.activity.light' },
  { value: 'moderate', label: 'goals.activity.moderate' },
  { value: 'active', label: 'goals.activity.active' },
  { value: 'very_active', label: 'goals.activity.very_active' },
]
const TARGET_LABEL: Readonly<Record<keyof Targets, Key>> = {
  calories: 'field.calories', protein: 'field.protein', carbs: 'field.carbs', fat: 'field.fat',
}
// The override message names the target mid-sentence, so it takes the bare lower-case word rather than the
// field's own "Calories (kcal)".
const TARGET_LOWER: Readonly<Record<keyof Targets, Key>> = {
  calories: 'macro.lower.calories', protein: 'macro.lower.protein', carbs: 'macro.lower.carbs', fat: 'macro.lower.fat',
}
const MIN_LB = 50
const MAX_LB = 700

type ErrorKey = 'birthYear' | 'height' | 'rate' | 'weight' | keyof Targets | 'form'

function paceLabel(goal: Goal, rate: number, t: T): string {
  if (goal === 'maintain') return t.t('goals.paceMaintain')
  return t.t(goal === 'cut' ? 'goals.paceLose' : 'goals.paceGain', { rate: t.d(rate) })
}

// Blank means "not entered" (Number('') would be 0).
function num(s: string): number {
  return s.trim() === '' ? NaN : Number(s)
}

// validateProfile names the field rather than writing the sentence, so the message is composed here, once, and
// routed to the input it is about. It used to be routed by reading the English text, which translation would have
// broken silently.
// The bounds print as bare digits in every language: a year is not a quantity, and a limit in a validation
// message reads as a limit rather than as an amount. Only the figures the reader is actually counting get grouped.
function errorText(e: ProfileError, goal: Goal, t: T): string {
  if (e.field === 'birthYear') return t.t('goals.err.birthYear', { min: BIRTH_YEAR_RANGE.min, max: BIRTH_YEAR_RANGE.max })
  if (e.field === 'height') return t.t('goals.err.height', { min: HEIGHT_IN_RANGE.min, max: HEIGHT_IN_RANGE.max })
  if (e.field === 'rate') {
    const options = RATE_OPTIONS[goal].map((r) => t.d(r)).join(', ')
    return t.t('goals.err.rate', { options, goal: t.t(`goals.${goal}`) })
  }
  return t.t('goals.err.override', { field: t.t(TARGET_LOWER[e.field]), min: OVERRIDE_RANGE.min, max: OVERRIDE_RANGE.max })
}

export function GoalsScreen() {
  const t = useT()
  const profile = useProfile()
  const weight = useLatestWeight()
  // The first save turns `profile` from null into a row, which remounts the form (its key changes) and would wipe a
  // "Saved" message held inside it, so the message lives out here where it survives that swap and can be announced.
  const [status, setStatus] = useState<string | null>(null)
  if (profile === undefined || weight === undefined) return <p class="loading">{t.t('common.loading')}</p>
  return (
    <GoalsForm key={profile === null ? 'new' : 'existing'} profile={profile} latestWeightLb={weight?.weightLb ?? null}
      status={status} setStatus={setStatus} />
  )
}

function GoalsForm({ profile, latestWeightLb, status, setStatus }: {
  profile: ProfileRow | null; latestWeightLb: number | null; status: string | null; setStatus: (s: string | null) => void
}) {
  const t = useT()
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
  for (const key of TARGET_KEYS) if (overrides[key].trim() !== '') override[key] = num(overrides[key])
  const draft: Profile = {
    sex, birthYear: num(birthYear), heightIn: num(feet) * 12 + (inches.trim() === '' ? 0 : Number(inches)),
    activity, goal, rateLbPerWeek: rate, override: Object.keys(override).length > 0 ? override : null, adaptiveEnabled,
    tdeeEstimate: profile?.tdeeEstimate ?? null, tdeeUpdatedOn: profile?.tdeeUpdatedOn ?? null, tdeePrevious: profile?.tdeePrevious ?? null,
  }
  const weightLb = firstRun ? num(weight) : latestWeightLb
  const weightOk = weightLb !== null && Number.isFinite(weightLb) && weightLb >= MIN_LB && weightLb <= MAX_LB

  const validate = (): Partial<Record<ErrorKey, string>> => {
    const found: Partial<Record<ErrorKey, string>> = {}
    for (const e of validateProfile(draft)) found[e.field] ??= errorText(e, goal, t)
    if (firstRun && !weightOk) found.weight = t.t('goals.err.weight', { min: MIN_LB, max: MAX_LB })
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
      setStatus(t.t('common.saved'))
    } catch (e) {
      log.error('ui.profile_put_failed', { error: String(e) })
      setErrors({ form: t.t('common.saveFailed', { error: String(e) }) })
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
      {firstRun && <p class="notice">{t.t('goals.welcome')}</p>}
      <form class="goals-form" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
        <Chips wrap legend={t.t('goals.sex')} name="sex"
          options={SEX_OPTIONS.map((o) => ({ value: o.value, label: t.t(o.label) }))} value={sex} onSelect={setSex} />
        <label class="field">
          {t.t('goals.birthYear')}
          <input type="number" inputMode="numeric" min={BIRTH_YEAR_RANGE.min} max={BIRTH_YEAR_RANGE.max} value={birthYear} aria-invalid={errors.birthYear !== undefined}
            aria-describedby={describedBy('birthYear')} onInput={(ev) => { setBirthYear(ev.currentTarget.value) }} />
        </label>
        {err('birthYear')}
        <fieldset class="height">
          <legend>{t.t('goals.height')}</legend>
          <label class="field">
            {t.t('goals.feet')}
            <input type="number" inputMode="numeric" min={4} max={8} value={feet} aria-invalid={errors.height !== undefined}
              aria-describedby={describedBy('height')} onInput={(ev) => { setFeet(ev.currentTarget.value) }} />
          </label>
          <label class="field">
            {t.t('goals.inches')}
            <input type="number" inputMode="decimal" min={0} max={11} step="any" value={inches} aria-invalid={errors.height !== undefined}
              aria-describedby={describedBy('height')} onInput={(ev) => { setInches(ev.currentTarget.value) }} />
          </label>
        </fieldset>
        {err('height')}
        {firstRun && (
          <>
            <label class="field">
              {t.t('goals.currentWeight')}
              <input type="number" inputMode="decimal" min={MIN_LB} max={MAX_LB} step="any" value={weight} aria-invalid={errors.weight !== undefined}
                aria-describedby={describedBy('weight')} onInput={(ev) => { setWeight(ev.currentTarget.value) }} />
            </label>
            {err('weight')}
          </>
        )}
        <label class="field">
          {t.t('goals.activity')}
          <select value={activity} onChange={(ev) => {
            const v = ACTIVITY_OPTIONS.find((o) => o.value === ev.currentTarget.value)?.value
            if (v) setActivity(v)
          }}>
            {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t.t(o.label)}</option>)}
          </select>
        </label>
        <Chips wrap legend={t.t('goals.goal')} name="goal"
          options={GOAL_OPTIONS.map((o) => ({ value: o.value, label: t.t(o.label) }))} value={goal} onSelect={(g) => {
          setGoal(g)
          if (!RATE_OPTIONS[g].includes(rate)) setRate(RATE_OPTIONS[g][0] ?? 0)
        }} />
        <label class="field">
          {t.t('goals.pace')}
          <select value={String(rate)} aria-invalid={errors.rate !== undefined} aria-describedby={describedBy('rate')} onChange={(ev) => { setRate(Number(ev.currentTarget.value)) }}>
            {RATE_OPTIONS[goal].map((r) => <option key={r} value={String(r)}>{paceLabel(goal, r, t)}</option>)}
          </select>
        </label>
        {err('rate')}

        <details class="overrides" open={draft.override !== null}>
          <summary>{t.t('goals.overrides')}</summary>
          <p class="muted">{t.t('goals.overridesHint')}</p>
          <div class="nutrient-grid">
            {TARGET_KEYS.map((key) => (
              <div key={key}>
                <label class="field">
                  {t.t(TARGET_LABEL[key])}
                  <input type="number" inputMode="decimal" min={OVERRIDE_RANGE.min} max={OVERRIDE_RANGE.max} step="any" value={overrides[key]}
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
          {t.t('goals.adaptiveToggle')}
        </label>

        {errors.form !== undefined && <p role="alert" class="error">{errors.form}</p>}
        <button type="submit" class="primary" disabled={busy}>{t.t('common.save')}</button>
        {/* Always mounted, empty until there is something to confirm: a region created with its text is unreliably announced. */}
        <p role="status" class="muted">{status}</p>
      </form>

      {live ? (
        <section class="goal-panel" aria-label={t.t('goals.yourTargets')}>
          <h3>{t.t('goals.dailyTargets')}</h3>
          <dl>
            <dt>{t.t('goals.bmr')}</dt><dd>{t.n(bmr(draft, live.weightLb, year))} {t.t('unit.kcal')}</dd>
            <dt>{t.t('goals.formulaTdee')}</dt><dd>{t.n(formulaTdee(draft, live.weightLb, year))} {t.t('unit.kcal')}</dd>
            <dt>{t.t('goals.maintenanceUsed')}</dt>
            <dd>{t.n(maintenance(draft, live.weightLb, year))} {t.t('unit.kcal')}{draft.tdeeEstimate !== null && t.t('goals.learned')}</dd>
            <dt class="target">{t.t('nutrient.calories')}</dt><dd class="target">{t.n(live.targets.calories)} {t.t('unit.kcal')}</dd>
            <dt class="target"><Swatch ink="protein" />{t.t('nutrient.protein')}</dt><dd class="target">{t.n(live.targets.protein)} {t.t('unit.g')}</dd>
            <dt class="target"><Swatch ink="carbs" />{t.t('nutrient.carbs')}</dt><dd class="target">{t.n(live.targets.carbs)} {t.t('unit.g')}</dd>
            <dt class="target"><Swatch ink="fat" />{t.t('nutrient.fat')}</dt><dd class="target">{t.n(live.targets.fat)} {t.t('unit.g')}</dd>
          </dl>
        </section>
      ) : (
        <p class="muted">{t.t(firstRun ? 'goals.fillInWeight' : 'goals.fillIn')}</p>
      )}
    </div>
  )
}
