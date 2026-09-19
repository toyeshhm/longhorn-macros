import { useEffect, useState } from 'preact/hooks'
import { localDateKey } from '../dates'
import { log } from '../log'
import { supabase } from '../supabase/client'
import { SyncEngine } from '../sync/engine'
import { LocalStore } from '../sync/store'
import { SyncBanner } from './components/Banner'
import { TabBar, type Tab } from './components/TabBar'
import { AppContext, useApp } from './context'
import { useProfile } from './hooks'
import { Login } from './Login'
import { MenuScreen } from './menu/MenuScreen'
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
  return (
    <AppContext.Provider value={{ ...session, viewDate, setViewDate }}>
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
        <h1>{tab}</h1>
        {tab === 'Menu' && <MenuScreen />}
        {tab === 'Today' && <TodayScreen onGo={setTab} />}
        {tab === 'Goals' && <GoalsPlaceholder firstRun={profile === null} />}
      </main>
      <TabBar tab={tab} onSelect={setTab} />
    </>
  )
}

// ponytail: stand-in until the Goals screen lands (Task 13); carries the first-run notice and logout.
function GoalsPlaceholder({ firstRun }: { firstRun: boolean }) {
  const { userId } = useApp()
  return (
    <>
      {firstRun && <p class="notice">Welcome! Set up your profile and first weigh-in to get daily targets.</p>}
      <button type="button" onClick={() => {
        supabase.auth.signOut().then(
          ({ error }) => { if (error) log.warn('auth.sign_out_failed', { userId, reason: error.message }) },
          (e: unknown) => { log.error('auth.sign_out_failed', { userId, error: String(e) }) },
        )
      }}>Log out</button>
    </>
  )
}
