import { useEffect, useRef, useState } from 'preact/hooks'
import { addDays, daysBetween, localDateKey } from '../../dates'
import { summarizeDay } from '../../daySummary'
import type { LogEntry } from '../../db/types'
import type { Key, T } from '../../i18n'
import { log } from '../../log'
import { formatServings } from '../../servings'
import { InkBar } from '../components/InkBar'
import { MacroBar } from '../components/MacroBar'
import { Rich } from '../components/Rich'
import type { Tab } from '../components/TabBar'
import { useApp } from '../context'
import { useLive, useTargets } from '../hooks'
import { useT } from '../i18n'
import { BowlDoodle } from '../icons/Doodles'
import { ArrowMark } from '../icons/Marks'
import { EntrySheet } from './EntrySheet'

// A delete is only undoable from this toast, so it carries no clock: a time limit on the sole path to a function
// is WCAG 2.2.1 (and 10s is nowhere near enough to hear it, decide and act). It stays until Undo, Dismiss, or the
// next toast. Plain confirmations do time out; nothing is lost when they go.
const TOAST_MS = 3000

function dateLabel(key: string, today: string, t: T): string {
  const offset = daysBetween(today, key)
  if (offset === 0) return t.t('today.today')
  if (offset === -1) return t.t('today.yesterday')
  if (offset === 1) return t.t('today.tomorrow')
  return t.date(new Date(`${key}T12:00:00`), { weekday: 'short', month: 'short', day: 'numeric' })
}

// Four states, two of them about today, and Spanish puts "hoy" where English puts "today": one key each rather
// than a stem with a suffix glued on.
function heroLabel(left: number | null, isToday: boolean): Key {
  if (left === null) return isToday ? 'today.hero.eatenToday' : 'today.hero.eaten'
  if (left < 0) return isToday ? 'today.hero.passedToday' : 'today.hero.passed'
  return isToday ? 'today.hero.leftToday' : 'today.hero.left'
}

type Toast = { kind: 'deleted'; entry: LogEntry } | { kind: 'info'; text: string }

