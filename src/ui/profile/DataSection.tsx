import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { log } from '../../log'
import { useApp } from '../context'
import { useLive } from '../hooks'

// The status line is read out verbatim, right under a sync line that already pluralises: "1 logged foods" was audible.
const count = (n: number, thing: string): string => `${String(n)} ${thing}${n === 1 ? '' : 's'}`

export function DataSection() {
  const { store, engine, userId } = useApp()
  const [status, setStatus] = useState<string | null>(null)
  const pending = useLive(() => engine.pending(), [engine])

  const exportAll = async (): Promise<void> => {
    const [foodLog, weights, customFoods, profile] = await Promise.all([
      store.all('food_log'), store.all('weights'), store.all('custom_foods'), store.get('profile', userId),
    ])
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), profile: profile ?? null, foodLog, weights, customFoods }, null, 2)
    const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `longhorn-macros-${localDateKey(new Date())}.json`
    a.click()
    // Revoked a tick later: revoking in the same task cancels the download in Chromium.
    setTimeout(() => { URL.revokeObjectURL(url) }, 0)
    setStatus(`Exported ${count(foodLog.length, 'logged food')}, ${count(weights.length, 'weigh-in')} and ${count(customFoods.length, 'custom food')}.`)
  }

  return (
    <>
      <p class="muted">Everything on this device: your profile, every logged food, every weigh-in and every custom
        food, as one JSON file.</p>
      <button type="button" onClick={() => {
        exportAll().then(undefined, (e: unknown) => { log.error('ui.export_failed', { userId, error: String(e) }); setStatus(`Couldn't export: ${String(e)}`) })
      }}>Export my log</button>
      {/* Mounted empty from the first paint: a region that arrives with its text is unreliably announced. */}
      <p role="status" class="muted">{status}</p>

      <h3>Sync</h3>
      <p class="sync-counts">
        {pending === undefined ? 'Checking…' : (
          <>
            <strong>{pending.queued}</strong> {pending.queued === 1 ? 'change' : 'changes'} waiting to sync,{' '}
            <strong>{pending.failed}</strong> rejected
          </>
        )}
      </p>
    </>
  )
}
