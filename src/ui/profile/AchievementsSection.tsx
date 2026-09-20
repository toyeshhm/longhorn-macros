import { achievements } from '../../achievements'
import { localDateKey } from '../../dates'
import { useApp } from '../context'
import { useLive, useProfile } from '../hooks'
import { useT } from '../i18n'
import { BadgeMark } from '../icons/Badges'

// The panel prints what src/achievements.ts works out and judges nothing itself. Earned stamps print in full ink
// and say the date they were earned; the rest sit as unprinted outlines with their honest progress under them,
// which is what a brand-new account is: sixteen stamps waiting, not sixteen failures.
export function AchievementsSection() {
  const t = useT()
  const { store } = useApp()
  const entries = useLive(() => store.all('food_log'), [])
  const weights = useLive(() => store.all('weights'), [])
  const profile = useProfile()

  // Until the log has been read, "nothing earned yet" would be a lie rather than an empty sheet.
  if (entries === undefined || weights === undefined || profile === undefined) {
    return <p class="loading">{t.t('common.loading')}</p>
  }
  const { summary, badges } = achievements({ entries, weights, profile, today: localDateKey(new Date()), t })
  return (
    <>
      <p class="badge-count">{summary}</p>
      <p class="muted">{t.t('badge.note')}</p>
      <ul class="badge-grid" role="list">
        {badges.map((b) => (
          // Earned is never ink alone: the state line under every stamp says the date or the count in words.
          <li key={b.id} class={b.earned ? 'badge-card' : 'badge-card unearned'}>
            <BadgeMark id={b.id} />
            <p class="badge-title">{b.title}</p>
            <p class="badge-desc">{b.description}</p>
            <p class="badge-state">{b.earned ? b.earnedLabel : b.progressLabel}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
