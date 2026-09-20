import { useEffect, useRef, useState } from 'preact/hooks'
import { LOCALES, type Key, type Locale } from '../../i18n'
import { log } from '../../log'
import type { ThemeChoice } from '../../theme'
import { GoalsScreen } from '../goals/GoalsScreen'
import { useProfile } from '../hooks'
import { setLocale, useT } from '../i18n'
import { Chips } from '../menu/MenuScreen'
import { setThemeChoice, useTheme } from '../theme'
import { AccountSection } from './AccountSection'
import { AchievementsSection } from './AchievementsSection'
import { DataSection } from './DataSection'
import { HoursSection } from './HoursSection'

const THEME_OPTIONS: readonly ThemeChoice[] = ['light', 'night', 'auto']
// Each language names itself, in itself: "Español" is what a Spanish reader looks for on an English screen, and
// translating the list would hide the one option a reader who cannot read the current language needs to find.
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', es: 'Español' }

// The six pages of the Profile tab, in the order their stamps are printed. Achievements leads: it is the page
// you open the tab to look at, where the rest are settings you came for on purpose.
const SECTIONS = ['achievements', 'goals', 'account', 'appearance', 'hours', 'data'] as const
type Section = (typeof SECTIONS)[number]
const SECTION_KEY: Readonly<Record<Section, Key>> = {
  achievements: 'profile.achievements', goals: 'profile.goals', account: 'profile.account',
  appearance: 'profile.appearance', hours: 'profile.hours', data: 'profile.data',
}
/** Which page was last open, per device, like the press and the language. */
const SECTION_STORAGE_KEY = 'lm-profile-section'

function isSection(v: unknown): v is Section {
  return SECTIONS.some((s) => s === v)
}

function readSection(): Section | null {
  try {
    const stored: unknown = localStorage.getItem(SECTION_STORAGE_KEY)
    if (isSection(stored)) return stored
  } catch (e) {
    // Private mode and blocked site data both throw on access; the tab must still open somewhere sensible.
    log.warn('profile.section_read_failed', { error: String(e) })
  }
  return null
}

function rememberSection(section: Section): void {
  try {
    localStorage.setItem(SECTION_STORAGE_KEY, section)
  } catch (e) {
    log.warn('profile.section_write_failed', { error: String(e) })
  }
}

/** Arrow keys move along the row and wrap round; Home and End jump to its ends. */
function nextIndex(key: string, from: number): number | null {
  const n = SECTIONS.length
  if (key === 'ArrowRight') return (from + 1) % n
  if (key === 'ArrowLeft') return (from - 1 + n) % n
  if (key === 'Home') return 0
  if (key === 'End') return n - 1
  return null
}

function Appearance() {
  const t = useT()
  const { choice } = useTheme()
  return (
    <>
      <Chips wrap legend={t.t('profile.theme')} name="theme"
        options={THEME_OPTIONS.map((c) => ({ value: c, label: t.t(`theme.${c}`) }))}
        value={choice} onSelect={setThemeChoice} />
      <p class="muted">{t.t('profile.themeNote')}</p>
      {/* The same printed radio stamps as every other chip group: a language switch is not a special control. */}
      <Chips wrap legend={t.t('profile.language')} name="language"
        options={LOCALES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
        value={t.locale} onSelect={setLocale} />
      <p class="muted">{t.t('profile.languageNote')}</p>
    </>
  )
}

function Panel({ section }: { section: Section }) {
  if (section === 'achievements') return <AchievementsSection />
  if (section === 'goals') return <GoalsScreen />
  if (section === 'account') return <AccountSection />
  if (section === 'appearance') return <Appearance />
  if (section === 'hours') return <HoursSection />
  return <DataSection />
}

export function ProfileScreen() {
  const t = useT()
  const profile = useProfile()
  const [chosen, setChosen] = useState<Section | null>(readSection)
  const opened = useRef<Section | null>(null)
  const row = useRef<HTMLDivElement>(null)

  // The row scrolls sideways, and a remembered page sits past its right edge: coming back to the tab (Tracker,
  // then Profile) painted the Data panel under six stamps scrolled to 0 with none of them lit — no "you are here"
  // at all. Every render, not a dependency list: `scrollIntoView` with `nearest` is a no-op once the stamp is in
  // view, and `auto` behaviour needs no reduced-motion case.
  useEffect(() => {
    row.current?.querySelector('[role="tab"][aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' })
  })

  // Which page opens is a decision about the reader's profile, so it waits for the read rather than opening on
  // Achievements for a frame and then jumping to Goals under the thumb.
  if (profile === undefined) return <p class="loading">{t.t('common.loading')}</p>
  // First run has no profile and the app sends the reader here to make one, so Goals is what opens then. Every
  // other arrival opens on Achievements, unless this device was left on another page.
  // Decided once per visit and then held: saving the first profile must not move the page out from under the
  // thumb of someone who is still reading the targets it just worked out.
  opened.current ??= chosen ?? (profile === null ? 'goals' : 'achievements')
  const current: Section = chosen ?? opened.current

  const select = (section: Section): void => {
    setChosen(section)
    rememberSection(section)
  }
  // A real tablist, so the row answers to the keyboard the way every other one does: the selected stamp is the
  // only tab stop, and the arrows move between them rather than the reader tabbing through all six.
  const onKeyDown = (e: KeyboardEvent, from: number): void => {
    const to = nextIndex(e.key, from)
    if (to === null) return
    const section = SECTIONS[to]
    if (section === undefined) return
    e.preventDefault()
    select(section)
    row.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus()
  }

  return (
    <div class="profile">
      <div class="section-nav" role="tablist" aria-label={t.t('profile.sections')} ref={row}>
        {SECTIONS.map((section, i) => (
          // Only the selected panel is rendered, so only the selected stamp may point at one: `aria-controls` on
          // the other five named an id that is not in the document, and "move to controlled element" landed nowhere.
          <button key={section} type="button" role="tab" id={`tab-${section}`}
            aria-controls={section === current ? `panel-${section}` : undefined}
            aria-selected={section === current} tabIndex={section === current ? 0 : -1}
            onKeyDown={(e) => { onKeyDown(e, i) }} onClick={() => { select(section) }}>
            {t.t(SECTION_KEY[section])}
          </button>
        ))}
      </div>
      {/* Focusable only on the one page with nothing to focus. Everywhere else the panel is a form or a button and
          a tab stop on its wrapper costs a keyboard reader a stop that reads the whole page back at them. */}
      <div class="section-panel" role="tabpanel" id={`panel-${current}`} aria-labelledby={`tab-${current}`}
        tabIndex={current === 'achievements' ? 0 : undefined}>
        {/* The page's own heading, for heading navigation: the stamp above already says it on screen. */}
        <h2 class="visually-hidden">{t.t(SECTION_KEY[current])}</h2>
        <Panel section={current} />
      </div>
    </div>
  )
}
