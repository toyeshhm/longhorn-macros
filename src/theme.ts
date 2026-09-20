// Two presses of the same zine: the day run on warm stock, the night run on ink-navy stock.
export const THEME_CHOICES = ['auto', 'light', 'night'] as const
export type ThemeChoice = (typeof THEME_CHOICES)[number]
export type Theme = 'light' | 'night'

/** The <meta name="theme-color"> for each press: the paper stock it is printed on. */
export const THEME_COLOR: Readonly<Record<Theme, string>> = { light: '#F7F3EA', night: '#141A33' }
export const THEME_STORAGE_KEY = 'lm-theme'

export function isThemeChoice(v: unknown): v is ThemeChoice {
  return THEME_CHOICES.some((c) => c === v)
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === 'auto') return prefersDark ? 'night' : 'light'
  return choice
}
