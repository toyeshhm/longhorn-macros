import { addDays } from './dates'
import { summarizeDay } from './daySummary'
import type { LogEntry } from './db/types'
import type { Targets } from './goals'
import type { HallId, Menu } from './menu/feed'
import type { Key, T } from './i18n'
import { formatTime, hallStatus, UNKNOWN_HOURS, type Hours, type Week } from './menu/hours'
import { currentMeal, HALLS } from './menu/select'
import { scaleNutrients, sumNutrients, type Nutrients } from './nutrition'
import { fromMenuItem, type SearchItem } from './search'

/**
 * Every judgement the Health screen makes: how the last seven days went, what UT's own numbers say about the
 * quality of what was eaten, and which of today's items best close what is left. The screen prints what these
 * functions return and decides nothing itself.
 *
 * Nothing here writes English. Every sentence is a dictionary key filled through the `T` the caller hands in, so
 * the judgements are the same in both languages and the wording lives in one place.
 *
 * Two rules run through all of it. A day with nothing logged is absent, never a zero, so an average is always over
 * the days that exist and every figure says how many that was. And nothing is invented: the only diet signals here
 * are ones UT publishes (fiber, sodium, sugar, the Vegan/Vegetarian labels), said as plain facts with the number.
 */

/** The complete days behind today that the weekly read covers. Today is not one of them: it is not over. */
export const WINDOW_DAYS = 7
/** Logged days a diet signal needs before it may move the suggestion ranking. Below this it only prints. */
export const MIN_SIGNAL_DAYS = 3
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
const MACRO_LABEL_KEY: Readonly<Record<MacroKey, Key>> = { protein: 'nutrient.protein', carbs: 'nutrient.carbs', fat: 'nutrient.fat' }
/** The same three words lower-case, for the middle of a suggestion's reason rather than the head of a row. */
const MACRO_LOWER_KEY: Readonly<Record<MacroKey, Key>> = { protein: 'macro.lower.protein', carbs: 'macro.lower.carbs', fat: 'macro.lower.fat' }
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

export function adherence(days: readonly DayTotal[], targets: Targets | null, t: T): Adherence {
  const daysLogged = days.length
  const target = targets?.calories ?? null
  const coverage = t.t('health.coverage', { logged: daysLogged, window: WINDOW_DAYS })
  const base = { daysLogged, windowDays: WINDOW_DAYS, target, coverage }
  if (daysLogged === 0) {
    return { ...base, avgCalories: null, trend: 'unknown', headline: t.t('health.adherence.none') }
  }
  const avgCalories = days.reduce((sum, d) => sum + d.nutrients.calories, 0) / daysLogged
  // Never "a day" when only some days were logged: the average is over those days and the sentence says which.
  const per = daysLogged < WINDOW_DAYS
    ? t.t(daysLogged === 1 ? 'health.per.one' : 'health.per.other', { days: daysLogged })
    : t.t('health.per.aDay')
  const avg = t.n(avgCalories)
  if (target === null) {
    return { ...base, avgCalories, trend: 'unknown', headline: t.t('health.adherence.noTarget', { avg, per }) }
  }
  const delta = avgCalories - target
  const trend = Math.abs(delta) <= target * ON_BAND ? 'on' : delta < 0 ? 'under' : 'over'
  const tail = trend === 'on'
    ? t.t('health.adherence.onTarget')
    : t.t(`health.adherence.${trend}`, { delta: t.n(Math.abs(delta)) })
  return { ...base, avgCalories, trend, headline: t.t('health.adherence.headline', { avg, per, target: t.n(target), tail }) }
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

function macroRead(key: MacroKey, days: readonly DayTotal[], targets: Targets | null, t: T): MacroRead {
  const label = t.t(MACRO_LABEL_KEY[key])
  const targetGrams = targets?.[key] ?? null
  if (days.length === 0) {
    return { key, label, avgGrams: null, targetGrams, daysShort: 0, daysHeavy: 0, verdict: 'unknown', share: t.t('health.macro.noDays'), note: t.t('health.nothing7') }
  }
  const avgGrams = days.reduce((sum, d) => sum + d.nutrients[key], 0) / days.length
  const avgCalories = days.reduce((sum, d) => sum + d.nutrients.calories, 0) / days.length
  const eatenShare = sharePct(avgGrams, key, avgCalories)
  const eaten = eatenShare === null ? t.t('health.macro.noCalories') : t.t('health.macro.shareEaten', { share: t.d(eatenShare) })
  if (targets === null) {
    return { key, label, avgGrams, targetGrams, daysShort: 0, daysHeavy: 0, verdict: 'unknown', share: eaten, note: t.t('health.macro.noTarget', { avg: t.d(avgGrams) }) }
  }
  const targetShare = sharePct(targets[key], key, targets.calories)
  const share = targetShare === null ? eaten : t.t('health.macro.shareWithTarget', { eaten, share: t.d(targetShare) })
  const goal = targets[key]
  const daysShort = days.filter((d) => d.nutrients[key] < goal * SHORT_OF).length
  const daysHeavy = days.filter((d) => d.nutrients[key] > goal * HEAVY_OF).length
  const against = t.t('health.macro.against', { avg: t.d(avgGrams), goal: t.n(goal) })
  const most = (count: number): string =>
    t.t(days.length === 1 ? 'health.macro.most.one' : 'health.macro.most.other', { count, days: days.length })
  // Most of the logged days on one side of the band is a pattern worth naming; anything else is just the week.
  if (daysShort * 2 > days.length) return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'short', share, note: t.t('health.macro.short', { most: most(daysShort), against }) }
  if (daysHeavy * 2 > days.length) return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'heavy', share, note: t.t('health.macro.heavy', { most: most(daysHeavy), against }) }
  return { key, label, avgGrams, targetGrams, daysShort, daysHeavy, verdict: 'steady', share, note: t.t('health.macro.steady', { against }) }
}

