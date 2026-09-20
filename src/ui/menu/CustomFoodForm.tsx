import { useState } from 'preact/hooks'
import type { CustomFood } from '../../db/types'
import type { Key } from '../../i18n'
import { log } from '../../log'
import { NUTRIENT_KEYS, zeroNutrients, type Nutrients } from '../../nutrition'
import { useApp } from '../context'
import { useT } from '../i18n'

const FIELDS: Readonly<Record<keyof Nutrients, { label: Key; required: boolean }>> = {
  calories: { label: 'field.calories', required: true },
  protein: { label: 'field.protein', required: true },
  carbs: { label: 'field.carbs', required: true },
  fat: { label: 'field.fat', required: true },
  fiber: { label: 'field.fiber', required: false },
  sugar: { label: 'field.sugar', required: false },
  sodium: { label: 'field.sodium', required: false },
}
const MAX_NUTRIENT = 10000

// Which field the message belongs to, so it can be shown and announced at that input rather than as one form-level blob.
type Field = 'name' | keyof Nutrients
interface Invalid { field: Field | 'form'; message: string }

export function CustomFoodForm({ onSaved }: { onSaved: (food: CustomFood) => void }) {
  const t = useT()
  const { store } = useApp()
  const [name, setName] = useState('')
  const [portion, setPortion] = useState(t.t('custom.defaultPortion'))
  const [values, setValues] = useState<Record<keyof Nutrients, string>>({ calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' })
  const [error, setError] = useState<Invalid | null>(null)
  const [busy, setBusy] = useState(false)

  // Form inputs are a trust boundary: re-check in JS, not only via the native constraints.
  const validate = (): { name: string; portion: string; perServing: Nutrients } | Invalid => {
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 200) return { field: 'name', message: t.t('custom.nameInvalid') }
    const perServing = zeroNutrients()
    for (const k of NUTRIENT_KEYS) {
      const raw = values[k].trim()
      const field = t.t(FIELDS[k].label)
      if (raw === '') {
        if (FIELDS[k].required) return { field: k, message: t.t('custom.required', { field }) }
        continue
      }
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0 || n > MAX_NUTRIENT) return { field: k, message: t.t('custom.range', { field, max: MAX_NUTRIENT }) }
      perServing[k] = n
    }
    return { name: trimmed, portion: portion.trim() === '' ? t.t('custom.defaultPortion') : portion.trim(), perServing }
  }

  const save = async (): Promise<void> => {
    const result = validate()
    if ('field' in result) { setError(result); return }
    setBusy(true)
    setError(null)
    const food: CustomFood = { id: crypto.randomUUID(), ...result, updatedAt: '', deletedAt: null }
    try {
      await store.put('custom_foods', food)
      onSaved(food)
    } catch (e) {
      log.error('ui.custom_food_put_failed', { error: String(e) })
      setError({ field: 'form', message: t.t('common.saveFailed', { error: String(e) }) })
      setBusy(false)
    }
  }

  // The message lives with its field: aria-describedby ties it to the input, role=alert reads it out when it appears.
  const bad = (f: Field): boolean => error?.field === f
  const msg = (f: Field) => (bad(f) ? <p id={`cf-err-${f}`} role="alert" class="error">{error?.message}</p> : null)

  return (
    <form class="custom-food" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
      <label class="field">
        {t.t('custom.name')}
        <input required maxLength={200} value={name} aria-invalid={bad('name')} aria-describedby={bad('name') ? 'cf-err-name' : undefined}
          onInput={(ev) => { setName(ev.currentTarget.value) }} />
      </label>
      {msg('name')}
      <label class="field">
        {t.t('custom.portionLabel')}
        <input value={portion} onInput={(ev) => { setPortion(ev.currentTarget.value) }} />
      </label>
      <div class="nutrient-grid">
        {NUTRIENT_KEYS.map((k) => (
          <div key={k}>
            <label class="field">
              {t.t(FIELDS[k].label)}
              <input type="number" inputMode="decimal" min={0} max={MAX_NUTRIENT} step="any" required={FIELDS[k].required}
                placeholder={FIELDS[k].required ? '' : '0'} value={values[k]}
                aria-invalid={bad(k)} aria-describedby={bad(k) ? `cf-err-${k}` : undefined}
                onInput={(ev) => { const v = ev.currentTarget.value; setValues((prev) => ({ ...prev, [k]: v })) }} />
            </label>
            {msg(k)}
          </div>
        ))}
      </div>
      {error?.field === 'form' && <p role="alert" class="error">{error.message}</p>}
      <button type="submit" class="primary" disabled={busy}>{t.t('custom.saveFood')}</button>
    </form>
  )
}
