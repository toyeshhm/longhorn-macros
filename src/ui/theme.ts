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
  // One manifest per press, built from the same table (vite.config.ts): the OS reads the manifest's own colours
  // when the app is installed and paints the standalone splash from them, long before this document exists, so a
  // single manifest meant every reader got a cream flash ahead of a navy app.
  document.querySelector('link[rel="manifest"]')?.setAttribute('href', `/manifest-${press}.webmanifest`)
  for (const fn of listeners) fn()
}

/**
 * One field at a time, merged onto what is stored right now rather than onto this tab's copy: two open tabs each
 * held their own snapshot, so picking a press in one wrote back the whole triple and silently discarded the
 * light/dark pair the other had just set.
 */
export function setPressPrefs(patch: Partial<PressPrefs>): void {
  prefs = { ...read(), ...patch }
  try {
    localStorage.setItem(PRESS_STORAGE_KEY, formatPrefs(prefs))
  } catch (e) {
    log.warn('theme.write_failed', { error: String(e) })
  }
  apply()
}

dark.addEventListener('change', apply)
// Another tab of the same app changed the press: this one repaints rather than printing a stale run until reload.
window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== PRESS_STORAGE_KEY) return
  prefs = read()
  apply()
})
apply()

export function usePress(): { prefs: PressPrefs; press: PressId; auto: PressId } {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = (): void => { bump((n) => n + 1) }
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  return {
    prefs,
    press: resolvePress(prefs, dark.matches),
    // What Match phone is running right now, whether or not it is the choice: its stamp prints that press.
    auto: resolvePress({ ...prefs, choice: 'auto' }, dark.matches),
  }
}
