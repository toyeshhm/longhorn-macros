import { addDays } from './dates'
import { summarizeDay } from './daySummary'
import type { LogEntry } from './db/types'
import type { Targets } from './goals'
import type { HallId, Menu } from './menu/feed'
import { formatTime, hallStatus, UNKNOWN_HOURS, type Hours, type Week } from './menu/hours'
import { currentMeal, HALLS } from './menu/select'
import { round1, scaleNutrients, sumNutrients, type Nutrients } from './nutrition'
import { fromMenuItem, type SearchItem } from './search'
import { n } from './ui/format'

/**
 * Every judgement the Health screen makes: how the last seven days went, what UT's own numbers say about the
 * quality of what was eaten, and which of today's items best close what is left. The screen prints what these
 * functions return and decides nothing itself.
 *
 * Two rules run through all of it. A day with nothing logged is absent, never a zero, so an average is always over
 * the days that exist and every figure says how many that was. And nothing is invented: the only diet signals here
 * are ones UT publishes (fiber, sodium, sugar, the Vegan/Vegetarian labels), said as plain facts with the number.
 */

export const WINDOW_DAYS = 7
/** The Dietary Guidelines fiber mark. UT prints fiber per serving, so per 1,000 kcal is the only scale it reads on. */
export const FIBER_PER_1000_KCAL = 14
/** The Dietary Guidelines sodium ceiling, per day. */
export const SODIUM_LIMIT_MG = 2300
/** The added-sugar guideline, as a share of calories. UT publishes total sugar only; the signal's note says so. */
export const SUGAR_SHARE_LIMIT_PCT = 10
/** Within 5% of target reads as "on": a dining-hall portion estimate is not precise enough to call 100 kcal a miss. */
const ON_BAND = 0.05
/** A day counts as short under 90% of its target and heavy over 110%. Between those it is noise, not a miss. */
const SHORT_OF = 0.9
const HEAVY_OF = 1.1

export type MacroKey = 'protein' | 'carbs' | 'fat'
export const MACRO_KEYS: readonly MacroKey[] = ['protein', 'carbs', 'fat']
const MACRO_LABEL: Readonly<Record<MacroKey, string>> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }
const KCAL_PER_G: Readonly<Record<MacroKey, number>> = { protein: 4, carbs: 4, fat: 9 }

export interface DayTotal { readonly date: string; readonly nutrients: Nutrients }

/** One total per day that has at least one live row, ascending. Days with nothing logged are absent, never zero. */
export function dailyTotals(live: readonly LogEntry[]): DayTotal[] {
  const byDate = new Map<string, Nutrients[]>()
  for (const e of live) {
    const bucket = byDate.get(e.date)
    const scaled = scaleNutrients(e.perServing, e.servings)
    if (bucket === undefined) byDate.set(e.date, [scaled])
    else bucket.push(scaled)
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => ({ date, nutrients: sumNutrients(list) }))
}

// ---------------------------------------------------------------------------------------------- goal adherence

export type Trend = 'under' | 'on' | 'over' | 'unknown'

export interface Adherence {
  readonly daysLogged: number
  readonly windowDays: number
  readonly avgCalories: number | null
  readonly target: number | null
  readonly trend: Trend
  /** "3 of 7 days logged" — printed next to every average, so a partial week is never read as a full one. */
  readonly coverage: string
  readonly headline: string
}

