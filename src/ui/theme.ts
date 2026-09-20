import { useEffect, useState } from 'preact/hooks'
import { log } from '../log'
import { isThemeChoice, resolveTheme, THEME_COLOR, THEME_STORAGE_KEY, type Theme, type ThemeChoice } from '../theme'

// One press for the whole app, held in the module rather than in a context: Login renders outside the session
// provider and the switch lives four levels down inside it, and both have to read the same value.
const dark = matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

function readChoice(): ThemeChoice {
  try {
    const stored: unknown = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeChoice(stored)) return stored
  } catch (e) {
    // Private mode and blocked site data both throw on access; the app must still print.
    log.warn('theme.read_failed', { error: String(e) })
  }
  return 'auto'
}

let choice = readChoice()

function apply(): void {
  const theme = resolveTheme(choice, dark.matches)
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === 'night' ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  for (const fn of listeners) fn()
}

export function setThemeChoice(next: ThemeChoice): void {
  choice = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch (e) {
    log.warn('theme.write_failed', { error: String(e) })
  }
  apply()
}

dark.addEventListener('change', apply)
apply()

export function useTheme(): { choice: ThemeChoice; theme: Theme } {
  const [, bump] = useState(0)
  useEffect(() => {
    const on = (): void => { bump((n) => n + 1) }
    listeners.add(on)
    return () => { listeners.delete(on) }
  }, [])
  return { choice, theme: resolveTheme(choice, dark.matches) }
}
