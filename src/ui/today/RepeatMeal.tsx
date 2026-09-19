import { useState } from 'preact/hooks'
import { addDays } from '../../dates'
import { copyMeal } from '../../daySummary'
import { MEALS, type Meal } from '../../db/types'
import { log } from '../../log'
import { defaultMealFor } from '../../servings'
import { Sheet } from '../components/Sheet'
import { useApp } from '../context'
import { useLive } from '../hooks'
import { capitalize, isMeal } from '../menu/FoodSheet'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

// Copies one meal from a past date onto the viewed day.
export function RepeatMeal({ onClose, onAdded }: { onClose: () => void; onAdded: (count: number) => void }) {
  const { store, viewDate } = useApp()
  const [date, setDate] = useState(() => addDays(viewDate, -1))
  const [meal, setMeal] = useState<Meal>(() => defaultMealFor(new Date()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // <input type="date"> yields '' while incomplete; only a full key is queried.
  const source = useLive(async () => (DATE_KEY.test(date) ? (await store.logForDate(date)).filter((e) => e.meal === meal) : []), [date, meal])
  const items = source ?? []

  const add = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const copies = copyMeal(items, viewDate, () => new Date().toISOString())
      for (const c of copies) await store.put('food_log', c)
      onAdded(copies.length)
    } catch (e) {
      log.error('ui.repeat_meal_failed', { from: date, to: viewDate, error: String(e) })
      setError(`Couldn't copy: ${String(e)}`)
      setBusy(false)
    }
  }

  return (
    <Sheet title="Repeat a past meal" onClose={onClose}>
      <label class="field">
        From date
        <input type="date" value={date} onInput={(ev) => { setDate(ev.currentTarget.value) }} />
      </label>
      <label class="field">
        Meal
        <select value={meal} onChange={(ev) => { const v = ev.currentTarget.value; if (isMeal(v)) setMeal(v) }}>
          {MEALS.map((m) => <option key={m} value={m}>{capitalize(m)}</option>)}
        </select>
      </label>
      {items.length === 0 ? <p class="muted">Nothing logged for that meal.</p> : (
        <ul class="copy-list" aria-label="Items to copy">
          {items.map((e) => <li key={e.id}>{e.name} · {e.servings} × {e.portion}</li>)}
        </ul>
      )}
      {error !== null && <p role="alert" class="error">{error}</p>}
      <button type="button" class="primary" disabled={items.length === 0 || busy} onClick={() => { void add() }}>
        Add {items.length} {items.length === 1 ? 'item' : 'items'}
      </button>
    </Sheet>
  )
}
