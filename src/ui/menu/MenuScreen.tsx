import { useEffect, useMemo, useState } from 'preact/hooks'
import { daysBetween, localDateKey } from '../../dates'
import { summarizeDay } from '../../daySummary'
import type { LogEntry } from '../../db/types'
import { log } from '../../log'
import type { HallId } from '../../menu/feed'
import { currentMeal, groupByStation, HALLS } from '../../menu/select'
import { round1 } from '../../nutrition'
import { buildIndex, fromCustomFood, fromMenuItem, recentItems, searchItems, type SearchItem } from '../../search'
import { Banner } from '../components/Banner'
import { Sheet } from '../components/Sheet'
import { Toast, type ToastMessage } from '../components/Toast'
import { useApp } from '../context'
import { useLive, useMenu, useTargets } from '../hooks'
import { CustomFoodForm } from './CustomFoodForm'
import { FoodSheet } from './FoodSheet'

// Row hint shows diet legends only; allergens are listed in the sheet.
const DIET_HINTS: ReadonlyMap<string, string> = new Map([['Vegan', 'Vegan'], ['Vegetarian', 'Vegetarian'], ['Halal Friendly', 'Halal']])
const RECENT_LIMIT = 4

function dayLabel(key: string, today: string, format: Intl.DateTimeFormatOptions): string {
  const offset = daysBetween(today, key)
  if (offset === 0) return 'Today'
  if (offset === 1) return 'Tomorrow'
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, format)
}