export function macroReads(days: readonly DayTotal[], targets: Targets | null, t: T): MacroRead[] {
  return MACRO_KEYS.map((key) => macroRead(key, days, targets, t))
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

export function qualitySignals(days: readonly DayTotal[], plants: PlantShare, t: T): Signal[] {
  const nothing = t.t('health.nothing7')
  if (days.length === 0) {
    return [
      { id: 'fiber', label: t.t('nutrient.fiber'), fact: nothing, note: null, flag: 'unknown' },
      { id: 'sodium', label: t.t('nutrient.sodium'), fact: nothing, note: null, flag: 'unknown' },
      { id: 'sugar', label: t.t('nutrient.sugar'), fact: nothing, note: null, flag: 'unknown' },
      { id: 'plants', label: t.t('health.signal.plants'), fact: nothing, note: null, flag: 'unknown' },
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
      id: 'fiber', label: t.t('nutrient.fiber'),
      fact: perThousand === null
        ? t.t('health.signal.fiberNoCalories')
        : t.t('health.signal.fiber', { value: t.d(perThousand), per: t.n(1000), mark: t.n(FIBER_PER_1000_KCAL) }),
      note: null,
      flag: perThousand === null ? 'unknown' : perThousand < FIBER_PER_1000_KCAL ? 'low' : 'none',
    },
    {
      id: 'sodium', label: t.t('nutrient.sodium'),
      fact: t.t('health.signal.sodium', { value: t.n(avgSodium), mark: t.n(SODIUM_LIMIT_MG) }),
      note: null,
      flag: avgSodium > SODIUM_LIMIT_MG ? 'high' : 'none',
    },
    {
      id: 'sugar', label: t.t('nutrient.sugar'),
      fact: sugarShare === null
        ? t.t('health.signal.sugarNoCalories')
        : t.t('health.signal.sugar', { value: t.d(sugarShare), mark: t.n(SUGAR_SHARE_LIMIT_PCT) }),
      note: t.t('health.signal.sugarNote'),
      flag: sugarShare === null ? 'unknown' : sugarShare > SUGAR_SHARE_LIMIT_PCT ? 'high' : 'none',
    },
    {
      id: 'plants', label: t.t('health.signal.plants'),
      fact: plantPct === null
        ? t.t('health.signal.plantsNone')
        : t.t('health.signal.plantsFact', { value: t.d(plantPct) }),
      note: plantPct === null ? null : t.t('health.signal.plantsNote', { coverage: t.d(coverage) }),
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

export function todayRead(entries: readonly LogEntry[], targets: Targets | null, today: string, t: T): TodayRead {
  const s = summarizeDay(entries.filter((e) => e.date === today), targets)
  const logged = s.byMeal.length > 0
  if (targets === null || s.remaining === null) {
    const line = logged
      ? t.t('health.today.loggedNoTargets', { calories: t.n(s.total.calories), protein: t.d(s.total.protein) })
      : t.t('health.today.emptyNoTargets')
    return { eaten: s.total, gap: null, logged, line }
  }
  const gap: Gap = { remaining: s.remaining, targets }
  if (!logged) {
    const line = t.t('health.today.emptyWithTargets', { calories: t.n(targets.calories), protein: t.n(targets.protein) })
    return { eaten: s.total, gap, logged, line }
  }
  const left = gap.remaining.calories
  const tail = left < 0 ? t.t('health.today.over', { amount: t.n(-left) }) : t.t('health.today.left', { amount: t.n(left) })
  const line = t.t('health.today.line', {
    eaten: t.n(s.total.calories), target: t.n(targets.calories), tail,
    protein: t.d(s.total.protein), proteinTarget: t.n(targets.protein),
  })
  return { eaten: s.total, gap, logged, line }
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
  t: T
}): HealthReport {
  const { t } = input
  // Complete days only. Today is still being eaten, and counting it as a finished day reported a fabricated
  // deficit and three "Short" verdicts for most of every day. Today has its own section, which is where it belongs.
  const from = addDays(input.today, -WINDOW_DAYS)
  const live = input.entries.filter((e) => e.deletedAt === null && e.date >= from && e.date < input.today)
  const days = dailyTotals(live)
  const signals = qualitySignals(days, plantShare(live, input.legends), t)
  // A signal is allowed to re-rank the food suggestions only once it rests on more than a day or two: one light
  // day is enough to read "low fiber" and turn the whole list into fruit.
  const enough = days.length >= MIN_SIGNAL_DAYS
  return {
    adherence: adherence(days, input.targets, t),
    macros: macroReads(days, input.targets, t),
    signals,
    today: todayRead(input.entries, input.targets, input.today, t),
    sodiumHigh: enough && signals.some((s) => s.id === 'sodium' && s.flag === 'high'),
    fiberLow: enough && signals.some((s) => s.id === 'fiber' && s.flag === 'low'),
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
function serviceAt(week: Week, now: Date, t: T): { at: Date; when: string } | null {
  const status = hallStatus(week, now, t)
  if (status.state === 'unknown') return { at: now, when: t.t('hours.today') }
  if (status.state === 'open') return { at: now, when: t.t('hours.now') }
  // A hall that reopens on a later day (JCL over a weekend) is not "next": it is shut, and today's gap is today's.
  if (status.opens === null || status.day !== null) return null
  const when = t.t('hours.from', { at: formatTime(status.opens, t) })
  return { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, status.opens), when }
}

/** Today's items at every hall that is open now or opens again today, for the service being served then. */
export function availableItems(menu: Menu | null, hours: Hours | null, now: Date, today: string, t: T): Candidate[] {
  const halls = menu?.days[today] ?? []
  const out: Candidate[] = []
  for (const { id } of HALLS) {
    const hallMenu = halls.find((h) => h.hall === id)
    if (hallMenu === undefined) continue
    const meals = hallMenu.meals.filter((m) => m.items.length > 0)
    const slot = serviceAt(hours?.[id] ?? UNKNOWN_HOURS[id], now, t)
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
 * be a fraction of a day, and fiber at a macro weight turns the whole list into fruit on a week whose real
 * problem is protein.
 *
 * **Only the macros that are actually the gap are credited.** A macro counts only while it is proportionally
 * shorter than protein is, so while protein is the widest open gap carbohydrate and fat earn nothing; once
 * protein is met the rule reverses and they are credited normally, which is right, because by then they are what
 * is left. Without it a fresh day credits all three equally, and since fat targets are small (50-76 g) next to
 * protein targets (136-150 g), fat won the "why" line on most real dishes — the app's stated reason for
 * suggesting a 35 g chicken breast was its 30 g of fat — and two apples and two oranges outranked every protein
 * source on a day with 150 g of protein still owed.
 *
 * Calories are charged twice. The first charge is the bar every item has to clear: one calorie of the reader's own
 * target diet earns exactly `sum of the credited macro weights / target calories` under the gains above (the macro
 * split cancels out), so charging that much per calorie means an item scores only when it closes the gap *better
 * than an average bite of the day would*. The sum is over the credited macros, not all three, or the bar is priced
 * for a gain the item is not allowed to earn and nothing on the menu clears it. Without the charge, size wins: a
 * 971 kcal cupcake closes more of the carb gap than anything else UT serves, and a health screen opens with cake.
 * The second charge is the calories past what is actually left today, a quarter of the day's target costing a
 * whole point, which is what keeps a 900 kcal plate off a 300 kcal gap.
 */
const MACRO_WEIGHT: Readonly<Record<MacroKey, number>> = { protein: 1, carbs: 0.5, fat: 0.5 }
const FIBER_WEIGHT = 0.12
const SODIUM_WEIGHT = 0.5
const FIBER_FULL_G = 10
const OVERSHOOT_SHARE = 0.25
/** Under this an item is a condiment, not something to eat: it would win on protein per calorie and feed nobody. */
const MIN_KCAL = 40
/**
 * UT's own rows are sometimes not internally consistent, and the scoring is only as honest as its input: the J2
 * Rum Cake is published as 200.6 kcal carrying 26.1 g of fat, 26.8 g of carbohydrate and 1.7 g of protein, which
 * is 348 kcal of macros inside a 200 kcal serving. Scored as written it clears the bar on fat alone and a health
 * screen opens by suggesting cake. A row whose macros cannot fit inside its calories is not something to hand
 * anyone as advice, so it is skipped here — it is still searchable, loggable and on the Menu exactly as UT
 * published it; this is about what the app volunteers. The tolerance is loose because fiber sits inside the
 * carbohydrate figure and yields about 2 kcal/g rather than 4.
 */
const MACRO_KCAL_TOLERANCE = 1.25

function coherent(nut: Nutrients): boolean {
  return MACRO_KEYS.reduce((sum, k) => sum + nut[k] * KCAL_PER_G[k], 0) <= nut.calories * MACRO_KCAL_TOLERANCE
}
const MAX_PICKS = 6

interface Scored { readonly score: number; readonly ink: MacroKey | null; readonly reason: string }

/** How much of a macro's day is still owed, as a share of its target: the one scale the three macros compare on. */
function shortfall(gap: Gap, key: MacroKey): number {
  const target = gap.targets[key]
  return target <= 0 ? 0 : Math.max(gap.remaining[key], 0) / target
}

function scoreAgainstGap(nut: Nutrients, gap: Gap, sodiumHigh: boolean, fiberLow: boolean, t: T): Scored {
  let score = 0
  let bestTerm = 0
  let credited = 0
  let ink: MacroKey | null = null
  let reason = ''
  const proteinShare = shortfall(gap, 'protein')
  for (const key of MACRO_KEYS) {
    const need = gap.remaining[key]
    const target = gap.targets[key]
    if (need <= 0 || target <= 0) continue
    if (key !== 'protein' && proteinShare >= shortfall(gap, key)) continue
    credited += MACRO_WEIGHT[key]
    const term = (Math.min(nut[key], need) / target) * MACRO_WEIGHT[key]
    score += term
    if (term > bestTerm) {
      bestTerm = term
      ink = key
      reason = t.t('health.pick.macro', { grams: t.d(nut[key]), macro: t.t(MACRO_LOWER_KEY[key]), need: t.d(need) })
    }
  }
  if (fiberLow) {
    const term = (Math.min(nut.fiber, FIBER_FULL_G) / FIBER_FULL_G) * FIBER_WEIGHT
    score += term
    // Last term in, so nothing reads bestTerm after this: the comparison is the whole point of keeping it.
    if (term > bestTerm) {
      ink = null
      reason = t.t('health.pick.fiber', { grams: t.d(nut.fiber) })
    }
  }
  const day = Math.max(gap.targets.calories, 1)
  const budget = Math.max(gap.remaining.calories, 0)
  score -= (nut.calories * credited) / day
  score -= Math.max(0, nut.calories - budget) / (day * OVERSHOOT_SHARE)
  if (sodiumHigh) score -= (nut.sodium / SODIUM_LIMIT_MG) * SODIUM_WEIGHT
  return { score, ink, reason }
}

/** No targets yet: protein per 100 kcal is the one ranking that needs nothing from the user to be useful. */
function scoreWithoutGap(nut: Nutrients, t: T): Scored {
  const reason = t.t('health.pick.protein', { grams: t.d(nut.protein), calories: t.n(nut.calories) })
  return { score: (nut.protein * 100) / nut.calories, ink: 'protein', reason }
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
  t: T
}): Pick[] {
  const { t } = input
  const scored: Pick[] = []
  for (const c of availableItems(input.menu, input.hours, input.now, input.today, t)) {
    const nut = c.item.nutrients
    if (nut.calories < MIN_KCAL || !coherent(nut)) continue
    const s = input.gap === null ? scoreWithoutGap(nut, t) : scoreAgainstGap(nut, input.gap, input.sodiumHigh, input.fiberLow, t)
    // A non-positive score means the item closes nothing that is still open, so there is nothing to say about it.
    if (s.score <= 0) continue
    scored.push({ ...c, ...s })
  }
  // One row per dish, kept where it scores best — not one row per recipe number. UT publishes the same dish under
  // a different number per station and per hall (one Sausage Link is 083003 at Breakfast Offerings and 010407 at
  // FAST Line; JCL renumbers everything J2 serves), so keying on the number filled two of six slots with one food.
  // `SearchItem.key` stays the recipe number, the right identity for search and logging; this map only has to
  // answer "is this the same thing to eat".
  const best = new Map<string, Pick>()
  for (const p of scored) {
    const id = `${p.item.name.toLowerCase()}|${p.item.portion}`
    const prev = best.get(id)
    if (prev === undefined || p.score > prev.score) best.set(id, p)
  }
  return [...best.values()].sort(compare).slice(0, MAX_PICKS)
}
