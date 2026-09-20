// The presses. Each one is a different two-ink run on different stock, not a hue-rotate of the day press: it
// names its own paper, its own two drums, its own four macro inks, its own grain and its own off-register plate.
//
// `--blue` and `--orange` are **plate names, not colour names**. `--blue` is the first drum (all linework, hand
// strokes and the protein plate); `--orange` is the second drum (the overprint, the calories ink, every offset
// plate). On the cherry press the second drum is fluorescent pink and on the blueprint it is chalk; the token is
// still called `--orange` because every component rule in the stylesheet is written once against the plate, and
// renaming 60 call sites buys nothing a comment does not. See DESIGN.md §2.
import { markVars } from './ink'

export const PRESS_IDS = ['day', 'night', 'cherry', 'newsprint', 'blueprint', 'meadow'] as const
export type PressId = (typeof PRESS_IDS)[number]
export type Scheme = 'light' | 'dark'

/** A press defines the whole token set. Adding a field here is a compile error in every press until it is inked. */
export interface Press {
  readonly scheme: Scheme
  /** Stock. `paper` is also the <meta name="theme-color"> and the colour behind the grain. */
  readonly paper: string
  readonly paperRaised: string
  readonly paperShade: string
  /** First drum: linework, hand strokes, the solid protein plate. */
  readonly blue: string
  readonly ink: string
  readonly inkDeep: string
  readonly inkSoft: string
  /** Second drum: the overprint, every offset plate, the calories ink. */
  readonly orange: string
  /** Carbs. */
  readonly teal: string
  /** Fat, always with a first-drum outline, which is what carries it on a pale stock. */
  readonly mustard: string
  readonly over: string
  /** The ink wash behind a sheet. */
  readonly wash: string
  /** The grain: speck colour, opacity over its own stock, tile size, and turbulence frequency (lower is coarser). */
  readonly speck: string
  readonly grainStrength: number
  readonly grainTile: number
  readonly grainFreq: number
  /** A drafting grid instead of turbulence. Blueprint stock only. */
  readonly grid: boolean
  /** Multiplies every hand-ruled stroke: newsprint runs coarser rules than a smooth stock does. */
  readonly ruleWeight: number
}

export const PRESSES: Readonly<Record<PressId, Press>> = {
  // Federal blue and burnt orange on warm stock. The original run.
  day: {
    scheme: 'light', paper: '#F7F3EA', paperRaised: '#FBF9F3', paperShade: '#EDE7DA',
    blue: '#2B4C9B', ink: '#1E3470', inkDeep: '#0F1A40', inkSoft: '#4E5780',
    orange: '#BF5700', teal: '#00838A', mustard: '#E0A800', over: '#9A3412',
    wash: 'rgb(30 52 112 / 0.35)', speck: '#8C806B', grainStrength: 0.4, grainTile: 220, grainFreq: 0.9,
    grid: false, ruleWeight: 1,
  },
  // Cream and orange inks on ink-navy stock. Same plates, different stock: never an inversion of the day press.
  night: {
    scheme: 'dark', paper: '#141A33', paperRaised: '#1E2647', paperShade: '#0D1226',
    blue: '#8AA6EE', ink: '#EFE8D8', inkDeep: '#FFFDF6', inkSoft: '#9AA3C6',
    orange: '#FF9147', teal: '#46CFC6', mustard: '#F5CE5A', over: '#FF8878',
    wash: 'rgb(4 7 18 / 0.66)', speck: '#DBD6C7', grainStrength: 0.1, grainTile: 220, grainFreq: 0.9,
    grid: false, ruleWeight: 1,
  },
  // The classic riso pairing: fluorescent pink over federal blue on bright white, barely any grain.
  cherry: {
    scheme: 'light', paper: '#FCFBFD', paperRaised: '#FFFFFF', paperShade: '#F1EDF5',
    blue: '#2B4C9B', ink: '#1E3470', inkDeep: '#0E1A3F', inkSoft: '#4B5480',
    orange: '#DB0068', teal: '#00767E', mustard: '#C89200', over: '#A32A08',
    wash: 'rgb(43 76 155 / 0.34)', speck: '#9E92A8', grainStrength: 0.3, grainTile: 220, grainFreq: 0.9,
    grid: false, ruleWeight: 1,
  },
  // A newspaper run: graphite and a muted red on tan stock, heavy coarse grain and thicker rules.
  newsprint: {
    scheme: 'light', paper: '#E6DCC4', paperRaised: '#EFE7D4', paperShade: '#DCD1B7',
    blue: '#4A453C', ink: '#1F1C17', inkDeep: '#0F0D0A', inkSoft: '#4C4535',
    orange: '#A52E1E', teal: '#10585A', mustard: '#9A7415', over: '#7A1008',
    wash: 'rgb(31 28 23 / 0.45)', speck: '#5A5140', grainStrength: 0.55, grainTile: 260, grainFreq: 0.45,
    grid: false, ruleWeight: 1.35,
  },
  // Drafting paper: chalk and cyan on deep navy. Its "grain" is a ruled grid, not turbulence.
  blueprint: {
    scheme: 'dark', paper: '#0B2039', paperRaised: '#14304F', paperShade: '#061729',
    blue: '#5FC9EA', ink: '#E4EDF4', inkDeep: '#FFFFFF', inkSoft: '#A3BACE',
    orange: '#F7EFDC', teal: '#63E0B4', mustard: '#EBB94F', over: '#FF8A7A',
    wash: 'rgb(3 10 22 / 0.68)', speck: '#BFD6E8', grainStrength: 0.12, grainTile: 44, grainFreq: 0.9,
    grid: true, ruleWeight: 1,
  },
  // Deep green and ochre on pale sage.
  meadow: {
    scheme: 'light', paper: '#E7EDE0', paperRaised: '#F2F6EC', paperShade: '#D8E0CE',
    blue: '#1F5B3A', ink: '#1E3324', inkDeep: '#0D1B11', inkSoft: '#4B5A4B',
    orange: '#A0651B', teal: '#17697E', mustard: '#D9A800', over: '#8E2718',
    wash: 'rgb(31 91 58 / 0.4)', speck: '#7E8A72', grainStrength: 0.35, grainTile: 220, grainFreq: 0.9,
    grid: false, ruleWeight: 1,
  },
}

