import type { ComponentChildren } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { useApp } from '../context'
import { useLive } from '../hooks'

export function Banner({ tone, children }: { tone: 'info' | 'error'; children: ComponentChildren }) {
  return <div class={`banner ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function SyncBanner() {
  const { store, engine } = useApp()
  // Push outcomes (acks, backoff) don't emit store changes, so also re-check on connectivity events and a slow tick.
  // ponytail: 3s poll of one small IndexedDB store; switch to an engine event if it ever shows up in a profile.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const bump = (): void => { setTick((t) => t + 1) }
    const timer = setInterval(bump, 3000)
    window.addEventListener('online', bump)
    window.addEventListener('offline', bump)
    return () => {
      clearInterval(timer)
      window.removeEventListener('online', bump)
      window.removeEventListener('offline', bump)
    }
  }, [])
  const s = useLive(async () => {
    const { queued, failed } = await engine.pending()
    const reasons = failed > 0 ? (await store.outbox()).flatMap((i) => (i.failed === null ? [] : [`${i.table}: ${i.failed}`])) : []
    return { queued, failed, reasons, waiting: queued > 0 && (!navigator.onLine || engine.retrying) }
  }, [engine, tick])
  return (
    <>
      {/* Mounted from the first paint and empty while everything is synced: a polite region that appears together
          with its text is unreliably announced (VoiceOver drops it). `.banner:empty` takes no room on the page. */}
      <Banner tone="info">{s?.waiting === true && <>{s.queued} {s.queued === 1 ? 'change' : 'changes'} waiting to sync</>}</Banner>
      {s !== undefined && s.failed > 0 && (
        <Banner tone="error">
          {s.failed} {s.failed === 1 ? 'change was' : 'changes were'} rejected
          <details>
            <summary>Details</summary>
            <ul>{s.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </details>
        </Banner>
      )}
    </>
  )
}
