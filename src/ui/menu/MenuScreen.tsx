import { useEffect, useMemo, useState } from 'preact/hooks'
import { dateLabel, daysBetween, localDateKey } from '../../dates'
import type { T } from '../../i18n'
import { log } from '../../log'
import type { HallId } from '../../menu/feed'
import { hoursLine, UNKNOWN_HOURS } from '../../menu/hours'
import { currentMeal, groupByStation, HALLS, legendsByRecipe } from '../../menu/select'
import { buildIndex, fromCustomFood, fromMenuItem, searchItems, type SearchItem } from '../../search'
import { Banner } from '../components/Banner'
import { Sheet } from '../components/Sheet'
import { useApp } from '../context'
import { useT } from '../i18n'
import { UtensilsDoodle } from '../icons/Doodles'
import { PlusMark, Swatch } from '../icons/Marks'
import { useHours, useLive, useMenu, useNow } from '../hooks'
import { CustomFoodForm } from './CustomFoodForm'
import { FoodSheet } from './FoodSheet'

// Row hint shows diet legends only; allergens are listed in the sheet.
const DIET_HINTS: ReadonlyMap<string, string> = new Map([['Vegan', 'Vegan'], ['Vegetarian', 'Vegetarian'], ['Halal Friendly', 'Halal']])
const TOAST_MS = 3000

// Feed `last_cached` is "YYYY-MM-DD HH:MM:SS" in Austin local time, which is also the user's zone.
function savedAgo(cachedAt: string, now: Date, t: T): string {
  const at = new Date(cachedAt.replace(' ', 'T')).getTime()
  if (!Number.isFinite(at)) return t.t('menu.savedAt', { when: cachedAt })
  const minutes = Math.round((now.getTime() - at) / 60_000)
  if (Math.abs(minutes) < 60) return t.rel(-minutes, 'minute')
  if (Math.abs(minutes) < 48 * 60) return t.rel(-Math.round(minutes / 60), 'hour')
  return t.rel(-Math.round(minutes / 1440), 'day')
}

// `sub` stacks a smaller second line under the label (the day chips' weekday); `spoken`, when given, is the whole
// accessible name, so a chip can print "9/19" and still say "Saturday, September 19".
export interface ChipOption<T extends string> { value: T; label: string; sub?: string; spoken?: string }

export function Chips<T extends string>({ legend, name, options, value, onSelect }: {
  legend: string; name: string; options: readonly ChipOption<T>[]; value: T | null; onSelect: (v: T) => void
}) {
  // Named on the fieldset, not by a hidden <legend>: Chromium exposed the legend both as the group's name and as a
  // text node inside it, so browse mode read every group's name out twice.
  return (
    <fieldset class="chips" role="radiogroup" aria-label={legend}>
      {options.map((o) => (
        <label key={o.value} class={o.sub === undefined ? 'chip' : 'chip chip-stack'}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} aria-label={o.spoken}
            onChange={() => { onSelect(o.value) }} />
          {/* A plain chip keeps its bare text node: wrapping it in a span puts the invisible input over the click
              target, and a click aimed at the span is then reported as intercepted. */}
          {o.sub === undefined ? o.label : <><span>{o.label}</span><span class="chip-sub">{o.sub}</span></>}
        </label>
      ))}
    </fieldset>
  )
}

