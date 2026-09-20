import { TabIcon } from '../icons/TabIcons'

// Health sits in the middle, between logging the day and the weight trend: it is what the log is for.
export const TABS = ['Menu', 'Tracker', 'Health', 'Progress', 'Profile'] as const
export type Tab = (typeof TABS)[number]

export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  return (
    <nav aria-label="Main" class="tabbar">
      {TABS.map((t) => (
        <button key={t} type="button" aria-current={t === tab ? 'page' : undefined} onClick={() => { onSelect(t) }}>
          <TabIcon tab={t} /><span>{t}</span>
        </button>
      ))}
    </nav>
  )
}