export function adherence(days: readonly DayTotal[], targets: Targets | null): Adherence {
  const daysLogged = days.length
  const target = targets?.calories ?? null
  const coverage = `${String(daysLogged)} of ${String(WINDOW_DAYS)} days logged`
  const base = { daysLogged, windowDays: WINDOW_DAYS, target, coverage }
  if (daysLogged === 0) {
    return { ...base, avgCalories: null, trend: 'unknown', headline: 'Nothing logged in the last 7 days, so there is no average to read yet.' }
  }
  const avgCalories = days.reduce((sum, d) => sum + d.nutrients.calories, 0) / daysLogged
  // Never "a day" when only some days were logged: the average is over those days and the sentence says which.
  const per = daysLogged < WINDOW_DAYS ? `on the ${String(daysLogged)} ${daysLogged === 1 ? 'day' : 'days'} you logged` : 'a day'
  if (target === null) {
    return { ...base, avgCalories, trend: 'unknown', headline: `Averaging ${n(avgCalories)} kcal ${per}. No calorie target set yet.` }
  }
  const delta = avgCalories - target
  const trend = Math.abs(delta) <= target * ON_BAND ? 'on' : delta < 0 ? 'under' : 'over'
  const tail = trend === 'on' ? 'On target.' : `About ${n(Math.abs(delta))} ${trend}.`
  return { ...base, avgCalories, trend, headline: `Averaging ${n(avgCalories)} kcal ${per} against ${n(target)}. ${tail}` }
}

// ----------------------------------------------------------------------------------------------- macro balance

export type Verdict = 'short' | 'heavy' | 'steady' | 'unknown'

export interface MacroRead {
  readonly key: MacroKey
  readonly label: string
  readonly avgGrams: number | null
  readonly targetGrams: number | null
  readonly daysShort: number
  readonly daysHeavy: number
  readonly verdict: Verdict
  /** The macro's share of the calories eaten, against the share the targets imply. */
  readonly share: string
  readonly note: string
}

function sharePct(grams: number, key: MacroKey, calories: number): number | null {
  return calories <= 0 ? null : (grams * KCAL_PER_G[key] * 100) / calories
}

function macroRead(key: MacroKey, days: readonly DayTotal[], targets: Targets | null): MacroRead {
  const label = MACRO_LABEL[key]
  const targetGrams = targets?.[key] ?? null
  if (days.length === 0) {
    return { key, label, avgGrams: null, targetGrams, daysShort: 0, daysHeavy: 0, verdict: 'unknown', share: 'No days logged', note: 'Nothing logged in the last 7 days.' }
  }
  const avgGrams = days.reduce((sum, d) => sum + d.nutrients[key], 0) / days.length
  const avgCalories = days.reduce((sum, d) => sum + d.nutrients.calories, 0) / days.length
  const eatenShare = sharePct(avgGrams, key, avgCalories)
  const eaten = eatenShare === null ? 'No calories logged' : `${String(round1(eatenShare))}% of calories`
  if (targets === null) {
    return { key, label, avgGrams, targetGrams, daysShort: 0, daysHeavy: 0, verdict: 'unknown', share: eaten, note: `Averaging ${String(round1(avgGrams))} g a day. No target to compare against yet.` }
  }
  const targetShare = sharePct(targets[key], key, targets.calories)
  const share = targetShare === null ? eaten : `${eaten} · target ${String(round1(targetShare))}%`
  const goal = targets[key]
  const daysShort = days.filter((d) => d.nutrients[key] < goal * SHORT_OF).length
  const daysHeavy = days.filter((d) => d.nutrients[key] > goal * HEAVY_OF).length
  const against = `averaging ${String(round1(avgGrams))} g against ${String(goal)} g`
  const most = (count: number): string => `on ${String(count)} of ${String(days.length)} logged ${days.length === 1 ? 'day' : 'days'}`
  // Most of the logged days on one side of the band is a pattern worth naming; anything else is just the week.
  if (daysShort * 2 > days.length) return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'short', share, note: `Short ${most(daysShort)}, ${against}.` }
  if (daysHeavy * 2 > days.length) return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'heavy', share, note: `Heavy ${most(daysHeavy)}, ${against}.` }
  return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'steady', share, note: `Steady, ${against}.` }
}

export function macroReads(days: readonly DayTotal[], targets: Targets | null): MacroRead[] {
  return MACRO_KEYS.map((key) => macroRead(key, days, targets))
}

