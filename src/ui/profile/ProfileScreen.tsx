import type { ComponentChildren } from 'preact'
import { LOCALES, type Locale } from '../../i18n'
import type { ThemeChoice } from '../../theme'
import { GoalsScreen } from '../goals/GoalsScreen'
import { setLocale, useT } from '../i18n'
import { Chips } from '../menu/MenuScreen'
import { setThemeChoice, useTheme } from '../theme'
import { AccountSection } from './AccountSection'
import { DataSection } from './DataSection'
import { HoursSection } from './HoursSection'

const THEME_OPTIONS: readonly ThemeChoice[] = ['light', 'night', 'auto']
// Each language names itself, in itself: "Español" is what a Spanish reader looks for on an English screen, and
// translating the list would hide the one option a reader who cannot read the current language needs to find.
const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', es: 'Español' }

// Each section is a folded page: the heading stays in the accessibility tree either way, and only the one you
// came for is unfolded, so the screen is never one run of unlabelled fields.
function Section({ title, open, children }: { title: string; open: boolean; children: ComponentChildren }) {
  return (
    <details class="profile-section" open={open}>
      <summary><h2>{title}</h2></summary>
      <div class="section-body">{children}</div>
    </details>
  )
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

export function ProfileScreen() {
  const t = useT()
  return (
    <div class="profile">
      <Section title={t.t('profile.goals')} open><GoalsScreen /></Section>
      <Section title={t.t('profile.account')} open={false}><AccountSection /></Section>
      <Section title={t.t('profile.appearance')} open={false}><Appearance /></Section>
      <Section title={t.t('profile.hours')} open={false}><HoursSection /></Section>
      <Section title={t.t('profile.data')} open={false}><DataSection /></Section>
    </div>
  )
}
