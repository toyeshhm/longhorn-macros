export const TABS = ['Menu', 'Today', 'Progress', 'Goals'] as const
export type Tab = (typeof TABS)[number]

export function TabBar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  return (
    <nav aria-label="Main" class="tabbar">
      {TABS.map((t) => (
        <button key={t} type="button" aria-current={t === tab ? 'page' : undefined} onClick={() => { onSelect(t) }}>
          {t}
        </button>
      ))}
    </nav>
  )
}