// --------------------------------------------------------------------------------------------- diet quality

export type SignalId = 'fiber' | 'sodium' | 'sugar' | 'plants'
export type Flag = 'none' | 'high' | 'low' | 'unknown'

export interface Signal {
  readonly id: SignalId
  readonly label: string
  /** One plain fact with the number in it. Never a grade, never a streak. */
  readonly fact: string
  readonly note: string | null
  readonly flag: Flag
}

export interface PlantShare {
  readonly plantKcal: number
  /** Calories whose item carried a UT label at all: the only ones this share can honestly be taken over. */
  readonly knownKcal: number
  readonly totalKcal: number
}

const PLANT_LEGENDS: ReadonlySet<string> = new Set(['Vegan', 'Vegetarian'])

export function plantShare(live: readonly LogEntry[], legends: ReadonlyMap<string, readonly string[]>): PlantShare {
  let plantKcal = 0
  let knownKcal = 0
  let totalKcal = 0
  for (const e of live) {
    const kcal = e.perServing.calories * e.servings
    totalKcal += kcal
    const labels = e.recipeNumber === null ? undefined : legends.get(e.recipeNumber)
    if (labels === undefined) continue
    knownKcal += kcal
    if (labels.some((l) => PLANT_LEGENDS.has(l))) plantKcal += kcal
  }
  return { plantKcal, knownKcal, totalKcal }
}

export function qualitySignals(days: readonly DayTotal[], plants: PlantShare): Signal[] {
  const nothing = 'Nothing logged in the last 7 days.'
  if (days.length === 0) {
    return [
      { id: 'fiber', label: 'Fiber', fact: nothing, note: null, flag: 'unknown' },
      { id: 'sodium', label: 'Sodium', fact: nothing, note: null, flag: 'unknown' },
      { id: 'sugar', label: 'Sugar', fact: nothing, note: null, flag: 'unknown' },
      { id: 'plants', label: 'Plant-based', fact: nothing, note: null, flag: 'unknown' },
    ]
  }
  const total = sumNutrients(days.map((d) => d.nutrients))
  const perThousand = total.calories <= 0 ? null : (total.fiber * 1000) / total.calories
  const avgSodium = total.sodium / days.length
  const sugarShare = total.calories <= 0 ? null : (total.sugar * KCAL_PER_G.carbs * 100) / total.calories
  const plantPct = plants.knownKcal <= 0 ? null : (plants.plantKcal * 100) / plants.knownKcal
  const coverage = plants.totalKcal <= 0 ? 0 : (plants.knownKcal * 100) / plants.totalKcal
  return [
    {
      id: 'fiber', label: 'Fiber',
      fact: perThousand === null ? 'No calories logged, so fiber has nothing to scale against.' : `${String(round1(perThousand))} g per 1,000 kcal, against the ${String(FIBER_PER_1000_KCAL)} g mark.`,
      note: null,
      flag: perThousand === null ? 'unknown' : perThousand < FIBER_PER_1000_KCAL ? 'low' : 'none',
    },
    {
      id: 'sodium', label: 'Sodium',
      fact: `${n(avgSodium)} mg a day, against the ${n(SODIUM_LIMIT_MG)} mg mark.`,
      note: null,
      flag: avgSodium > SODIUM_LIMIT_MG ? 'high' : 'none',
    },
    {
      id: 'sugar', label: 'Sugar',
      fact: sugarShare === null ? 'No calories logged, so sugar has nothing to scale against.' : `${String(round1(sugarShare))}% of calories, against the ${String(SUGAR_SHARE_LIMIT_PCT)}% mark for added sugar.`,
      note: 'UT publishes total sugar only, so this counts the sugar in fruit and milk too.',
      flag: sugarShare === null ? 'unknown' : sugarShare > SUGAR_SHARE_LIMIT_PCT ? 'high' : 'none',
    },
    {
      id: 'plants', label: 'Plant-based',
      fact: plantPct === null ? 'Nothing logged in the last 7 days carried a UT label.' : `${String(round1(plantPct))}% of labelled calories came from items UT calls Vegan or Vegetarian.`,
      note: plantPct === null ? null : `Read from ${String(round1(coverage))}% of the week's calories; custom and off-menu foods carry no UT label.`,
      flag: plantPct === null ? 'unknown' : 'none',
    },
  ]
}

