import type { Key } from '../../i18n'
import { TabIcon } from '../icons/TabIcons'
import { useT } from '../i18n'

// Health sits in the middle, between logging the day and the weight trend: it is what the log is for.
export const TABS = ['Menu', 'Tracker', 'Health', 'Progress', 'Profile'] as const
export type Tab = (typeof TABS)[number]

/** The tab id is what the app switches on; the word on the button is whatever the reader's language calls it. */
export function tabKey(tab: Tab): Key {
  return `tab.${tab}`
}

export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  const t = useT()
  return (
    <nav aria-label={t.t('tab.nav')} class="tabbar">
      {TABS.map((id) => (
        <button key={id} type="button" aria-current={id === tab ? 'page' : undefined} onClick={() => { onSelect(id) }}>
          <TabIcon tab={id} /><span>{t.t(tabKey(id))}</span>
        </button>
      ))}
    </nav>
  )
}
