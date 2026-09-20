import type { en } from './en'

/**
 * English is the source of truth for the key set: every other locale is typed as `Dictionary`, so a missing key
 * and a misspelt or left-over one are both compile errors rather than a blank or a dead string on screen.
 * Its own file so a locale can import the type without importing every other locale's strings.
 */
export type Key = keyof typeof en
export type Dictionary = Readonly<Record<Key, string>>
