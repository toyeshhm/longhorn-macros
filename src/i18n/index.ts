import type { Dictionary, Key } from './dictionary'
import { en } from './en'
import { es } from './es'

export type { Dictionary, Key } from './dictionary'
export { en } from './en'
export { es } from './es'

/**
 * The whole i18n layer: the locales, the lookup, the `{slot}` interpolation, and the number, date and time
 * formatting that has to move with the language as much as the words do. Pure and fully covered; the hook that
 * holds the reader's choice and writes `<html lang>` lives in src/ui/i18n.ts, next to the theme's.
 *
 * `translator(locale)` returns everything a screen needs as one object, because a screen that had to remember to
 * pass the locale to `Intl` separately would sooner or later print a Spanish sentence around an English number.
 */

export const LOCALES = ['en', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_STORAGE_KEY = 'lm-locale'

export function isLocale(v: unknown): v is Locale {
  return LOCALES.some((l) => l === v)
}

const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { en, es }
/**
 * The BCP 47 tag each locale formats with. Spanish is es-ES, not es-US: es-US formats like American English
 * (9/19, 1,234.5), which would leave the numbers and dates unchanged while the words around them moved.
 */
const TAG: Readonly<Record<Locale, string>> = { en: 'en-US', es: 'es-ES' }
/** English prints a 12-hour clock with am/pm, as UT does; Spanish prints the 24-hour clock it actually reads. */
const HOUR12: Readonly<Record<Locale, boolean>> = { en: true, es: false }

export type Params = Readonly<Record<string, string | number>>
/** A `{name}` hole in a template, kept as data so a screen can fill it with a node instead of a string. */
export interface Slot { readonly slot: string }

/**
 * A template split into literal text and its holes, alternating and always starting and ending with text
 * (possibly empty). A `{` with no `}` after it is literal text: a stray brace is not worth losing the rest of
 * the sentence over.
 */
export function parts(template: string): (string | Slot)[] {
  const out: (string | Slot)[] = []
  let rest = template
  for (;;) {
    const open = rest.indexOf('{')
    const close = open < 0 ? -1 : rest.indexOf('}', open)
    if (close < 0) break
    out.push(rest.slice(0, open))
    out.push({ slot: rest.slice(open + 1, close) })
    rest = rest.slice(close + 1)
  }
  out.push(rest)
  return out
}

/** A hole with no value keeps its own `{name}`, so a missing parameter shows up as a bug instead of as a gap. */
export function interpolate(template: string, params: Params): string {
  return parts(template)
    .map((p) => (typeof p === 'string' ? p : String(params[p.slot] ?? `{${p.slot}}`)))
    .join('')
}

export interface T {
  readonly locale: Locale
  /** True where the locale reads a 12-hour clock: the hours feed is minutes past midnight, not a Date. */
  readonly hour12: boolean
  readonly t: (key: Key, params?: Params) => string
  /** The same string as `t`, unfilled and split, for the few lines that set a number in its own element. */
  readonly rich: (key: Key) => (string | Slot)[]
  /** A whole figure with the locale's grouping: 1,234 in English, 1.234 in Spanish. */
  readonly n: (value: number) => string
  /** Up to one decimal, with the locale's decimal mark: 1.5 in English, 1,5 in Spanish. */
  readonly d: (value: number) => string
  readonly date: (at: Date, options: Intl.DateTimeFormatOptions) => string
  readonly rel: (value: number, unit: Intl.RelativeTimeFormatUnit) => string
}

function build(locale: Locale): T {
  const tag = TAG[locale]
  const whole = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 })
  const tenths = new Intl.NumberFormat(tag, { maximumFractionDigits: 1 })
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: 'auto' })
  return {
    locale,
    hour12: HOUR12[locale],
    t: (key, params) => {
      const raw = DICTIONARIES[locale][key]
      return params === undefined ? raw : interpolate(raw, params)
    },
    rich: (key) => parts(DICTIONARIES[locale][key]),
    n: (value) => whole.format(value),
    d: (value) => tenths.format(value),
    date: (at, options) => new Intl.DateTimeFormat(tag, options).format(at),
    rel: (value, unit) => relative.format(value, unit),
  }
}

const TRANSLATORS: Readonly<Record<Locale, T>> = { en: build('en'), es: build('es') }

export function translator(locale: Locale): T {
  return TRANSLATORS[locale]
}