export const LIGHT_PRESS_IDS: readonly PressId[] = PRESS_IDS.filter((id) => PRESSES[id].scheme === 'light')
export const DARK_PRESS_IDS: readonly PressId[] = PRESS_IDS.filter((id) => PRESSES[id].scheme === 'dark')

/** "Match phone" plus one entry per press: what the Appearance picker offers. */
export const PRESS_CHOICES = ['auto', ...PRESS_IDS] as const
export type PressChoice = (typeof PRESS_CHOICES)[number]

/**
 * Kept per device. `choice` is the press the reader picked, or "auto"; `light` and `dark` are which press "auto"
 * runs for each of the phone's two settings.
 */
export interface PressPrefs {
  readonly choice: PressChoice
  readonly light: PressId
  readonly dark: PressId
}

export const PRESS_STORAGE_KEY = 'lm-press'
export const DEFAULT_PREFS: PressPrefs = { choice: 'auto', light: 'day', dark: 'night' }

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((a) => a === v) ?? fallback
}

/**
 * Three fields in one value, pipe separated, because the boot script has to read it before any bundle parses and
 * a hand-written JSON parse there is more failure surface than "choice|light|dark" is worth. Anything unreadable
 * — a junk field, a press that has been retired, a value from an older build — falls back per field.
 */
export function parsePrefs(raw: string | null): PressPrefs {
  const [choice, light, dark] = (raw ?? '').split('|')
  return {
    choice: pick(choice, PRESS_CHOICES, DEFAULT_PREFS.choice),
    light: pick(light, LIGHT_PRESS_IDS, DEFAULT_PREFS.light),
    dark: pick(dark, DARK_PRESS_IDS, DEFAULT_PREFS.dark),
  }
}

export function formatPrefs(prefs: PressPrefs): string {
  return `${prefs.choice}|${prefs.light}|${prefs.dark}`
}

export function resolvePress(prefs: PressPrefs, prefersDark: boolean): PressId {
  if (prefs.choice !== 'auto') return prefs.choice
  return prefersDark ? prefs.dark : prefs.light
}

function rgb(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `${String((n >> 16) & 255)} ${String((n >> 8) & 255)} ${String(n & 255)}`
}

/**
 * Every custom property a press sets, marks included. The component rules in the stylesheet are written once
 * against these and no press re-states one of them.
 */
export function pressVars(id: PressId): Readonly<Record<string, string>> {
  const p = PRESSES[id]
  const dark = p.scheme === 'dark'
  return {
    '--paper': p.paper,
    '--paper-raised': p.paperRaised,
    '--paper-shade': p.paperShade,
    '--blue': p.blue,
    '--ink': p.ink,
    '--ink-deep': p.inkDeep,
    '--ink-soft': p.inkSoft,
    '--orange': p.orange,
    '--teal': p.teal,
    '--mustard': p.mustard,
    '--over': p.over,
    '--wash': p.wash,
    '--orange-rgb': rgb(p.orange),
    '--paper-rgb': rgb(p.paper),
    // The second drum multiplies onto light stock and screens onto dark: ink on dark paper lightens what it
    // lands on. An alpha plate mixes toward the stock instead, so on dark stock it is lifted by --plate-k or the
    // same ink that brightens as a solid prints muddy as a plate.
    '--blend': dark ? 'screen' : 'multiply',
    '--plate-k': dark ? '1.7' : '1',
    '--grain-strength': String(p.grainStrength),
    // The sheet's paper veil, so its grain equals the page layer's on any press.
    '--veil': String(1 - p.grainStrength),
    ...markVars(p),
  }
}
