import { useState } from 'preact/hooks'
import type { LogEntry } from '../../db/types'
import { log } from '../../log'
import { parseServings } from '../../servings'
import { Sheet } from '../components/Sheet'
import { Stepper } from '../components/Stepper'
import { useApp } from '../context'

export function EntrySheet({ entry, onClose, onDeleted }: { entry: LogEntry; onClose: () => void; onDeleted: (entry: LogEntry) => void }) {
  const { store } = useApp()
  const [text, setText] = useState(String(entry.servings))
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
    await store.put('food_log', { ...entry, servings })
    onClose()
  })
  const remove = (): Promise<void> => run('delete', async () => {
    await store.remove('food_log', entry.id)
    onDeleted(entry)
  })

  return (
    <Sheet title={entry.name} onClose={onClose}>
      <p class="sheet-sub">Serving size {entry.portion}</p>
      <div class="sheet-controls">
        <Stepper text={text} onText={setText} />
        <p class="entry-kcal"><strong>{servings === null ? '–' : Math.round(entry.perServing.calories * servings)}</strong> kcal</p>
      </div>
      {error !== null && <p role="alert" class="error">{error}</p>}
      <div class="actions">
        <button type="button" class="danger" disabled={busy} onClick={() => { void remove() }}>Delete entry</button>
        <button type="button" class="primary" disabled={servings === null || busy} onClick={() => { void save() }}>Save changes</button>
      </div>
    </Sheet>
  )
}
