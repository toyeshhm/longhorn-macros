import { useEffect, useState } from 'preact/hooks'
import { log } from '../log'
import {
  formatPrefs, parsePrefs, PRESS_STORAGE_KEY, PRESSES, pressVars, resolvePress,
  type PressId, type PressPrefs,
} from '../theme'

// One press for the whole app, held in the module rather than in a context: Login renders outside the session
// provider and the picker lives four levels down inside it, and both have to read the same value.
const dark = matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function read(): PressPrefs {
  try {
    return parsePrefs(localStorage.getItem(PRESS_STORAGE_KEY))
  } catch (e) {
    // Private mode and blocked site data both throw on access; the app must still print.
    log.warn('theme.read_failed', { error: String(e) })
    return parsePrefs(null)
  }
}

let prefs = read()

function apply(): void {
  const press = resolvePress(prefs, dark.matches)
  const root = document.documentElement
  root.dataset.theme = press
  root.style.colorScheme = PRESSES[press].scheme
  // Every token the press owns, marks included, written where nothing in the stylesheet can outrank it. The
  // stylesheet holds the shapes; a press holds the inks, and no component rule is re-stated per press.
  for (const [name, value] of Object.entries(pressVars(press))) root.style.setProperty(name, value)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PRESSES[press].paper)
  for (const fn of listeners) fn()
}

export function setPressPrefs(next: PressPrefs): void {
  prefs = next
  try {
    localStorage.setItem(PRESS_STORAGE_KEY, formatPrefs(next))
  } catch (e) {
    log.warn('theme.write_failed', { error: String(e) })
  }
  apply()
}

dark.addEventListener('change', apply)
apply()

export function usePress(): { prefs: PressPrefs; press: PressId } {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = (): void => { bump((n) => n + 1) }
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  return { prefs, press: resolvePress(prefs, dark.matches) }
}
