import { useState } from 'preact/hooks'
import type { CustomFood } from '../../db/types'
import { log } from '../../log'
import { NUTRIENT_KEYS, zeroNutrients, type Nutrients } from '../../nutrition'
import { useApp } from '../context'

const FIELDS: Readonly<Record<keyof Nutrients, { label: string; required: boolean }>> = {
  calories: { label: 'Calories (kcal)', required: true },
  protein: { label: 'Protein (g)', required: true },
  carbs: { label: 'Carbs (g)', required: true },
  fat: { label: 'Fat (g)', required: true },
  fiber: { label: 'Fiber (g)', required: false },
  sugar: { label: 'Sugar (g)', required: false },
  sodium: { label: 'Sodium (mg)', required: false },
}
const MAX_NUTRIENT = 10000

export function CustomFoodForm({ onSaved }: { onSaved: (food: CustomFood) => void }) {
  const { store } = useApp()
  const [name, setName] = useState('')
  const [portion, setPortion] = useState('1 serving')
  const [values, setValues] = useState<Record<keyof Nutrients, string>>({ calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Form inputs are a trust boundary: re-check in JS, not only via the native constraints.
  const validate = (): { name: string; portion: string; perServing: Nutrients } | string => {
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 200) return 'Name must be 1–200 characters.'
    const perServing = zeroNutrients()
    for (const k of NUTRIENT_KEYS) {
      const raw = values[k].trim()
      if (raw === '') {
        if (FIELDS[k].required) return `${FIELDS[k].label} is required.`
        continue
      }
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0 || n > MAX_NUTRIENT) return `${FIELDS[k].label} must be between 0 and ${String(MAX_NUTRIENT)}.`
      perServing[k] = n
    }
    return { name: trimmed, portion: portion.trim() === '' ? '1 serving' : portion.trim(), perServing }
  }

  const save = async (): Promise<void> => {
    const result = validate()
    if (typeof result === 'string') { setError(result); return }
    setBusy(true)
    setError(null)
    const food: CustomFood = { id: crypto.randomUUID(), ...result, updatedAt: '', deletedAt: null }
    try {
      await store.put('custom_foods', food)
      onSaved(food)
    } catch (e) {
      log.error('ui.custom_food_put_failed', { error: String(e) })
      setError(`Couldn't save: ${String(e)}`)
      setBusy(false)
    }
  }

  return (
    <form class="custom-food" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
      <label class="field">
        Name
        <input required maxLength={200} value={name} onInput={(ev) => { setName(ev.currentTarget.value) }} />
      </label>
      <label class="field">
        Portion
        <input value={portion} onInput={(ev) => { setPortion(ev.currentTarget.value) }} />
      </label>
      <div class="nutrient-grid">
        {NUTRIENT_KEYS.map((k) => (
          <label key={k} class="field">
            {FIELDS[k].label}
            <input type="number" inputMode="decimal" min={0} max={MAX_NUTRIENT} step="any" required={FIELDS[k].required}
              placeholder={FIELDS[k].required ? '' : '0'} value={values[k]}
              onInput={(ev) => { const v = ev.currentTarget.value; setValues((prev) => ({ ...prev, [k]: v })) }} />
          </label>
        ))}
      </div>
      {error !== null && <p role="alert" class="error">{error}</p>}
      <button type="submit" class="primary" disabled={busy}>Save food</button>
    </form>
  )
}
