import { useEffect, useState } from 'preact/hooks'
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, translator, type Locale, type T } from '../i18n'
import { log } from '../log'

// One language for the whole app, held in the module rather than in a context, for the same reason the press is:
// Login renders outside the session provider and the switch lives inside Profile, four levels down, and both
// have to read the same value. The pure half of all this is src/i18n.
const listeners = new Set<() => void>()

function read(): Locale {
  try {
    const stored: unknown = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch (e) {
    // Private mode and blocked site data both throw on access; the app must still print, in English.
    log.warn('locale.read_failed', { error: String(e) })
  }
  return DEFAULT_LOCALE
}

let locale = read()

// The document's own language, so a screen reader switches voice with the app instead of reading Spanish aloud
// in an English one. index.html ships lang="en"; nothing but the empty #app div paints before this runs.
function apply(): void {
  document.documentElement.lang = locale
  for (const fn of listeners) fn()
}

export function setLocale(next: Locale): void {
  locale = next
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
  } catch (e) {
    log.warn('locale.write_failed', { error: String(e) })
  }
  apply()
}

apply()

export function useT(): T {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = (): void => { bump((n) => n + 1) }
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  return translator(locale)
}
