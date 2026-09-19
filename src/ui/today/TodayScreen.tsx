import { useState } from 'preact/hooks'
import { addDays, daysBetween, localDateKey } from '../../dates'
import { summarizeDay } from '../../daySummary'
import type { LogEntry } from '../../db/types'
import { log } from '../../log'
import { round1 } from '../../nutrition'
import { MacroBar } from '../components/MacroBar'
import type { Tab } from '../components/TabBar'
import { Toast, type ToastMessage } from '../components/Toast'
import { useApp } from '../context'
import { useLive, useTargets } from '../hooks'
import { capitalize } from '../menu/FoodSheet'
import { EntrySheet } from './EntrySheet'
import { RepeatMeal } from './RepeatMeal'

const RELATIVE: ReadonlySet<string> = new Set(['Today', 'Yesterday', 'Tomorrow'])

function fullDate(key: string): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function dateLabel(key: string, today: string): string {
  const offset = daysBetween(today, key)
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function TodayScreen({ onGo }: { onGo: (tab: Tab) => void }) {
  const { store, viewDate, setViewDate } = useApp()
  const entries = useLive(() => store.logForDate(viewDate), [viewDate])
  const targets = useTargets()
  const [sheet, setSheet] = useState<{ kind: 'entry'; entry: LogEntry } | { kind: 'repeat' } | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)

  const undo = (entry: LogEntry): void => {
    setToast(null)
    store.put('food_log', { ...entry, deletedAt: null }).then(undefined, (e: unknown) => {
      log.error('ui.food_log_undo_failed', { id: entry.id, error: String(e) })
      setToast({ text: `Couldn't undo: ${String(e)}`, onUndo: null })
    })
  }

  const today = localDateKey(new Date())
  const label = dateLabel(viewDate, today)
  const s = summarizeDay(entries ?? [], targets ?? null)
  const eaten = Math.round(s.total.calories)
  const left = s.remaining && Math.round(s.remaining.calories)

  return (
    <div class="today">
      <header class="date-nav">
        <div class="date-title">
          <h2>{label}</h2>
          {RELATIVE.has(label) && <p class="date-full">{fullDate(viewDate)}</p>}
        </div>
        {viewDate !== today && <button type="button" class="jump" onClick={() => { setViewDate(today) }}>Go to today</button>}
        <button type="button" aria-label="Previous day" onClick={() => { setViewDate(addDays(viewDate, -1)) }}>‹</button>
        <button type="button" aria-label="Next day" onClick={() => { setViewDate(addDays(viewDate, 1)) }}>›</button>
      </header>

      {/* Nothing until targets resolve, so loading never reads as "no targets". */}
      {targets !== undefined && (
        <>
          <section class="calories" aria-label="Calories">
            {left === null ? (
              <p class="readout"><span class="big eaten">{eaten}</span>{' '}<span class="unit">kcal eaten</span></p>
            ) : (
              <p class={`readout ${left < 0 ? 'over' : 'left'}`}>
                <span class="big">{Math.abs(left)}</span>{' '}<span class="unit">{left < 0 ? 'kcal over' : 'kcal left'}</span>
              </p>
            )}
            {targets && (
              <div class="bar" role="progressbar" aria-label="Calories eaten" aria-valuemin={0} aria-valuemax={targets.calories}
                aria-valuenow={Math.min(eaten, targets.calories)} aria-valuetext={`${String(eaten)} of ${String(targets.calories)} kcal`}>
                <div class={`bar-fill${left !== null && left < 0 ? ' over' : ''}`} style={{ width: `${String(Math.min(100, (eaten / targets.calories) * 100))}%` }} />
              </div>
            )}
            {targets && <p class="sub"><span class="eaten">{eaten}</span> kcal eaten of {targets.calories}</p>}
          </section>
          {targets === null && (
            <p class="notice">No daily targets yet. <button type="button" class="link inline-link" onClick={() => { onGo('Goals') }}>Set up your goals</button></p>
          )}

          <section class="macros" aria-label="Macros">
            <MacroBar label="Protein" eaten={s.total.protein} target={targets?.protein ?? null} unit="g" />
            <MacroBar label="Carbs" eaten={s.total.carbs} target={targets?.carbs ?? null} unit="g" />
            <MacroBar label="Fat" eaten={s.total.fat} target={targets?.fat ?? null} unit="g" />
          </section>
        </>
      )}
      <p class="micros" aria-label="Micronutrients">
        Fiber {round1(s.total.fiber)} g · Sugar {round1(s.total.sugar)} g · Sodium {Math.round(s.total.sodium)} mg
      </p>

      <section aria-label="Logged foods">
        <div class="log-head">
          <h2>Log</h2>
          <button type="button" class="link" onClick={() => { setSheet({ kind: 'repeat' }) }}>Repeat a past meal</button>
        </div>
        {entries && s.byMeal.length === 0 && (
          <p class="empty">Nothing logged for this day. <button type="button" class="link inline-link" onClick={() => { onGo('Menu') }}>Browse the menu</button></p>
        )}
        {s.byMeal.map((g) => (
          <section key={g.meal} class="meal-group">
            <h3><span>{capitalize(g.meal)}</span><span>{Math.round(g.calories)} kcal</span></h3>
            <ul class="food-list">
              {g.entries.map((e) => (
                <li key={e.id}>
                  <button type="button" class="food-row" onClick={() => { setSheet({ kind: 'entry', entry: e }) }}>
                    <span class="food-name">{e.name}</span>
                    <span class="food-kcal">{Math.round(e.perServing.calories * e.servings)} kcal</span>
                    <span class="food-meta">{e.servings} × {e.portion}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>

      {sheet?.kind === 'entry' && (
        <EntrySheet key={sheet.entry.id} entry={sheet.entry} onClose={() => { setSheet(null) }}
          onDeleted={(entry) => { setSheet(null); setToast({ text: `Deleted ${entry.name}`, onUndo: () => { undo(entry) } }) }} />
      )}
      {sheet?.kind === 'repeat' && (
        <RepeatMeal onClose={() => { setSheet(null) }}
          onAdded={(n) => { setSheet(null); setToast({ text: `Added ${String(n)} ${n === 1 ? 'item' : 'items'}`, onUndo: null }) }} />
      )}
      <Toast toast={toast} onDone={() => { setToast(null) }} />
    </div>
  )
}