function FoodRow({ item, badge, hints, onOpen }: { item: SearchItem; badge: string | null; hints: readonly string[]; onOpen: () => void }) {
  const t = useT()
  return (
    <li>
      <button type="button" class="food-row" onClick={onOpen}>
        <span class="food-name">{item.name}</span>
        <span class="food-meta">
          <span class="meta-kcal">{t.n(item.nutrients.calories)} {t.t('unit.kcal')}</span>
          <span class="meta-protein"><Swatch ink="protein" />{t.t('menu.rowProtein', { grams: t.d(item.nutrients.protein) })}</span>
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

// A hall's own name is UT's, so it is printed as UT writes it; the two app-made badges are translated.
function sourceBadge(item: SearchItem, t: T): string {
  if (item.source === 'custom') return t.t('food.badgeCustom')
  if (item.source === 'history') return t.t('food.badgeHistory')
  return item.hall ?? t.t('food.badgeMenu')
}

export function MenuScreen() {
  const t = useT()
  const { store } = useApp()
  const { menu, stale, error, cachedAt, retry } = useMenu()
  const { hours, error: hoursError } = useHours()
  const history = useLive(() => store.all('food_log'), [])
  const customFoods = useLive(() => store.all('custom_foods'), [])
  const [hall, setHall] = useState<HallId>('J2')
  const [day, setDay] = useState<string | null>(null)
  const [meal, setMeal] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<{ kind: 'food'; item: SearchItem } | { kind: 'custom' } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    store.getMeta('lastHall').then(
      (v) => { const found = HALLS.find((h) => h.id === v); if (found) setHall(found.id) },
      (e: unknown) => { log.error('ui.last_hall_read_failed', { error: String(e) }) },
    )
  }, [store])

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => { setToast(null) }, TOAST_MS)
    return () => { clearTimeout(t) }
  }, [toast])

  const index = useMemo(
    () => buildIndex({ menu, history: history ?? [], customFoods: customFoods ?? [] }),
    [menu, history, customFoods],
  )
  const legends = useMemo(() => legendsByRecipe(menu), [menu])

  const selectHall = (id: HallId): void => {
    setHall(id)
    store.setMeta('lastHall', id).then(undefined, (e: unknown) => { log.error('ui.last_hall_write_failed', { error: String(e) }) })
  }

  const now = useNow()
  const today = localDateKey(now)
  const dates = menu?.dates ?? []
  const activeDay = day !== null && dates.includes(day) ? day : dates.includes(today) ? today : (dates[0] ?? null)
  const hallMenu = activeDay === null ? undefined : menu?.days[activeDay]?.find((h) => h.hall === hall)
  const meals = (hallMenu?.meals ?? []).filter((m) => m.items.length > 0)
  const mealNames = meals.map((m) => m.name)
  const activeMeal = meal !== null && mealNames.includes(meal) ? meal : currentMeal(mealNames, now)
  const stations = groupByStation(meals.find((m) => m.name === activeMeal)?.items ?? [])
  const results = query.trim() === '' ? null : searchItems(index, query)
  // Still in flight is not the same as failed: the strip stays blank while the feed loads, exactly as the week
  // table on Profile prints "Loading hours…" rather than "Hours unavailable".
  const week = hours === null && hoursError === null ? null : hours?.[hall] ?? UNKNOWN_HOURS[hall]
  const hoursText = week === null || activeDay === null ? null : hoursLine(week, now, daysBetween(today, activeDay), t)
  const open = (item: SearchItem): void => { setSheet({ kind: 'food', item }) }
  const close = (): void => { setSheet(null) }

  return (
    <div class="menu">
      <input type="search" enterKeyHint="search" class="search" aria-label={t.t('menu.searchLabel')}
        placeholder={t.t('menu.searchPlaceholder')} value={query}
        onInput={(ev) => { setQuery(ev.currentTarget.value) }} />
      {/* Said once, here, where a reader in Spanish first meets a screen full of English dish names. */}
      <p class="muted ut-names">{t.t('menu.utNames')}</p>
      {/* ponytail: announced on every keystroke, no debounce — a polite region only speaks once typing pauses. */}
      <p class="visually-hidden" role="status">
        {results === null ? '' : t.t(
          results.length === 0 ? 'menu.results.none' : results.length === 1 ? 'menu.results.one' : 'menu.results.other',
          { count: t.n(results.length), query: query.trim() },
        )}
      </p>
      {/* The strip below is created with the menu, and a live region born with its text is unreliably announced:
          the hall's state is spoken from here instead, mounted from the first paint and empty until there is
          something to say. It speaks again whenever the hall, the day or the clock changes it. */}
      <p class="visually-hidden" role="status">
        {hoursText === null ? '' : `${hall} ${hoursText.head}${hoursText.detail === null ? '' : `, ${hoursText.detail}`}`}
      </p>
      <button type="button" class="link" onClick={() => { setSheet({ kind: 'custom' }) }}><PlusMark />{t.t('food.custom')}</button>

      {stale && cachedAt !== null && (
        <Banner tone="info">{t.t('menu.stale', { ago: savedAgo(cachedAt, now, t) })}</Banner>
      )}
      {menu === null && error !== null && (
        <Banner tone="error">
          {t.t('menu.loadFailed')} <button type="button" onClick={retry}>{t.t('common.retry')}</button>
        </Banner>
      )}

      {results !== null ? (
        results.length === 0 ? <div class="empty"><UtensilsDoodle /><p>{t.t('menu.noMatches', { query: query.trim() })}</p></div> : (
          <ul class="food-list" aria-label={t.t('menu.searchResults')}>
            {results.map((r) => (
              <FoodRow key={r.key} item={r} badge={sourceBadge(r, t)}
                hints={dietHints(r.recipeNumber === null ? [] : legends.get(r.recipeNumber) ?? [])}
                onOpen={() => { open(r) }} />
            ))}
          </ul>
        )
      ) : menu === null ? (
        error === null && <p class="loading">{t.t('menu.loading')}</p>
      ) : (
        <>
          <Chips legend={t.t('menu.hall')} name="hall" options={HALLS.map((h) => ({ value: h.id, label: h.label }))} value={hall} onSelect={selectHall} />
          {/* Whether the hall is serving, in words — never carried by ink alone. On a day other than today it is
              that day's own windows: "Today" printed over a Tuesday menu contradicts the chip 40px below it. */}
          {hoursText !== null && (
            <p class="hall-hours">
              <strong>{hoursText.head}</strong>
              {hoursText.detail !== null && <span class="muted">{hoursText.detail}</span>}
            </p>
          )}
          <Chips legend={t.t('menu.day')} name="day" options={dates.map((d) => {
            const { date, weekday, full } = dateLabel(d, t)
            return { value: d, label: date, sub: weekday, spoken: full }
          })} value={activeDay} onSelect={setDay} />
          {/* The meal chips print UT's own service names ("Brunch"), which are data, not copy. */}
          <Chips legend={t.t('common.meal')} name="meal" options={mealNames.map((m) => ({ value: m, label: m }))} value={activeMeal} onSelect={setMeal} />
          {stations.length === 0 && <div class="empty"><UtensilsDoodle /><p>{t.t('menu.noMenu')}</p></div>}
          {stations.map((s) => (
            <section key={s.station} class="station">
              <h2>{s.station}</h2>
              <ul class="food-list">
                {s.items.map((i, n) => {
                  const item = fromMenuItem(i, hall)
                  return <FoodRow key={`${i.recipeNumber}-${String(n)}`} item={item} badge={null} hints={dietHints(i.legends)} onOpen={() => { open(item) }} />
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      {sheet?.kind === 'custom' && (
        <Sheet key="custom" title={t.t('food.custom')} onClose={close}>
          <CustomFoodForm onSaved={(food) => { open(fromCustomFood(food)) }} />
        </Sheet>
      )}
      {sheet?.kind === 'food' && (
        <FoodSheet key={sheet.item.key} item={sheet.item} menuMeal={activeMeal}
          legends={sheet.item.recipeNumber === null ? [] : legends.get(sheet.item.recipeNumber) ?? []}
          onClose={close} onAdded={(m) => { setSheet(null); setToast(t.t('food.addedTo', { meal: t.t(`meal.${m}`) })) }} />
      )}
      {/* Both regions are mounted for the screen's whole life and only their text changes: a live region that is
          created in the same paint as its content is unreliably announced. */}
      <div class="toast" role="status">{toast}</div>
    </div>
  )
}
