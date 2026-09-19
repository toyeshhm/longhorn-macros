import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { MEALS, type Meal } from '../../db/types'
import { log } from '../../log'
import { scaleNutrients } from '../../nutrition'
import type { SearchItem } from '../../search'
import { defaultMealFor, parseServings } from '../../servings'
import { NutrientTable } from '../components/NutrientTable'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'

export function isMeal(v: string): v is Meal {
  return MEALS.some((m) => m === v)
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function MealSelect({ meal, onMeal }: { meal: Meal; onMeal: (m: Meal) => void }) {
  return (
    <label class="field">
      Meal
      <select value={meal} onChange={(ev) => { const v = ev.currentTarget.value; if (isMeal(v)) onMeal(v) }}>
        {MEALS.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
      </select>
    </label>
  )
}

export function FoodSheet({ item, legends, menuMeal, onClose, onAdded }: {
  item: SearchItem
  legends: readonly string[]
  menuMeal: string | null // the Meal chip being browsed on Menu; wins over the clock when it names a log meal
  onClose: () => void
  onAdded: (meal: Meal) => void
}) {
  const { store, viewDate } = useApp()
  const [text, setText] = useState('1')
  const [meal, setMeal] = useState<Meal>(() => {
    const chip = menuMeal?.toLowerCase() ?? ''
    if (isMeal(chip)) return chip
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
      {where !== '' && <p class="where">{where}</p>}
      <p class="portion">Portion: {item.portion}</p>
      <Stepper text={text} onText={setText} />
      <MealSelect meal={meal} onMeal={setMeal} />
      <NutrientTable
        caption={`Nutrition${servings !== null && servings !== 1 ? ` for ${String(servings)} servings` : ''}`}
        columns={[{ head: null, values: servings === null ? null : scaled }]} />
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
