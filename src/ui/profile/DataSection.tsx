import { useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import type { Key, T } from '../../i18n'
import { log } from '../../log'
import { Rich } from '../components/Rich'
import { useApp } from '../context'
import { useLive } from '../hooks'
import { useT } from '../i18n'

// The status line is read out verbatim, right under a sync line that already pluralises: "1 logged foods" was audible.
const count = (n: number, one: Key, other: Key, t: T): string => t.t(n === 1 ? one : other, { count: t.n(n) })

export function DataSection() {
  const t = useT()
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
    setStatus(t.t('data.exported', {
      foods: count(foodLog.length, 'data.loggedFoods.one', 'data.loggedFoods.other', t),
      weights: count(weights.length, 'data.weighIns.one', 'data.weighIns.other', t),
      customs: count(customFoods.length, 'data.customFoods.one', 'data.customFoods.other', t),
    }))
  }

  return (
    <>
      <p class="muted">{t.t('data.intro')}</p>
      <button type="button" onClick={() => {
        exportAll().then(undefined, (e: unknown) => { log.error('ui.export_failed', { userId, error: String(e) }); setStatus(t.t('data.exportFailed', { error: String(e) })) })
      }}>{t.t('data.export')}</button>
      {/* Mounted empty from the first paint: a region that arrives with its text is unreliably announced. */}
      <p role="status" class="muted">{status}</p>

      <h3>{t.t('data.sync')}</h3>
      <p class="sync-counts">
        {pending === undefined ? t.t('data.checking') : (
          <Rich line="data.counts" slots={{
            queued: <strong>{t.n(pending.queued)}</strong>,
            queuedWord: t.t(pending.queued === 1 ? 'data.change.one' : 'data.change.other'),
            failed: <strong>{t.n(pending.failed)}</strong>,
          }} />
        )}
      </p>
    </>
  )
}
