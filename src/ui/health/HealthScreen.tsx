import { useEffect, useMemo, useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { availableItems, healthReport, pickFoods, type Pick } from '../../health'
import { legendsByRecipe } from '../../menu/select'
import type { Tab } from '../components/TabBar'
import { useApp } from '../context'
import { n } from '../format'
import { useHours, useLive, useMenu, useNow, useTargets } from '../hooks'
import { UtensilsDoodle } from '../icons/Doodles'
import { Swatch } from '../icons/Marks'
import { FoodSheet } from '../menu/FoodSheet'

const TOAST_MS = 3000

// Every sentence on this screen comes from src/health.ts. The screen prints them and judges nothing itself;
// the only thing decided here is which line to print when there is nothing to suggest, which is about the
// state of the feed rather than about the reader's eating.
function nothingToSuggest(loading: boolean, failed: boolean, serving: boolean): string {
  if (loading) return "Loading today's menu…"
  if (failed) return "Couldn't reach UT dining, so there is nothing to suggest right now."
  if (!serving) return 'Nothing is being served right now. Check back around the next meal.'
  return 'Nothing being served now closes what you have left better than an average bite of your targets would.'
}

export function HealthScreen({ onGo }: { onGo: (tab: Tab) => void }) {
  const { store, setViewDate } = useApp()
  const entries = useLive(() => store.all('food_log'), [])
  const targets = useTargets()
  const { menu, error } = useMenu()
  const { hours } = useHours()
  const now = useNow()
  const [sheet, setSheet] = useState<Pick | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const legends = useMemo(() => legendsByRecipe(menu), [menu])

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => { setToast(null) }, TOAST_MS)
    return () => { clearTimeout(t) }
  }, [toast])

  const today = localDateKey(now)
  const report = healthReport({ entries: entries ?? [], targets, today, legends })
  const picks = pickFoods({ menu, hours, now, today, gap: report.today.gap, sodiumHigh: report.sodiumHigh, fiberLow: report.fiberLow })

  // Until the log has been read, "nothing logged" would be a lie rather than an empty state.
  if (entries === undefined) return <p class="loading">Loading…</p>

  // A suggestion is about what is left *today*: opening the sheet brings the viewed day back with it, so the
  // item cannot land on whatever day the Tracker was last left on.
  const open = (p: Pick): void => { setViewDate(today); setSheet(p) }
  // With nothing logged there is nothing to read, and seven rows all saying so is the wall of zeros this screen
  // exists to avoid: each block says once what it will show, and why there is nothing there yet.
  const nothingRead = report.adherence.daysLogged === 0

  return (
    <div class="health">
      <section aria-label="Today">
        <h2>Today</h2>
        <p class="health-line">{report.today.line}</p>
        {targets === null && (
          <p class="notice">
            No targets yet, so there is nothing to measure against. <button type="button" class="link" onClick={() => { onGo('Profile') }}>Set up your goals</button>
          </p>
        )}
      </section>

      <section aria-label="Goal adherence">
        <h2>Last 7 days</h2>
        <p class="health-cover">{report.adherence.coverage}</p>
        <p class="health-line">{report.adherence.headline}</p>
      </section>

      <section aria-label="Macro balance">
        <h2>Macro balance</h2>
        {nothingRead ? <p class="health-line">Log a few days and this reads protein, carbs and fat against the share your targets imply.</p> : (
        <ul class="reads">
          {report.macros.map((m) => (
            <li key={m.key}>
              <p class="read-head">
                <span class="macro-name"><Swatch ink={m.key} />{m.label}</span>
                <span class="read-aside">{m.share}</span>
              </p>
              <p class="read-note">{m.note}</p>
            </li>
          ))}
        </ul>
        )}
      </section>

      <section aria-label="Diet quality">
        <h2>Diet quality</h2>
        {nothingRead ? <p class="health-line">Log a few days and this reads fiber, sodium, sugar and the plant-based share straight off UT's numbers.</p> : (
        <ul class="reads">
          {report.signals.map((s) => (
            <li key={s.id}>
              <p class="read-head"><span class="signal-name">{s.label}</span><span class="read-aside">{s.fact}</span></p>
              {s.note !== null && <p class="read-note muted">{s.note}</p>}
            </li>
          ))}
        </ul>
        )}
      </section>

      <section aria-label="What to eat">
        <h2>What to eat</h2>
        {picks.length === 0 ? (
          <div class="empty">
            <UtensilsDoodle />
            <p>{nothingToSuggest(menu === null && error === null, menu === null && error !== null, availableItems(menu, hours, now, today).length > 0)}</p>
          </div>
        ) : (
          <ul class="food-list" aria-label="Suggested foods">
            {picks.map((p) => (
              <li key={p.item.key}>
                <button type="button" class="food-row" onClick={() => { open(p) }}>
                  <span class="food-name">{p.item.name}</span>
                  <span class="food-meta">
                    <span>{p.hall} · {p.item.station}</span>
                    <span>{p.meal} · {p.when}</span>
                    <span class="meta-kcal">{n(p.item.nutrients.calories)} kcal</span>
                    <span class="pick-why">{p.ink !== null && <Swatch ink={p.ink} />}{p.reason}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet !== null && (
        <FoodSheet key={sheet.item.key} item={sheet.item} menuMeal={sheet.meal}
          legends={sheet.item.recipeNumber === null ? [] : legends.get(sheet.item.recipeNumber) ?? []}
          onClose={() => { setSheet(null) }} onAdded={(m) => { setSheet(null); setToast(`Added to ${m}`) }} />
      )}
      {/* Mounted from the first paint and empty until there is something to say: a live region created together
          with its text is unreliably announced. */}
      <div class="toast" role="status">{toast}</div>
    </div>
  )
}