export function TodayScreen({ onGo }: { onGo: (tab: Tab) => void }) {
  const t = useT()
  const { store, viewDate, setViewDate } = useApp()
  const entries = useLive(() => store.logForDate(viewDate), [viewDate])
  const targets = useTargets()
  const [sheet, setSheet] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  // A delete takes the focused row with it, so focus moves to Undo; when the toast goes it hands focus to the
  // screen rather than leaving it on <body>.
  const undoRef = useRef<HTMLButtonElement>(null)
  const toastRef = useRef<HTMLDivElement>(null)
  const dropToast = (): void => {
    const held = toastRef.current?.contains(document.activeElement) === true
    setToast(null)
    if (held) document.querySelector<HTMLElement>('main.screen')?.focus()
  }

  useEffect(() => {
    if (toast === null) return
    if (toast.kind === 'deleted') { undoRef.current?.focus(); return }
    const t = setTimeout(dropToast, TOAST_MS)
    return () => { clearTimeout(t) }
  }, [toast])

  const undo = (entry: LogEntry): void => {
    dropToast()
    store.put('food_log', { ...entry, deletedAt: null }).then(undefined, (e: unknown) => {
      log.error('ui.food_log_undo_failed', { id: entry.id, error: String(e) })
      setToast({ kind: 'info', text: t.t('today.undoFailed', { error: String(e) }) })
    })
  }

  const today = localDateKey(new Date())
  const s = summarizeDay(entries ?? [], targets)
  const eaten = Math.round(s.total.calories)
  const left = s.remaining && Math.round(s.remaining.calories)

  return (
    <div class="today">
      <header class="date-nav">
        <button type="button" class="icon-btn" aria-label={t.t('today.prevDay')} onClick={() => { setViewDate(addDays(viewDate, -1)) }}><ArrowMark dir="prev" /></button>
        {/* Both arrows replace the whole screen while focus stays on the button: the heading is always mounted,
            so announcing the new day from it is reliable (a region created with its text is not). */}
        <h2 aria-live="polite">{dateLabel(viewDate, today, t)}</h2>
        <button type="button" class="icon-btn" aria-label={t.t('today.nextDay')} onClick={() => { setViewDate(addDays(viewDate, 1)) }}><ArrowMark dir="next" /></button>
        {viewDate !== today && <button type="button" class="stamp" onClick={() => { setViewDate(today) }}>{t.t('today.today')}</button>}
      </header>

      <section class="calories" aria-label={t.t('today.calories')}>
        <p class="hero-label">{t.t(heroLabel(left, viewDate === today))}</p>
        <p class={`hero-num${left !== null && left < 0 ? ' over' : ''}`}>
          <span class="big" data-ink={t.n(left === null ? eaten : Math.abs(left))}>{t.n(left === null ? eaten : Math.abs(left))}</span>
          {left !== null && left < 0 && <span class="over-word"> {t.t('today.overWord')}</span>}
        </p>
        {targets && (
          <p class="eaten">
            <Rich line="today.eatenOf" slots={{ eaten: <strong>{t.n(eaten)}</strong>, target: <strong>{t.n(targets.calories)}</strong> }} />
          </p>
        )}
        {targets && (
          <InkBar ink="calories" eaten={eaten} target={targets.calories} label={t.t('today.caloriesEaten')}
            valueText={t.t('today.ofKcal', { eaten: t.n(eaten), target: t.n(targets.calories) })} />
        )}
      </section>
      {!targets && (
        <p class="notice">{t.t('today.noTargets')} <button type="button" class="link" onClick={() => { onGo('Profile') }}>{t.t('common.setUpGoals')}</button></p>
      )}

      <section class="macros" aria-label={t.t('today.macros')}>
        <MacroBar ink="protein" label={t.t('nutrient.protein')} eaten={s.total.protein} target={targets?.protein ?? null} unit={t.t('unit.g')} />
        <MacroBar ink="carbs" label={t.t('nutrient.carbs')} eaten={s.total.carbs} target={targets?.carbs ?? null} unit={t.t('unit.g')} />
        <MacroBar ink="fat" label={t.t('nutrient.fat')} eaten={s.total.fat} target={targets?.fat ?? null} unit={t.t('unit.g')} />
      </section>
      {/* A <p> cannot carry aria-label (the paragraph role does not support naming), so the name goes on a section. */}
      <section class="micros" aria-label={t.t('today.micros')}>
        {t.t('nutrient.fiber')}&nbsp;{t.d(s.total.fiber)}&nbsp;{t.t('unit.g')} · {t.t('nutrient.sugar')}&nbsp;{t.d(s.total.sugar)}&nbsp;{t.t('unit.g')} · {t.t('nutrient.sodium')}&nbsp;{t.n(s.total.sodium)}&nbsp;{t.t('unit.mg')}
      </section>

      <section aria-label={t.t('today.loggedFoods')} class="logged">
        {s.byMeal.map((g) => (
          <section key={g.meal} class="meal-group">
            <h3><span>{t.t(`meal.${g.meal}`)}</span><span class="meal-kcal">{t.n(g.calories)} {t.t('unit.kcal')}</span></h3>
            <ul class="food-list" role="list">
              {g.entries.map((e) => (
                <li key={e.id}>
                  <button type="button" class="food-row entry-row" onClick={() => { setSheet(e) }}>
                    <span class="food-main">
                      <span class="food-name">{e.name}</span>
                      <span class="food-meta">{formatServings(e.servings)} × {e.portion}</span>
                    </span>
                    <span class="food-kcal">{t.n(e.perServing.calories * e.servings)} {t.t('unit.kcal')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
      {entries && s.byMeal.length === 0 && (
        <div class="empty">
          <BowlDoodle class="doodle-md" />
          <p>{t.t('today.empty')} <button type="button" class="link" onClick={() => { onGo('Menu') }}>{t.t('today.browseMenu')}</button></p>
        </div>
      )}

      {sheet !== null && (
        <EntrySheet key={sheet.id} entry={sheet} onClose={() => { setSheet(null) }}
          onDeleted={(entry) => { setSheet(null); setToast({ kind: 'deleted', entry }) }} />
      )}
      {/* Always mounted, empty when there is nothing to say: a live region that appears together with its text is
          unreliably announced. The Undo button carries the item name because the focus move pre-empts the region. */}
      <div ref={toastRef} class="toast" role="status">
        {toast === null ? null : toast.kind === 'info' ? toast.text : (
          <>
            {t.t('today.deleted', { name: toast.entry.name })}
            <button ref={undoRef} type="button" class="link" aria-label={t.t('today.undoLabel', { name: toast.entry.name })}
              onClick={() => { undo(toast.entry) }}>{t.t('common.undo')}</button>
            <button type="button" class="link" onClick={dropToast}>{t.t('common.dismiss')}</button>
          </>
        )}
      </div>
    </div>
  )
}
