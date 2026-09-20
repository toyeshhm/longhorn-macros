import { useState } from 'preact/hooks'
import type { LogEntry, Meal } from '../../db/types'
import { log } from '../../log'
import { scaleNutrients } from '../../nutrition'
import { formatServings, parseServings } from '../../servings'
import { NutrientTable } from '../components/NutrientTable'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'
import { MealSelect } from '../menu/FoodSheet'

export function EntrySheet({ entry, onClose, onDeleted }: { entry: LogEntry; onClose: () => void; onDeleted: (entry: LogEntry) => void }) {
  const { store } = useApp()
  const [text, setText] = useState(formatServings(entry.servings))
  const [meal, setMeal] = useState<Meal>(entry.meal)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const servings = parseServings(text)

  const run = async (what: string, action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      log.error(`ui.food_log_${what}_failed`, { id: entry.id, error: String(e) })
      setError(`Couldn't ${what}: ${String(e)}`)
      setBusy(false)
    }
  }
  const save = (): Promise<void> => run('save', async () => {
    if (servings === null) return
    await store.put('food_log', { ...entry, servings, meal })
    onClose()
  })
  const remove = (): Promise<void> => run('delete', async () => {
    await store.remove('food_log', entry.id)
    onDeleted(entry)
  })

  const where = [entry.hall, entry.station].filter((s): s is string => s !== null).join(' · ')
  const source = entry.customFoodId !== null ? 'Custom food' : entry.recipeNumber !== null ? `Menu item · recipe ${entry.recipeNumber}` : null
  // ponytail: rows carry no createdAt, only updatedAt — so this is the last edit, and the copy says exactly that
  // rather than implying it is when the food was eaten. A created_at column is the only thing that would answer that.
  const savedAt = entry.updatedAt === '' ? null : new Date(entry.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Sheet title={entry.name} onClose={onClose} footer={
      <>
        <button type="button" class="primary" disabled={servings === null || busy} onClick={() => { void save() }}>Save</button>
        <button type="button" class="danger" disabled={busy} onClick={() => { void remove() }}>Delete</button>
      </>
    }>
      {where !== '' && <p class="where">{where}</p>}
      {source !== null && <p class="where">{source}</p>}
      <p class="portion">Portion: {entry.portion}</p>
      <Stepper text={text} onText={setText} />
      <MealSelect meal={meal} onMeal={setMeal} />
      <NutrientTable
        caption={`Nutrition for ${servings === null ? '—' : formatServings(servings)} ${servings === 1 ? 'serving' : 'servings'}`}
        columns={[
          { head: 'Total', values: servings === null ? null : scaleNutrients(entry.perServing, servings) },
          { head: 'Per serving', values: entry.perServing },
        ]} />
      <p class="note">
        These are the numbers saved with this entry{savedAt === null ? '' : `, last edited ${savedAt}`}, not today's menu — the dining hall's figures may have changed since.
      </p>
      {error !== null && <p role="alert" class="error">{error}</p>}
    </Sheet>
  )
}