// ----------------------------------------------------------------------------------------------------- today

/** What is left today, with the targets it is left against, so a suggestion can weigh a gap as a share of the day. */
export interface Gap { readonly remaining: Targets; readonly targets: Targets }

export interface TodayRead {
  readonly eaten: Nutrients
  readonly gap: Gap | null
  readonly logged: boolean
  readonly line: string
}

export function todayRead(entries: readonly LogEntry[], targets: Targets | null, today: string): TodayRead {
  const s = summarizeDay(entries.filter((e) => e.date === today), targets)
  const logged = s.byMeal.length > 0
  if (targets === null || s.remaining === null) {
    return { eaten: s.total, gap: null, logged, line: logged ? `${n(s.total.calories)} kcal and ${String(round1(s.total.protein))} g of protein logged today. No targets set yet.` : 'Nothing logged today, and no targets set yet.' }
  }
  const gap: Gap = { remaining: s.remaining, targets }
  if (!logged) {
    return { eaten: s.total, gap, logged, line: `Nothing logged today. ${n(targets.calories)} kcal and ${String(targets.protein)} g of protein to go.` }
  }
  const left = gap.remaining.calories
  const tail = left < 0 ? `${n(-left)} over` : `${n(left)} left`
  return { eaten: s.total, gap, logged, line: `${n(s.total.calories)} of ${n(targets.calories)} kcal today, ${tail}. Protein ${String(round1(s.total.protein))} of ${String(targets.protein)} g.` }
}

// ---------------------------------------------------------------------------------------------- the report

export interface HealthReport {
  readonly adherence: Adherence
  readonly macros: readonly MacroRead[]
  readonly signals: readonly Signal[]
  readonly today: TodayRead
  readonly sodiumHigh: boolean
  readonly fiberLow: boolean
}

export function healthReport(input: {
  entries: readonly LogEntry[]
  targets: Targets | null
  today: string
  legends: ReadonlyMap<string, readonly string[]>
}): HealthReport {
  const from = addDays(input.today, -(WINDOW_DAYS - 1))
  const live = input.entries.filter((e) => e.deletedAt === null && e.date >= from && e.date <= input.today)
  const days = dailyTotals(live)
  const signals = qualitySignals(days, plantShare(live, input.legends))
  return {
    adherence: adherence(days, input.targets),
    macros: macroReads(days, input.targets),
    signals,
    today: todayRead(input.entries, input.targets, input.today),
    sodiumHigh: signals.some((s) => s.id === 'sodium' && s.flag === 'high'),
    fiberLow: signals.some((s) => s.id === 'fiber' && s.flag === 'low'),
  }
}

// --------------------------------------------------------------------------------------------- what to eat

export interface Candidate {
  readonly item: SearchItem
  readonly hall: HallId
  /** The menu's own meal name ("Dinner"), which is also what the food sheet logs it under. */
  readonly meal: string
  /** When it is served, in words: "now", "from 4:30pm", or "today" when the hours feed cannot be read. */
  readonly when: string
}

export interface Pick extends Candidate {
  readonly reason: string
  readonly ink: MacroKey | null
  readonly score: number
}

