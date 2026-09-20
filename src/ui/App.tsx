import { useEffect, useRef, useState } from 'preact/hooks'
import { undoAdaptive } from '../adaptiveRun'
import { localDateKey } from '../dates'
import { log } from '../log'
import { supabase } from '../supabase/client'
import { SyncEngine } from '../sync/engine'
import { LocalStore } from '../sync/store'
import { SyncBanner } from './components/Banner'
import { TabBar, tabKey, type Tab } from './components/TabBar'
import { AppContext } from './context'
import { AdaptiveCard, runAdaptive, type AdaptiveUpdate } from './goals/AdaptiveCard'
import { useProfile } from './hooks'
import { useT } from './i18n'
import { Login } from './Login'
import { HealthScreen } from './health/HealthScreen'
import { MenuScreen } from './menu/MenuScreen'
import { ProfileScreen } from './profile/ProfileScreen'
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
  if (openError !== null) return <OpenError error={openError} />
  if (userId === undefined || session === null) return <Loading />
  return <Shell session={session} />
}

function OpenError({ error }: { error: string }) {
  const t = useT()
  return <p role="alert" class="fatal">{t.t('app.storageFailed', { error })}</p>
}

function Loading() {
  const t = useT()
  return <p class="loading">{t.t('common.loading')}</p>
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
      {/* The slot, not the card, is the live region: it is mounted from the first paint, so the target change is
          announced when the card arrives. A region that appears with its text already in it often is not. */}
      <div role="status">
        {adaptive && (
          <AdaptiveCard update={adaptive} onDismiss={() => { setAdaptive(null) }} onUndo={() => {
            undo().then(undefined, (e: unknown) => { log.error('adaptive.undo_failed', { userId, error: String(e) }) })
          }} />
        )}
      </div>
      <Tabs />
    </AppContext.Provider>
  )
}

function Tabs() {
  const t = useT()
  const profile = useProfile()
  const [tab, setTab] = useState<Tab>('Menu')
  const screen = useRef<HTMLElement>(null)
  // First run (no profile yet) lands on Profile, whose Goals section is the one that is unfolded.
  // A profile arriving by pull later just hides the notice.
  useEffect(() => { if (profile === null) setTab('Profile') }, [profile === null])
  // A link inside a screen that switches tabs unmounts the control that had focus, and nothing claims it back, so
  // focus lands on <body> and a screen-reader user is dropped at the top of the document without being told the
  // screen changed. Sheet.tsx re-claims focus to main.screen for exactly this reason; doing it here covers every
  // in-page tab link at once (Health → Profile, Tracker → Profile, Tracker → Menu) instead of each call site.
  // The tab bar's own buttons keep their focus and go through setTab directly.
  const go = (next: Tab): void => { setTab(next); screen.current?.focus() }
  return (
    <>
      <SyncBanner />
      {/* tabindex=-1: somewhere for focus to land when the element that had it is removed (deleting a logged food). */}
      <main class="screen" tabIndex={-1} ref={screen}>
        {/* Tracker leads with its date line; its title stays for screen readers only. */}
        <h1 class={tab === 'Tracker' ? 'visually-hidden' : 'masthead'}>{t.t(tabKey(tab))}</h1>
        {tab === 'Menu' && <MenuScreen />}
        {tab === 'Tracker' && <TodayScreen onGo={go} />}
        {tab === 'Health' && <HealthScreen onGo={go} />}
        {tab === 'Progress' && <ProgressScreen />}
        {tab === 'Profile' && <ProfileScreen />}
      </main>
      <TabBar tab={tab} onSelect={setTab} />
    </>
  )
}
