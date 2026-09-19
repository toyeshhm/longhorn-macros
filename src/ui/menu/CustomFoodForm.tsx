import { useEffect, useRef, useState } from 'preact/hooks'
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

type FieldKey = 'name' | keyof Nutrients

export function CustomFoodForm({ onSaved }: { onSaved: (food: CustomFood) => void }) {
  const { store } = useApp()
  const formRef = useRef<HTMLFormElement>(null)
  const [name, setName] = useState('')
  const [portion, setPortion] = useState('1 serving')
  const [values, setValues] = useState<Record<keyof Nutrients, string>>({ calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' })
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // After a failed save, focus the first invalid field so its message is announced and on screen.
  useEffect(() => { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus() }, [errors])

  // Form inputs are a trust boundary: re-check in JS, not only via the native constraints. Every field is checked at once.
  const validate = (): { name: string; portion: string; perServing: Nutrients } | Partial<Record<FieldKey, string>> => {
    const found: Partial<Record<FieldKey, string>> = {}
    const trimmed = name.trim()
    if (trimmed === '') found.name = 'Name is required.'
    else if (trimmed.length > 200) found.name = 'Name must be 200 characters or fewer.'
    const perServing = zeroNutrients()
    for (const k of NUTRIENT_KEYS) {
      const raw = values[k].trim()
      if (raw === '') {
        if (FIELDS[k].required) found[k] = `${FIELDS[k].label} is required.`
        continue
      }
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0 || n > MAX_NUTRIENT) found[k] = `${FIELDS[k].label} must be between 0 and ${String(MAX_NUTRIENT)}.`
      else perServing[k] = n
    }
    if (Object.keys(found).length > 0) return found
    return { name: trimmed, portion: portion.trim() === '' ? '1 serving' : portion.trim(), perServing }
  }

  const save = async (): Promise<void> => {
    const result = validate()
    if (!('perServing' in result)) { setErrors(result); return }
    setErrors({})
    setBusy(true)
    setSaveError(null)
    const food: CustomFood = { id: crypto.randomUUID(), ...result, updatedAt: '', deletedAt: null }
    try {
      await store.put('custom_foods', food)
      onSaved(food)
    } catch (e) {
      log.error('ui.custom_food_put_failed', { error: String(e) })
      setSaveError(`Couldn't save: ${String(e)}`)
      setBusy(false)
    }
  }

  const err = (k: FieldKey) => {
    const m = errors[k]
    return m === undefined ? null : <p id={`custom-err-${k}`} class="error">{m}</p>
  }
  const invalid = (k: FieldKey) => ({ 'aria-invalid': errors[k] !== undefined, 'aria-describedby': errors[k] === undefined ? undefined : `custom-err-${k}` })

  return (
    <form ref={formRef} class="custom-food" noValidate onSubmit={(ev) => { ev.preventDefault(); void save() }}>
      <div class="field-wrap">
        <label class="field">
          Name
          <input required maxLength={200} value={name} {...invalid('name')} onInput={(ev) => { setName(ev.currentTarget.value) }} />
        </label>
        {err('name')}
      </div>
      <label class="field">
        Portion
        <input value={portion} onInput={(ev) => { setPortion(ev.currentTarget.value) }} />
      </label>
      <div class="nutrient-grid">
        {NUTRIENT_KEYS.map((k) => (
          <div key={k} class="field-wrap">
            <label class="field">
              <span>{FIELDS[k].label}{!FIELDS[k].required && <span class="optional"> optional</span>}</span>
              <input type="number" inputMode="decimal" min={0} max={MAX_NUTRIENT} step="any" required={FIELDS[k].required}
                value={values[k]} {...invalid(k)}
                onInput={(ev) => { const v = ev.currentTarget.value; setValues((prev) => ({ ...prev, [k]: v })) }} />
            </label>
            {err(k)}
          </div>
        ))}
      </div>
      {saveError !== null && <p role="alert" class="error">{saveError}</p>}
      <button type="submit" class="primary" disabled={busy}>Save food</button>
    </form>
  )
}