// Feed `last_cached` is "YYYY-MM-DD HH:MM:SS" in Austin local time, which is also the user's zone.
function savedAgo(cachedAt: string, now: Date): string {
  const t = new Date(cachedAt.replace(' ', 'T')).getTime()
  if (!Number.isFinite(t)) return `at ${cachedAt}`
  const minutes = Math.round((now.getTime() - t) / 60_000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  if (Math.abs(minutes) < 48 * 60) return rtf.format(-Math.round(minutes / 60), 'hour')
  return rtf.format(-Math.round(minutes / 1440), 'day')
}

export function Chips<T extends string>({ legend, name, options, value, onSelect }: {
  legend: string; name: string; options: readonly { value: T; label: string }[]; value: T | null; onSelect: (v: T) => void
}) {
  return (
    <fieldset class="chips" role="radiogroup">
      <legend class="visually-hidden">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} class="chip">
          <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => { onSelect(o.value) }} />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

function FoodRow({ item, badge, hints, onOpen }: { item: SearchItem; badge: string | null; hints: readonly string[]; onOpen: () => void }) {
  return (
    <li>
      <button type="button" class="food-row" onClick={onOpen}>
        <span class="food-name">{item.name}</span>
        <span class="food-kcal">{Math.round(item.nutrients.calories)} kcal</span>
        <span class="food-meta">
          <span>{round1(item.nutrients.protein)} g protein</span>
          {hints.map((h) => <span key={h} class="tag">{h}</span>)}
          {badge !== null && <span class="badge">{badge}</span>}
        </span>
      </button>
    </li>
  )
}

function dietHints(legends: readonly string[]): string[] {
  return legends.flatMap((l) => { const h = DIET_HINTS.get(l); return h === undefined ? [] : [h] })
}

// Menu items not served today name their day, so nobody logs Tuesday's special on Monday.
function sourceBadge(item: SearchItem, today: string): string {
  if (item.source === 'custom') return 'Custom'
  if (item.logged) return 'Logged before'
  const hall = item.hall ?? 'Menu'
  return item.servedOn === null || item.servedOn === today ? hall : `${hall} · ${dayLabel(item.servedOn, today, { weekday: 'short' })}`
}

export function MenuScreen() {
  const { store, viewDate } = useApp()
  const { menu, stale, error, cachedAt, retry } = useMenu()
  const dayEntries = useLive(() => store.logForDate(viewDate), [viewDate])
  const targets = useTargets()
  const history = useLive(() => store.all('food_log'), [])
  const customFoods = useLive(() => store.all('custom_foods'), [])
  const [hall, setHall] = useState<HallId>('J2')
  const [day, setDay] = useState<string | null>(null)
  const [meal, setMeal] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<{ kind: 'food'; item: SearchItem } | { kind: 'custom' } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    store.getMeta('lastHall').then(
      (v) => { const found = HALLS.find((h) => h.id === v); if (found) setHall(found.id) },
      (e: unknown) => { log.error('ui.last_hall_read_failed', { error: String(e) }) },
    )
  }, [store])

  const now = new Date()
  const today = localDateKey(now)
  const index = useMemo(
    () => buildIndex({ menu, history: history ?? [], customFoods: customFoods ?? [], today }),
    [menu, history, customFoods, today],
  )
  const recent = useMemo(() => recentItems(history ?? [], RECENT_LIMIT), [history])
  const legendsByRecipe = useMemo(() => {
    const map = new Map<string, readonly string[]>()
    for (const halls of Object.values(menu?.days ?? {})) {
      for (const h of halls) for (const m of h.meals) for (const i of m.items) map.set(i.recipeNumber, i.legends)
    }
    return map
  }, [menu])

  const selectHall = (id: HallId): void => {
    setHall(id)
    store.setMeta('lastHall', id).then(undefined, (e: unknown) => { log.error('ui.last_hall_write_failed', { error: String(e) }) })
  }

  const dates = menu?.dates ?? []
  const activeDay = day !== null && dates.includes(day) ? day : dates.includes(today) ? today : (dates[0] ?? null)
  const hallMenu = activeDay === null ? undefined : menu?.days[activeDay]?.find((h) => h.hall === hall)
  const meals = (hallMenu?.meals ?? []).filter((m) => m.items.length > 0)
  const mealNames = meals.map((m) => m.name)
  const activeMeal = meal !== null && mealNames.includes(meal) ? meal : currentMeal(mealNames, now)
  const stations = groupByStation(meals.find((m) => m.name === activeMeal)?.items ?? [])
  const results = query.trim() === '' ? null : searchItems(index, query, today)
  const open = (item: SearchItem): void => { setSheet({ kind: 'food', item }) }
  const close = (): void => { setSheet(null) }
  const hintsFor = (i: SearchItem): string[] => dietHints(i.recipeNumber === null ? [] : legendsByRecipe.get(i.recipeNumber) ?? [])

  // The confirmation carries the number the user logs for, and an Undo for a mis-tap.
  const added = (entry: LogEntry): void => {
    setSheet(null)
    const day = summarizeDay([...(dayEntries ?? []).filter((e) => e.id !== entry.id), entry], targets ?? null)
    const left = day.remaining && Math.round(day.remaining.calories)
    const tail = left === null ? '' : left < 0 ? ` · ${String(-left)} kcal over` : ` · ${String(left)} kcal left`
    setToast({
      text: `Added to ${entry.meal}${tail}`,
      onUndo: () => {
        setToast(null)
        store.remove('food_log', entry.id).then(undefined, (e: unknown) => {
          log.error('ui.food_log_undo_failed', { id: entry.id, error: String(e) })
          setToast({ text: `Couldn't undo: ${String(e)}`, onUndo: null })
        })
      },
    })
  }

  return (
    <div class="menu">
      <div class="menu-tools">
        <input type="search" enterKeyHint="search" class="search" aria-label="Search foods"
          placeholder="Search foods" value={query}
          onInput={(ev) => { setQuery(ev.currentTarget.value) }} />
        <button type="button" class="link" onClick={() => { setSheet({ kind: 'custom' }) }}>Add custom food</button>
      </div>

      {stale && cachedAt !== null && (
        <Banner tone="info">Couldn't reach UT Dining. Showing the menu saved {savedAgo(cachedAt, now)}.</Banner>
      )}
      {menu === null && error !== null && (
        <Banner tone="error">
          Couldn't load UT menu <button type="button" onClick={retry}>Retry</button>
        </Banner>
      )}

      {results !== null ? (
        results.length === 0 ? <p class="empty">No matches for “{query.trim()}”.</p> : (
          <ul class="food-list" aria-label="Search results">
            {results.map((r) => (
              <FoodRow key={r.key} item={r} badge={sourceBadge(r, today)} hints={hintsFor(r)} onOpen={() => { open(r) }} />
            ))}
          </ul>
        )
      ) : (
        <>
          {recent.length > 0 && (
            <section class="recent" aria-labelledby="recent-title">
              <h2 id="recent-title">Logged recently</h2>
              <ul class="food-list">
                {recent.map((r) => <FoodRow key={r.key} item={r} badge={null} hints={hintsFor(r)} onOpen={() => { open(r) }} />)}
              </ul>
            </section>
          )}
          {menu === null ? (
            error === null && <p class="loading">Loading menu…</p>
          ) : (
            <>
              <div class="menu-filters">
                <Chips legend="Hall" name="hall" options={HALLS.map((h) => ({ value: h.id, label: h.label }))} value={hall} onSelect={selectHall} />
                <div class="menu-when">
                  <label>
                    <span class="visually-hidden">Day</span>
                    <select value={activeDay ?? ''} onChange={(ev) => { setDay(ev.currentTarget.value) }}>
                      {dates.map((d) => <option key={d} value={d}>{dayLabel(d, today, { weekday: 'short', month: 'short', day: 'numeric' })}</option>)}
                    </select>
                  </label>
                  {mealNames.length > 0 && (
                    <label>
                      <span class="visually-hidden">Meal</span>
                      <select value={activeMeal ?? ''} onChange={(ev) => { setMeal(ev.currentTarget.value) }}>
                        {mealNames.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {stations.length === 0 && <p class="empty">No menu posted for this hall and day.</p>}
              {stations.map((s) => (
                <section key={s.station} class="station">
                  <h2>{s.station}</h2>
                  <ul class="food-list">
                    {s.items.map((i, n) => {
                      const item = fromMenuItem(i, hall, activeDay ?? today)
                      return <FoodRow key={`${i.recipeNumber}-${String(n)}`} item={item} badge={null} hints={dietHints(i.legends)} onOpen={() => { open(item) }} />
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </>
      )}

      {sheet?.kind === 'custom' && (
        <Sheet key="custom" title="Custom food" onClose={close}>
          <CustomFoodForm onSaved={(food) => { open(fromCustomFood(food)) }} />
        </Sheet>
      )}
      {sheet?.kind === 'food' && (
        <FoodSheet key={sheet.item.key} item={sheet.item}
          legends={sheet.item.recipeNumber === null ? [] : legendsByRecipe.get(sheet.item.recipeNumber) ?? []}
          onClose={close} onAdded={added} />
      )}
      <Toast toast={toast} onDone={() => { setToast(null) }} />
    </div>
  )
}
