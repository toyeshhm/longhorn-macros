import type { ComponentChildren } from 'preact'
import { setThemeChoice, useTheme } from '../theme'
import type { ThemeChoice } from '../../theme'
import { GoalsScreen } from '../goals/GoalsScreen'
import { Chips } from '../menu/MenuScreen'
import { AccountSection } from './AccountSection'
import { DataSection } from './DataSection'
import { HoursSection } from './HoursSection'

const THEME_OPTIONS: readonly { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'night', label: 'Night' },
  { value: 'auto', label: 'Match phone' },
]

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
  const { choice } = useTheme()
  return (
    <>
      <Chips legend="Theme" name="theme" options={THEME_OPTIONS} value={choice} onSelect={setThemeChoice} />
      <p class="muted">Night is a second press of the same zine, not an inverted one. Match phone follows your
        device's light or dark setting. The choice is kept on this device only.</p>
    </>
  )
}

export function ProfileScreen() {
  return (
    <div class="profile">
      <Section title="Goals" open><GoalsScreen /></Section>
      <Section title="Account" open={false}><AccountSection /></Section>
      <Section title="Appearance" open={false}><Appearance /></Section>
      <Section title="Dining hours" open={false}><HoursSection /></Section>
      <Section title="Data" open={false}><DataSection /></Section>
    </div>
  )
}
