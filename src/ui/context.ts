import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { SyncEngine } from '../sync/engine'
import type { LocalStore } from '../sync/store'

export interface AppContextValue {
  store: LocalStore
  engine: SyncEngine
  userId: string
  viewDate: string
  setViewDate: (date: string) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside AppContext.Provider')
  return ctx
}
