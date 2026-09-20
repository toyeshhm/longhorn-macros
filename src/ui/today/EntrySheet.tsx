import { useState } from 'preact/hooks'
import type { LogEntry, Meal } from '../../db/types'
import type { Key } from '../../i18n'
import { log } from '../../log'
import { scaleNutrients } from '../../nutrition'
import { formatServings, parseServings } from '../../servings'
import { NutrientTable } from '../components/NutrientTable'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'
import { useT } from '../i18n'
import { MealSelect } from '../menu/FoodSheet'

export function EntrySheet({ entry, onClose, onDeleted }: { entry: LogEntry; onClose: () => void; onDeleted: (entry: LogEntry) => void }) {
  const t = useT()
  const { store } = useApp()
  const [text, setText] = useState(formatServings(entry.servings))
  const [meal, setMeal] = useState<Meal>(entry.meal)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const servings = parseServings(text)

  const run = async (what: string, failed: Key, action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      log.error(`ui.food_log_${what}_failed`, { id: entry.id, error: String(e) })
      setError(t.t(failed, { error: String(e) }))
      setBusy(false)
    }
  }
  const save = (): Promise<void> => run('save', 'common.saveFailed', async () => {
    if (servings === null) return
    await store.put('food_log', { ...entry, servings, meal })
    onClose()
  })
  const remove = (): Promise<void> => run('delete', 'entry.deleteFailed', async () => {
    await store.remove('food_log', entry.id)
    onDeleted(entry)
  })

  const where = [entry.hall, entry.station].filter((s): s is string => s !== null).join(' · ')
  const source = entry.customFoodId !== null
    ? t.t('food.custom')
    : entry.recipeNumber !== null ? t.t('food.menuItem', { recipe: entry.recipeNumber }) : null
  // ponytail: rows carry no createdAt, only updatedAt — so this is the last edit, and the copy says exactly that
  // rather than implying it is when the food was eaten. A created_at column is the only thing that would answer that.
  const savedAt = entry.updatedAt === '' ? null : t.date(new Date(entry.updatedAt), { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Sheet title={entry.name} onClose={onClose} footer={
      <>
        <button type="button" class="primary" disabled={servings === null || busy} onClick={() => { void save() }}>{t.t('common.save')}</button>
        <button type="button" class="danger" disabled={busy} onClick={() => { void remove() }}>{t.t('common.delete')}</button>
      </>
    }>
      {where !== '' && <p class="where">{where}</p>}
      {source !== null && <p class="where">{source}</p>}
      <p class="portion">{t.t('food.portion', { portion: entry.portion })}</p>
      <Stepper text={text} onText={setText} />
      <MealSelect meal={meal} onMeal={setMeal} />
      <NutrientTable
        caption={t.t(servings === 1 ? 'entry.nutritionFor.one' : 'entry.nutritionFor.other',
          { servings: servings === null ? '—' : formatServings(servings) })}
        columns={[
          { head: t.t('entry.total'), values: servings === null ? null : scaleNutrients(entry.perServing, servings) },
          { head: t.t('entry.perServing'), values: entry.perServing },
        ]} />
      <p class="note">
        {savedAt === null ? t.t('entry.note') : t.t('entry.noteEdited', { when: savedAt })}
      </p>
      {error !== null && <p role="alert" class="error">{error}</p>}
    </Sheet>
  )
}
