import { useEffect, useRef, useState } from 'preact/hooks'
import { addDays, daysBetween, localDateKey } from '../../dates'
import { summarizeDay } from '../../daySummary'
import type { LogEntry } from '../../db/types'
import { log } from '../../log'
import { round1 } from '../../nutrition'
import { formatServings } from '../../servings'
import { InkBar } from '../components/InkBar'
import { MacroBar } from '../components/MacroBar'
import type { Tab } from '../components/TabBar'
import { useApp } from '../context'
import { n } from '../format'
import { useLive, useTargets } from '../hooks'
import { BowlDoodle } from '../icons/Doodles'
import { ArrowMark } from '../icons/Marks'
import { capitalize } from '../menu/FoodSheet'
import { EntrySheet } from './EntrySheet'
import { RepeatMeal } from './RepeatMeal'

// A delete is only undoable from this toast, so it carries no clock: a time limit on the sole path to a function
// is WCAG 2.2.1 (and 10s is nowhere near enough to hear it, decide and act). It stays until Undo, Dismiss, or the
// next toast. Plain confirmations do time out; nothing is lost when they go.
const TOAST_MS = 3000

function dateLabel(key: string, today: string): string {
  const offset = daysBetween(today, key)
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

type Toast = { kind: 'deleted'; entry: LogEntry } | { kind: 'info'; text: string }

export function TodayScreen({ onGo }: { onGo: (tab: Tab) => void }) {
  const { store, viewDate, setViewDate } = useApp()
  const entries = useLive(() => store.logForDate(viewDate), [viewDate])
  const targets = useTargets()
  const [sheet, setSheet] = useState<{ kind: 'entry'; entry: LogEntry } | { kind: 'repeat' } | null>(null)
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
      setToast({ kind: 'info', text: `Couldn't undo: ${String(e)}` })
    })
  }

  const today = localDateKey(new Date())
  const s = summarizeDay(entries ?? [], targets)
  const eaten = Math.round(s.total.calories)
  const left = s.remaining && Math.round(s.remaining.calories)

  return (
    <div class="today">
      <header class="date-nav">
        <button type="button" class="icon-btn" aria-label="Previous day" onClick={() => { setViewDate(addDays(viewDate, -1)) }}><ArrowMark dir="prev" /></button>
        {/* Both arrows replace the whole screen while focus stays on the button: the heading is always mounted,
            so announcing the new day from it is reliable (a region created with its text is not). */}
        <h2 aria-live="polite">{dateLabel(viewDate, today)}</h2>
        <button type="button" class="icon-btn" aria-label="Next day" onClick={() => { setViewDate(addDays(viewDate, 1)) }}><ArrowMark dir="next" /></button>
        {viewDate !== today && <button type="button" class="stamp" onClick={() => { setViewDate(today) }}>Today</button>}
      </header>

      <section class="calories" aria-label="Calories">
        <p class="hero-label">{left === null ? 'calories eaten' : left < 0 ? 'target passed' : 'calories left'}{viewDate === today ? ' today' : ''}</p>
        <p class={`hero-num${left !== null && left < 0 ? ' over' : ''}`}>
          <span class="big" data-ink={n(left === null ? eaten : Math.abs(left))}>{n(left === null ? eaten : Math.abs(left))}</span>
          {left !== null && left < 0 && <span class="over-word"> over</span>}
        </p>
        {targets && <p class="eaten"><strong>{n(eaten)}</strong> eaten of <strong>{n(targets.calories)}</strong></p>}
        {targets && (
          <InkBar ink="calories" eaten={eaten} target={targets.calories} label="Calories eaten"
            valueText={`${String(eaten)} of ${String(targets.calories)} kcal`} />
        )}
      </section>
      {!targets && (
        <p class="notice">No daily targets yet, so there's nothing to count down from. <button type="button" class="link" onClick={() => { onGo('Goals') }}>Set up your goals</button></p>
      )}

      <section class="macros" aria-label="Macros">
        <MacroBar ink="protein" label="Protein" eaten={s.total.protein} target={targets?.protein ?? null} unit="g" />
        <MacroBar ink="carbs" label="Carbs" eaten={s.total.carbs} target={targets?.carbs ?? null} unit="g" />
        <MacroBar ink="fat" label="Fat" eaten={s.total.fat} target={targets?.fat ?? null} unit="g" />
      </section>
      {/* A <p> cannot carry aria-label (the paragraph role does not support naming), so the name goes on a section. */}
      <section class="micros" aria-label="Micronutrients">
        Fiber&nbsp;{round1(s.total.fiber)}&nbsp;g · Sugar&nbsp;{round1(s.total.sugar)}&nbsp;g · Sodium&nbsp;{n(s.total.sodium)}&nbsp;mg
      </section>

      <section aria-label="Logged foods" class="logged">
        {s.byMeal.map((g) => (
          <section key={g.meal} class="meal-group">
            <h3><span>{capitalize(g.meal)}</span><span class="meal-kcal">{n(g.calories)} kcal</span></h3>
            <ul class="food-list">
              {g.entries.map((e) => (
                <li key={e.id}>
                  <button type="button" class="food-row entry-row" onClick={() => { setSheet({ kind: 'entry', entry: e }) }}>
                    <span class="food-main">
                      <span class="food-name">{e.name}</span>
                      <span class="food-meta">{formatServings(e.servings)} × {e.portion}</span>
                    </span>
                    <span class="food-kcal">{n(e.perServing.calories * e.servings)} kcal</span>
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
          <p>Nothing logged for this day. <button type="button" class="link" onClick={() => { onGo('Menu') }}>Browse the menu</button></p>
        </div>
      )}
      <button type="button" class="link repeat" onClick={() => { setSheet({ kind: 'repeat' }) }}>Repeat a past meal</button>

      {sheet?.kind === 'entry' && (
        <EntrySheet key={sheet.entry.id} entry={sheet.entry} onClose={() => { setSheet(null) }}
          onDeleted={(entry) => { setSheet(null); setToast({ kind: 'deleted', entry }) }} />
      )}
      {sheet?.kind === 'repeat' && (
        <RepeatMeal onClose={() => { setSheet(null) }}
          onAdded={(n) => { setSheet(null); setToast({ kind: 'info', text: `Added ${String(n)} ${n === 1 ? 'item' : 'items'}` }) }} />
      )}
      {/* Always mounted, empty when there is nothing to say: a live region that appears together with its text is
          unreliably announced. The Undo button carries the item name because the focus move pre-empts the region. */}
      <div ref={toastRef} class="toast" role="status">
        {toast === null ? null : toast.kind === 'info' ? toast.text : (
          <>
            Deleted {toast.entry.name}
            <button ref={undoRef} type="button" class="link" aria-label={`Undo deleting ${toast.entry.name}`}
              onClick={() => { undo(toast.entry) }}>Undo</button>
            <button type="button" class="link" onClick={dropToast}>Dismiss</button>
          </>
        )}
      </div>
    </div>
  )
}