/** Which service to draw from, and how to say when it is served. `null` when the hall is done for today. */
function serviceAt(week: Week, now: Date): { at: Date; when: string } | null {
  const status = hallStatus(week, now)
  if (status.state === 'unknown') return { at: now, when: 'today' }
  if (status.state === 'open') return { at: now, when: 'now' }
  // A hall that reopens on a later day (JCL over a weekend) is not "next": it is shut, and today's gap is today's.
  if (status.opens === null || status.day !== null) return null
  return { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, status.opens), when: `from ${formatTime(status.opens)}` }
}

/** Today's items at every hall that is open now or opens again today, for the service being served then. */
export function availableItems(menu: Menu | null, hours: Hours | null, now: Date, today: string): Candidate[] {
  const halls = menu?.days[today] ?? []
  const out: Candidate[] = []
  for (const { id } of HALLS) {
    const hallMenu = halls.find((h) => h.hall === id)
    if (hallMenu === undefined) continue
    const meals = hallMenu.meals.filter((m) => m.items.length > 0)
    const slot = serviceAt(hours?.[id] ?? UNKNOWN_HOURS[id], now)
    if (slot === null) continue
    const chosen = meals.find((m) => m.name === currentMeal(meals.map((other) => other.name), slot.at))
    if (chosen === undefined) continue // the hall posts nothing for this day
    for (const item of chosen.items) out.push({ item: fromMenuItem(item, id), hall: id, meal: chosen.name, when: slot.when })
  }
  return out
}

/**
 * The scoring, in one place so it can be argued with.
 *
 * Every macro still owed is worth its own share of the day's target, so an item is credited for the part of the
 * gap it actually closes (never for protein that is already met). Protein outweighs carbs and fat because it is
 * the macro a dining hall makes hardest to hit and the one this app leads with. Fiber earns a term only while the
 * week's fiber runs low, and sodium costs only while the week's sodium runs high, so a signal that is fine never
 * pushes the list around. Both are weighted like carbs and fat rather than like protein: one serving can only ever
 * be a fraction of a day, and fiber at anything like a macro weight turns the whole list into fruit even on a week whose real problem is protein.
 *
 * Calories are charged twice, and both charges matter.
 *
 * The first charge is the bar every item has to clear. One calorie of the reader's own target diet earns exactly
 * `sum of the macro weights / target calories` under the gains above (the macro split cancels out), so charging
 * that much per calorie means an item scores only when it closes the gap *better than an average bite of the day
 * would*. Without it, size wins: a 971 kcal cupcake closes more of the carb gap than anything else UT serves, and
 * a health screen opens with cake. With it, the list is what it should be, lean protein and, while the week's
 * fiber runs low, the high-fiber plates. Carbohydrate is still credited and can still tip a close call, but it
 * rarely wins on its own, which is right: at a dining hall carbohydrate is the easy macro.
 *
 * The second charge is the calories past what is actually left today, a quarter of the day's target costing a
 * whole point, which is what keeps a 900 kcal plate off a 300 kcal gap.
 */
const MACRO_WEIGHT: Readonly<Record<MacroKey, number>> = { protein: 1, carbs: 0.5, fat: 0.5 }
const FIBER_WEIGHT = 0.12
const SODIUM_WEIGHT = 0.5
const FIBER_FULL_G = 10
const WEIGHT_SUM = MACRO_KEYS.reduce((sum, k) => sum + MACRO_WEIGHT[k], 0)
const OVERSHOOT_SHARE = 0.25
/** Under this an item is a condiment, not something to eat: it would win on protein per calorie and feed nobody. */
const MIN_KCAL = 40
/**
 * UT's own rows are sometimes not internally consistent, and the scoring is only as honest as its input: the
 * J2 Rum Cake is published as 200.6 kcal carrying 26.1 g of fat, 26.8 g of carbohydrate and 1.7 g of protein,
 * which is 348 kcal of macros inside a 200 kcal serving. Scored as written it clears the bar on fat alone and a
 * health screen opens by suggesting cake. A row whose macros cannot fit inside its calories is not something to
 * hand anyone as advice, so it is skipped here (it is still searchable, loggable and shown on the Menu, exactly
 * as UT published it; this is about what the app volunteers, not about hiding UT's numbers). The tolerance is
 * loose because fiber sits inside the carbohydrate figure and yields about 2 kcal/g rather than 4.
 */
