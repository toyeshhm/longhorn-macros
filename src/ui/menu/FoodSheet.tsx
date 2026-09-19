import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { MEALS, type Meal } from '../../db/types'
import { log } from '../../log'
import { NUTRIENT_KEYS, round1, scaleNutrients, type Nutrients } from '../../nutrition'
import type { SearchItem } from '../../search'
import { defaultMealFor, parseServings } from '../../servings'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'

const NUTRIENT_LABELS: Readonly<Record<keyof Nutrients, { label: string; unit: string }>> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  sugar: { label: 'Sugar', unit: 'g' },
  sodium: { label: 'Sodium', unit: 'mg' },
}

function isMeal(v: string): v is Meal {
  return MEALS.some((m) => m === v)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function FoodSheet({ item, legends, onClose, onAdded }: {
  item: SearchItem
  legends: readonly string[]
  onClose: () => void
  onAdded: (meal: Meal) => void
}) {
  const { store, viewDate } = useApp()
  const [text, setText] = useState('1')
  const [meal, setMeal] = useState<Meal>(() => {
    const now = new Date()
    return viewDate === localDateKey(now) ? defaultMealFor(now) : 'lunch'
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const servings = parseServings(text)
  const scaled = scaleNutrients(item.nutrients, servings ?? 0)

  const add = async (): Promise<void> => {
    if (servings === null) return
    setBusy(true)
    setError(null)
    try {
      await store.put('food_log', {
        id: crypto.randomUUID(), date: viewDate, meal, hall: item.hall, station: item.station, name: item.name,
        recipeNumber: item.recipeNumber, customFoodId: item.customFoodId, portion: item.portion, servings,
        perServing: item.nutrients, updatedAt: '', deletedAt: null,
      })
      onAdded(meal)
    } catch (e) {
      log.error('ui.food_log_put_failed', { error: String(e) })
      setError(`Couldn't save: ${String(e)}`)
      setBusy(false)
    }
  }

  const where = [item.hall, item.station].filter((s): s is string => s !== null).join(' · ')
  return (
    <Sheet title={item.name} onClose={onClose}>
      {where !== '' && <p class="muted">{where}</p>}
      <p>Portion: {item.portion}</p>
      <Stepper text={text} onText={setText} />
      <label class="field">
        Meal
        <select value={meal} onChange={(ev) => { const v = ev.currentTarget.value; if (isMeal(v)) setMeal(v) }}>
          {MEALS.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
        </select>
      </label>
      <table class="nutrients">
        <caption>Nutrition{servings !== null && servings !== 1 ? ` for ${String(servings)} servings` : ''}</caption>
        <tbody>
          {NUTRIENT_KEYS.map((k) => (
            <tr key={k}>
              <th scope="row">{NUTRIENT_LABELS[k].label}</th>
              <td>{servings === null ? '—' : `${String(k === 'calories' ? Math.round(scaled[k]) : round1(scaled[k]))} ${NUTRIENT_LABELS[k].unit}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {legends.length > 0 && (
        <ul class="legends" aria-label="Allergens and diet">
          {legends.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
      {error !== null && <p role="alert" class="error">{error}</p>}
      <button type="button" class="primary" disabled={servings === null || busy} onClick={() => { void add() }}>Add</button>
    </Sheet>
  )
}
