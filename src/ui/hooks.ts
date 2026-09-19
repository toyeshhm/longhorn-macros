import { useEffect, useState } from 'preact/hooks'
import type { ProfileRow, WeightEntry } from '../db/types'
import { computeTargets, type Targets } from '../goals'
import { log } from '../log'
import { loadMenu, type MenuState } from '../menu/cache'
import type { LocalStore } from '../sync/store'
import { useApp } from './context'

// Runs `query` now and after every store write; stale results from a superseded run are dropped.
export function useLive<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const { store } = useApp()
  const [value, setValue] = useState<T | undefined>(undefined)
  useEffect(() => {
    let alive = true
    let run = 0
    const refresh = (): void => {
      const mine = ++run
      query().then(
        (v) => { if (alive && mine === run) setValue(v) },
        (e: unknown) => { log.error('ui.live_query_failed', { error: String(e) }) },
      )
    }
    refresh()
    const off = store.onChange(refresh)
    return () => { alive = false; off() }
  }, [store, ...deps])
  return value
}

// ponytail: one feed fetch per store per page load, shared by every useMenu caller. Add a refresh when the app stays open across days.
const menuLoads = new WeakMap<LocalStore, Promise<MenuState>>()
const LOADING: MenuState = { menu: null, stale: false, error: null, cachedAt: null }

export function useMenu(): MenuState & { retry: () => void } {
  const { store } = useApp()
  const [state, setState] = useState<MenuState>(LOADING)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    let load = menuLoads.get(store)
    if (!load) {
      load = loadMenu(store, fetch)
      menuLoads.set(store, load)
    }
    load.then(
      (s) => { if (alive) setState(s) },
      (e: unknown) => { log.error('ui.menu_load_failed', { error: String(e) }) },
    )
    return () => { alive = false }
  }, [store, attempt])
  const retry = (): void => {
    menuLoads.delete(store)
    setState(LOADING)
    setAttempt((a) => a + 1)
  }
  return { ...state, retry }
}

export function useProfile(): ProfileRow | null | undefined {
  const { store, userId } = useApp()
  return useLive(async () => (await store.get('profile', userId)) ?? null, [userId])
}

export function useLatestWeight(): WeightEntry | null | undefined {
  const { store } = useApp()
  return useLive(async () => {
    const weights = await store.all('weights')
    return weights.reduce<WeightEntry | null>((latest, w) => (latest === null || w.date > latest.date ? w : latest), null)
  }, [])
}

export function useTargets(): Targets | null {
  const profile = useProfile()
  const weight = useLatestWeight()
  if (!profile || !weight) return null
  return computeTargets(profile, weight.weightLb, new Date().getFullYear())
}
