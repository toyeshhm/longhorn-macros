import { useEffect, useState } from 'preact/hooks'
import { addDays, daysBetween, localDateKey } from '../../dates'
import { summarizeDay } from '../../daySummary'
import type { LogEntry } from '../../db/types'
import { log } from '../../log'
import { round1 } from '../../nutrition'
import { MacroBar } from '../components/MacroBar'
import type { Tab } from '../components/TabBar'
import { useApp } from '../context'
import { useLive, useTargets } from '../hooks'
import { capitalize } from '../menu/FoodSheet'
import { EntrySheet } from './EntrySheet'
import { RepeatMeal } from './RepeatMeal'

const UNDO_MS = 5000
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

  useEffect(() => {
    if (toast === null) return
    const t = setTimeout(() => { setToast(null) }, toast.kind === 'deleted' ? UNDO_MS : TOAST_MS)
    return () => { clearTimeout(t) }
  }, [toast])

  const undo = (entry: LogEntry): void => {
    setToast(null)
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
        <button type="button" aria-label="Previous day" onClick={() => { setViewDate(addDays(viewDate, -1)) }}>‹</button>
        <h2>{dateLabel(viewDate, today)}</h2>
        <button type="button" aria-label="Next day" onClick={() => { setViewDate(addDays(viewDate, 1)) }}>›</button>
        {viewDate !== today && <button type="button" onClick={() => { setViewDate(today) }}>Today</button>}
      </header>

      <section class="calories" aria-label="Calories">
        <p><span class="big">{eaten}</span> kcal eaten{targets && ` of ${String(targets.calories)}`}</p>
        {left !== null && (
          <p class={left < 0 ? 'over' : 'left'}>{left < 0 ? `${String(-left)} over` : `${String(left)} left`}</p>
        )}
        {targets && (
          <div class="bar" role="progressbar" aria-label="Calories eaten" aria-valuemin={0} aria-valuemax={targets.calories}
            aria-valuenow={Math.min(eaten, targets.calories)} aria-valuetext={`${String(eaten)} of ${String(targets.calories)} kcal`}>
            <div class={`bar-fill${left !== null && left < 0 ? ' over' : ''}`} style={{ width: `${String(Math.min(100, (eaten / targets.calories) * 100))}%` }} />
          </div>
        )}
      </section>
      {!targets && (
        <p class="notice">No daily targets yet. <button type="button" class="link" onClick={() => { onGo('Goals') }}>Set up your goals</button></p>
      )}

      <section class="macros" aria-label="Macros">
        <MacroBar label="Protein" eaten={s.total.protein} target={targets?.protein ?? null} unit="g" />
        <MacroBar label="Carbs" eaten={s.total.carbs} target={targets?.carbs ?? null} unit="g" />
        <MacroBar label="Fat" eaten={s.total.fat} target={targets?.fat ?? null} unit="g" />
      </section>
      <p class="micros" aria-label="Micronutrients">
        Fiber {round1(s.total.fiber)} g · Sugar {round1(s.total.sugar)} g · Sodium {Math.round(s.total.sodium)} mg
      </p>

      <button type="button" class="link" onClick={() => { setSheet({ kind: 'repeat' }) }}>Repeat a past meal</button>
      {entries && s.byMeal.length === 0 && (
        <p class="muted">Nothing logged for this day. <button type="button" class="link" onClick={() => { onGo('Menu') }}>Browse the menu</button></p>
      )}
      <section aria-label="Logged foods">
        {s.byMeal.map((g) => (
          <section key={g.meal} class="meal-group">
            <h3><span>{capitalize(g.meal)}</span><span>{Math.round(g.calories)} kcal</span></h3>
            <ul class="food-list">
              {g.entries.map((e) => (
                <li key={e.id}>
                  <button type="button" class="food-row" onClick={() => { setSheet({ kind: 'entry', entry: e }) }}>
                    <span class="food-name">{e.name}</span>
                    <span class="food-meta">{e.servings} × {e.portion} · {Math.round(e.perServing.calories * e.servings)} kcal</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      {sheet?.kind === 'entry' && (
        <EntrySheet key={sheet.entry.id} entry={sheet.entry} onClose={() => { setSheet(null) }}
          onDeleted={(entry) => { setSheet(null); setToast({ kind: 'deleted', entry }) }} />
      )}
      {sheet?.kind === 'repeat' && (
        <RepeatMeal onClose={() => { setSheet(null) }}
          onAdded={(n) => { setSheet(null); setToast({ kind: 'info', text: `Added ${String(n)} ${n === 1 ? 'item' : 'items'}` }) }} />
      )}
      {toast !== null && (
        <div class="toast" role="status">
          {toast.kind === 'info' ? toast.text : (
            <>Deleted {toast.entry.name} <button type="button" class="link" onClick={() => { undo(toast.entry) }}>Undo</button></>
          )}
        </div>
      )}
    </div>
  )
}
