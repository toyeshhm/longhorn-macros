import { useEffect, useState } from 'preact/hooks'
import { undoAdaptive } from '../adaptiveRun'
import { localDateKey } from '../dates'
import { log } from '../log'
import { supabase } from '../supabase/client'
import { SyncEngine } from '../sync/engine'
import { LocalStore } from '../sync/store'
import { SyncBanner } from './components/Banner'
import { TabBar, type Tab } from './components/TabBar'
import { AppContext } from './context'
import { AdaptiveCard, runAdaptive, type AdaptiveUpdate } from './goals/AdaptiveCard'
import { GoalsScreen } from './goals/GoalsScreen'
import { useProfile } from './hooks'
import { Login } from './Login'
import { MenuScreen } from './menu/MenuScreen'
import { ProgressScreen } from './progress/ProgressScreen'
import { TodayScreen } from './today/TodayScreen'

interface Session { store: LocalStore; engine: SyncEngine; userId: string }

export function App() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined) // undefined = auth not resolved yet
  const [session, setSession] = useState<Session | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) log.warn('auth.get_session_failed', { reason: error.message })
        setUserId(data.session?.user.id ?? null)
      },
      (e: unknown) => { log.error('auth.get_session_failed', { error: String(e) }); setUserId(null) },
    )
    // SIGNED_OUT (logout or expired refresh) only drops the session; the user's LocalStore and outbox stay on disk.
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      log.info('auth.state', { event })
      setUserId(s?.user.id ?? null)
    })
    return () => { data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let engine: SyncEngine | undefined
    LocalStore.open(`lm-${userId}`).then(
      (store) => {
        if (cancelled) return
        engine = new SyncEngine(store, supabase, userId)
        engine.start()
        setSession({ store, engine, userId })
      },
      (e: unknown) => {
        log.error('store.open_failed', { error: String(e) })
        setOpenError(String(e))
      },
    )
    return () => {
      cancelled = true
      engine?.stop()
      setSession(null)
    }
  }, [userId])

  if (userId === null) return <Login />
  if (openError !== null) return <p role="alert" class="fatal">Could not open local storage: {openError}</p>
  if (userId === undefined || session === null) return <p class="loading">Loading…</p>
  return <Shell session={session} />
}

function Shell({ session }: { session: Session }) {
  const [viewDate, setViewDate] = useState(() => localDateKey(new Date()))
  const [adaptive, setAdaptive] = useState<AdaptiveUpdate | null>(null)
  const { store, engine, userId } = session

  // Adaptive TDEE runner: once per open (per signed-in session).
  useEffect(() => {
    let alive = true
    runAdaptive(store, engine, userId, localDateKey(new Date())).then(
      (u) => { if (alive) setAdaptive(u) },
      (e: unknown) => { log.error('adaptive.run_failed', { userId, error: String(e) }) },
    )
    return () => { alive = false }
  }, [store, engine, userId])

  const undo = async (): Promise<void> => {
    setAdaptive(null)
    const p = await store.get('profile', userId)
    if (p) await store.put('profile', undoAdaptive(p))
  }

  return (
    <AppContext.Provider value={{ ...session, viewDate, setViewDate }}>
      {adaptive && (
        <AdaptiveCard update={adaptive} onDismiss={() => { setAdaptive(null) }} onUndo={() => {
          undo().then(undefined, (e: unknown) => { log.error('adaptive.undo_failed', { userId, error: String(e) }) })
        }} />
      )}
      <Tabs />
    </AppContext.Provider>
  )
}

function Tabs() {
  const profile = useProfile()
  const [tab, setTab] = useState<Tab>('Menu')
  // First run (no profile yet) lands on Goals. A profile arriving by pull later just hides the notice.
  useEffect(() => { if (profile === null) setTab('Goals') }, [profile === null])
  return (
    <>
      <SyncBanner />
      <main class="screen">
        {/* Today's date header doubles as its title, so the tab name is only announced. */}
        <h1 class={tab === 'Today' ? 'visually-hidden' : undefined}>{tab}</h1>
        {tab === 'Menu' && <MenuScreen />}
        {tab === 'Today' && <TodayScreen onGo={setTab} />}
        {tab === 'Progress' && <ProgressScreen />}
        {tab === 'Goals' && <GoalsScreen onGo={setTab} />}
      </main>
      <TabBar tab={tab} onSelect={setTab} />
    </>
  )
}
