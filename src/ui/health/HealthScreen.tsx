import { useEffect, useMemo, useState } from 'preact/hooks'
import { localDateKey } from '../../dates'
import { availableItems, healthReport, pickFoods, type Pick } from '../../health'
import type { Key } from '../../i18n'
import { legendsByRecipe } from '../../menu/select'
import type { Tab } from '../components/TabBar'
import { useApp } from '../context'
import { useT } from '../i18n'
import { useHours, useLive, useMenu, useNow, useTargets } from '../hooks'
import { UtensilsDoodle } from '../icons/Doodles'
import { Swatch } from '../icons/Marks'
import { FoodSheet } from '../menu/FoodSheet'

const TOAST_MS = 3000

// Every sentence on this screen comes from src/health.ts. The screen prints them and judges nothing itself;
// the only thing decided here is which line to print when there is nothing to suggest, which is about the
// state of the feed rather than about the reader's eating.
function nothingToSuggest(loading: boolean, failed: boolean, serving: boolean): Key {
  if (loading) return 'health.suggest.loading'
  if (failed) return 'health.suggest.failed'
  if (!serving) return 'health.suggest.notServing'
  return 'health.suggest.nothingBetter'
}

export function HealthScreen({ onGo }: { onGo: (tab: Tab) => void }) {
  const t = useT()
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
  const report = healthReport({ entries: entries ?? [], targets, today, legends, t })
  const picks = pickFoods({ menu, hours, now, today, gap: report.today.gap, sodiumHigh: report.sodiumHigh, fiberLow: report.fiberLow, t })

  // Until the log has been read, "nothing logged" would be a lie rather than an empty state.
  if (entries === undefined) return <p class="loading">{t.t('common.loading')}</p>

  // A suggestion is about what is left *today*: opening the sheet brings the viewed day back with it, so the
  // item cannot land on whatever day the Tracker was last left on.
  const open = (p: Pick): void => { setViewDate(today); setSheet(p) }
  // With nothing logged there is nothing to read, and seven rows all saying so is the wall of zeros this screen
  // exists to avoid: each block says once what it will show, and why there is nothing there yet.
  const nothingRead = report.adherence.daysLogged === 0

  return (
    <div class="health">
      <section aria-label={t.t('health.today')}>
        <h2>{t.t('health.today')}</h2>
        <p class="health-line">{report.today.line}</p>
        {targets === null && (
          <p class="notice">
            {t.t('health.noTargets')} <button type="button" class="link" onClick={() => { onGo('Profile') }}>{t.t('common.setUpGoals')}</button>
          </p>
        )}
      </section>

      <section aria-label={t.t('health.adherenceLabel')}>
        <h2>{t.t('health.last7')}</h2>
        <p class="health-cover">{report.adherence.coverage}</p>
        <p class="health-line">{report.adherence.headline}</p>
      </section>

      <section aria-label={t.t('health.macroBalance')}>
        <h2>{t.t('health.macroBalance')}</h2>
        {nothingRead ? <p class="health-line">{t.t('health.macroEmpty')}</p> : (
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

      <section aria-label={t.t('health.dietQuality')}>
        <h2>{t.t('health.dietQuality')}</h2>
        {nothingRead ? <p class="health-line">{t.t('health.qualityEmpty')}</p> : (
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

      <section aria-label={t.t('health.whatToEat')}>
        <h2>{t.t('health.whatToEat')}</h2>
        {picks.length === 0 ? (
          <div class="empty">
            <UtensilsDoodle />
            <p>{t.t(nothingToSuggest(menu === null && error === null, menu === null && error !== null, availableItems(menu, hours, now, today, t).length > 0))}</p>
          </div>
        ) : (
          <ul class="food-list" aria-label={t.t('health.suggested')}>
            {picks.map((p) => (
              <li key={p.item.key}>
                <button type="button" class="food-row" onClick={() => { open(p) }}>
                  <span class="food-name">{p.item.name}</span>
                  <span class="food-meta">
                    <span>{p.hall} · {p.item.station}</span>
                    <span>{p.meal} · {p.when}</span>
                    <span class="meta-kcal">{t.n(p.item.nutrients.calories)} {t.t('unit.kcal')}</span>
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
          onClose={() => { setSheet(null) }} onAdded={(m) => { setSheet(null); setToast(t.t('food.addedTo', { meal: t.t(`meal.${m}`) })) }} />
      )}
      {/* Mounted from the first paint and empty until there is something to say: a live region created together
          with its text is unreliably announced. */}
      <div class="toast" role="status">{toast}</div>
    </div>
  )
}