const MACRO_KCAL_TOLERANCE = 1.25

function coherent(nut: Nutrients): boolean {
  return MACRO_KEYS.reduce((sum, k) => sum + nut[k] * KCAL_PER_G[k], 0) <= nut.calories * MACRO_KCAL_TOLERANCE
}
const MAX_PICKS = 6

interface Scored { readonly score: number; readonly ink: MacroKey | null; readonly reason: string }

function scoreAgainstGap(nut: Nutrients, gap: Gap, sodiumHigh: boolean, fiberLow: boolean): Scored {
  let score = 0
  let bestTerm = 0
  let ink: MacroKey | null = null
  let reason = ''
  for (const key of MACRO_KEYS) {
    const need = gap.remaining[key]
    const target = gap.targets[key]
    if (need <= 0 || target <= 0) continue
    const term = (Math.min(nut[key], need) / target) * MACRO_WEIGHT[key]
    score += term
    if (term > bestTerm) {
      bestTerm = term
      ink = key
      reason = `${String(round1(nut[key]))} g ${key} toward the ${String(round1(need))} g left`
    }
  }
  if (fiberLow) {
    const term = (Math.min(nut.fiber, FIBER_FULL_G) / FIBER_FULL_G) * FIBER_WEIGHT
    score += term
    // Last term in, so nothing reads bestTerm after this: the comparison is the whole point of keeping it.
    if (term > bestTerm) {
      ink = null
      reason = `${String(round1(nut.fiber))} g of fiber`
    }
  }
  const day = Math.max(gap.targets.calories, 1)
  const budget = Math.max(gap.remaining.calories, 0)
  score -= (nut.calories * WEIGHT_SUM) / day
  score -= Math.max(0, nut.calories - budget) / (day * OVERSHOOT_SHARE)
  if (sodiumHigh) score -= (nut.sodium / SODIUM_LIMIT_MG) * SODIUM_WEIGHT
  return { score, ink, reason }
}

/** No targets yet: protein per 100 kcal is the one ranking that needs nothing from the user to be useful. */
function scoreWithoutGap(nut: Nutrients): Scored {
  return { score: (nut.protein * 100) / nut.calories, ink: 'protein', reason: `${String(round1(nut.protein))} g of protein in ${n(nut.calories)} kcal` }
}

// Score desc, then name, then the menu's own order (the sort is stable): the same inputs always give the same list.
function compare(a: Pick, b: Pick): number {
  return b.score - a.score || a.item.name.localeCompare(b.item.name)
}

export function pickFoods(input: {
  menu: Menu | null
  hours: Hours | null
  now: Date
  today: string
  gap: Gap | null
  sodiumHigh: boolean
  fiberLow: boolean
}): Pick[] {
  const scored: Pick[] = []
  for (const c of availableItems(input.menu, input.hours, input.now, input.today)) {
    const nut = c.item.nutrients
    if (nut.calories < MIN_KCAL || !coherent(nut)) continue
    const s = input.gap === null ? scoreWithoutGap(nut) : scoreAgainstGap(nut, input.gap, input.sodiumHigh, input.fiberLow)
    // A non-positive score means the item closes nothing that is still open, so there is nothing to say about it.
    if (s.score <= 0) continue
    scored.push({ ...c, ...s })
  }
  // One row per recipe: the same dish served at two halls is one suggestion, kept where it scores best.
  const best = new Map<string, Pick>()
  for (const p of scored) {
    const prev = best.get(p.item.key)
    if (prev === undefined || p.score > prev.score) best.set(p.item.key, p)
  }
  return [...best.values()].sort(compare).slice(0, MAX_PICKS)
}
