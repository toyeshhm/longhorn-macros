import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { MEALS, type Meal } from '../../db/types'
import { log } from '../../log'
import { scaleNutrients } from '../../nutrition'
import type { SearchItem } from '../../search'
import { defaultMealFor, formatServings, parseServings } from '../../servings'
import { NutrientTable } from '../components/NutrientTable'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'
import { useT } from '../i18n'

export function isMeal(v: string): v is Meal {
  return MEALS.some((m) => m === v)
}

export function MealSelect({ meal, onMeal }: { meal: Meal; onMeal: (m: Meal) => void }) {
  const t = useT()
  return (
    <label class="field">
      {t.t('common.meal')}
      <select value={meal} onChange={(ev) => { const v = ev.currentTarget.value; if (isMeal(v)) onMeal(v) }}>
        {MEALS.map((m) => <option key={m} value={m}>{t.t(`meal.${m}`)}</option>)}
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
  const t = useT()
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
      setError(t.t('common.saveFailed', { error: String(e) }))
      setBusy(false)
    }
  }

  const where = [item.hall, item.station].filter((s): s is string => s !== null).join(' · ')
  return (
    <Sheet title={item.name} onClose={onClose} footer={
      <button type="button" class="primary" disabled={servings === null || busy} onClick={() => { void add() }}>{t.t('common.add')}</button>
    }>
      <div class="sheet-meta">
        {where !== '' && <p>{where}</p>}
        <p class="portion">{t.t('food.portion', { portion: item.portion })}</p>
      </div>
      <div class="sheet-controls">
        <Stepper text={text} onText={setText} />
        <MealSelect meal={meal} onMeal={setMeal} />
      </div>
      {/* The same label as the entry sheet, second column and all: past one serving the Menu printed the scaled
          totals with no way to see the per-serving figures, while the same food opened from the Tracker showed both. */}
      <NutrientTable
        caption={servings !== null && servings !== 1
          ? t.t('food.nutritionFor', { servings: formatServings(servings) })
          : t.t('food.nutrition')}
        columns={servings === 1
          ? [{ head: null, values: item.nutrients }]
          : [
            { head: t.t('entry.total'), values: servings === null ? null : scaled },
            { head: t.t('entry.perServing'), values: item.nutrients },
          ]} />
      {/* UT's own legends, printed as UT publishes them: these are its labels, not the app's words. */}
      {legends.length > 0 && (
        <ul class="legends" role="list" aria-label={t.t('food.legends')}>
          {legends.map((l) => <li key={l}>{l}</li>)}
        </ul>
      )}
      {error !== null && <p role="alert" class="error">{error}</p>}
    </Sheet>
  )
}
