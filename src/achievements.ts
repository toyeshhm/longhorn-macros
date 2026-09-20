import { dateLabel } from './dates'
import type { LogEntry, Meal, ProfileRow, WeightEntry } from './db/types'
import { computeTargets, TARGET_KEYS, type Targets } from './goals'
import { dailyTotals, FIBER_PER_1000_KCAL, type DayTotal } from './health'
import type { Key, Params, T } from './i18n'

/**
 * The badge engine: sixteen printed stamps, each earned from data the app already holds and never taken away.
 *
 * Two rules the whole file obeys, both from PRODUCT.md's 2026-09-20 note. **Nothing is invented**: every badge is
 * a rule over logged rows, weigh-ins and the profile, and a badge whose rule cannot be checked from those (a
 * "vegan item" stamp, say, whose diet label only exists on this week's menu feed and would un-earn itself when
 * the feed rolls over) is simply not here. And **nothing punishes a day off**: there is no streak, no countdown
 * and no badge for eating less than the target, only for landing on it.
 *
 * Every badge reduces to the same shape: an ascending list of dates on which one unit of progress was made, and
 * how many units it needs. Earned is "the list reached the count"; the earn date is the date of the unit that
 * got there. A few badges measure partial progress on a different scale than they earn on (three meals in *one*
 * day is earned once, but reads "2 of 3" on the way), and those carry their own progress.
 *
 * The rules are re-run from the stored rows on every render, so what is judged must not depend on the reader's
 * *current* numbers: a day is judged against the targets that were in force on that day (`dayTargets`), never
 * today's, or weighing in heavier would un-print stamps already given. And a day that logged no calories earns
 * no target badge at all, whatever the targets say, so no stamp is ever paid for logging nothing.
 *
 * ponytail: nothing here keeps its own state, which is the ceiling on all of that. An earn date is read back out
 * of the data as it stands, so a forgotten day backfilled later can restate one, and the two badges hung off the
 * profile's own fields (`adaptive` off `tdeeUpdatedOn`, which each weekly run overwrites, and the cut badge off
 * the *current* goal) can only be as stable as those fields. Freezing them means persisting `{badgeId, earnedOn}`
 * — a table, an RLS policy, a sync path and a merge rule — for a restated date on a stamp that is never taken
 * away. That is the upgrade path if the dates themselves ever start mattering.
 *
 * It writes no English: every title, description and line comes from the dictionary through the caller's `T`,
 * and the figures in the copy come from this file's own constants, so the rule and the sentence cannot disagree.
 */

export const BADGE_IDS = [
  'firstFood', 'threeMeals', 'ownFood', 'firstWeighIn', 'proteinDay', 'fiberDay', 'fullRegister', 'onPlanCut',
  'threeHalls', 'sevenDays', 'proteinFive', 'twentyFiveFoods', 'tenWeighIns', 'adaptive', 'thirtyDays',
  'hundredFoods',
] as const
export type BadgeId = (typeof BADGE_IDS)[number]

/** The meals a whole day is made of. A snack is food, but it is not one of the three. */
export const DAY_MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner']
export const WEEK_DAYS = 7
export const LONG_DAYS = 30
export const PROTEIN_DAYS = 5
export const SOME_FOODS = 25
export const MANY_FOODS = 100
export const MANY_WEIGH_INS = 10
export const HALL_COUNT = 3
/** How close to a target still counts as landing on it, as a percentage, for the all-four-inks badge. */
export const BAND_PCT = 10
/** The floor under the cut badge: at or under target, but no lower than this share of it. */
export const CUT_FLOOR_PCT = 90
/** Fiber is judged per this many kcal, as UT publishes fiber per serving and the guideline is a ratio. */
export const FIBER_PER = 1000

export interface BadgeProgress { readonly have: number; readonly need: number }

export interface Badge {
  readonly id: BadgeId
  readonly title: string
  readonly description: string
  readonly earned: boolean
  /** The date the badge was earned, or null while it is unearned. */
  readonly earnedOn: string | null
  /** "Earned 9/12", or null while it is unearned. */
  readonly earnedLabel: string | null
  readonly progress: BadgeProgress
  /** "4 of 7". Printed on the unearned stamps, under the mark. */
  readonly progressLabel: string
}

export interface Achievements {
  readonly earned: number
  readonly total: number
  /** The one plain line the panel leads with: "7 of 16 earned". */
  readonly summary: string
  readonly badges: readonly Badge[]
}

export interface BadgeInput {
  readonly entries: readonly LogEntry[]
  readonly weights: readonly WeightEntry[]
  readonly profile: ProfileRow | null
  readonly today: string
  readonly t: T
}

interface Rule {
  /** Ascending dates, one per unit of progress. */
  readonly hits: readonly string[]
  readonly need: number
  /** Progress on its own scale, where earning is one thing and getting there is measured as another. */
  readonly progress?: BadgeProgress
  /** The figures the badge's own description prints, taken from the same constants the rule runs on. */
  readonly params?: Params
}

const ascending = (a: string, b: string): number => a.localeCompare(b)

/** Ascending dates on which a key was seen for the first time. A row with no key (no hall) is not a first. */
function firstSeen(rows: readonly LogEntry[], key: (e: LogEntry) => string | null): string[] {
  const seen = new Set<string>()
  const dates: string[] = []
  for (const e of rows) {
    const k = key(e)
    if (k === null || seen.has(k)) continue
    seen.add(k)
    dates.push(e.date)
  }
  return dates
}

/**
 * What makes two logged rows the same food. UT's recipe number where there is one, the custom food's id where
 * the food was typed in, and otherwise the name: a row logged from a feed that has since rolled over keeps its
 * recipe number, so it still counts as itself.
 */
function foodKey(e: LogEntry): string {
  return e.recipeNumber ?? e.customFoodId ?? e.name.trim().toLowerCase()
}

function fiberPer(d: DayTotal): number {
  // A day with rows but no calories (water, black coffee) divides by nothing; it is not a fiber day either.
  return d.nutrients.calories <= 0 ? 0 : (d.nutrients.fiber * FIBER_PER) / d.nutrients.calories
}

/**
 * How many of the four targets the day landed within the band of. The band never closes to nothing: a target of
 * 0 — which the Goals form accepts, and which `computeTargets` can floor carbs to on its own — would otherwise
 * demand an exact 0.0 g instead of the ±10% the badge's own description promises, and print "3 of 4" forever.
 */
function onTargets(d: DayTotal, targets: Targets): number {
  return TARGET_KEYS.filter((k) => Math.abs(d.nutrients[k] - targets[k]) <= Math.max(1, (targets[k] * BAND_PCT) / 100)).length
}

/**
 * The targets a day was judged against: the ones in force on *that* day, from the last weigh-in on or before it.
 *
 * Every target badge used to read the reader's current targets, and the commonest way to move those is to step
 * on the scale after a gain — `computeTargets` reads protein off the weigh-in and calories off maintenance — so
 * one heavier weigh-in silently revoked the protein, full-register and on-plan stamps for days that had not
 * changed at all. PRODUCT.md: earned from real logged data, and never taken away.
 *
 * ponytail: the profile keeps exactly one step of TDEE history (`tdeePrevious`), so a day before the last
 * adaptive run is judged against the estimate that run replaced, and no further back. It keeps no history at all
 * of a hand-typed override or of the goal, so editing either still re-judges every day. A stored earn date per
 * badge is the only thing that would do better; see the note at the top of the file.
 */
function dayTargets(profile: ProfileRow | null, weights: readonly WeightEntry[]): (date: string) => Targets | null {
  const scale = weights.filter((w) => w.deletedAt === null).sort((a, b) => ascending(a.date, b.date))
  const first = scale[0]
  if (profile === null || first === undefined) return () => null
  return (date) => {
    const { tdeePrevious, tdeeUpdatedOn } = profile
    const at = tdeePrevious !== null && tdeeUpdatedOn !== null && date < tdeeUpdatedOn
      ? { ...profile, tdeeEstimate: tdeePrevious }
      : profile
    // A day logged before the first weigh-in is judged on that first one: it is the only weight ever recorded for it.
    // The year is the day's own, not today's, so the age the formula runs on is the one the reader was then.
    return computeTargets(at, (scale.findLast((w) => w.date <= date) ?? first).weightLb, Number(date.slice(0, 4)))
  }
}

function ruleSet(input: BadgeInput): Readonly<Record<BadgeId, Rule>> {
  const { profile, t } = input
  // Rows dated after today are not history: a day logged ahead on the Tracker cannot earn a badge before it happens.
  const live = input.entries.filter((e) => e.deletedAt === null && e.date <= input.today).sort((a, b) => ascending(a.date, b.date))
  const weighIns = input.weights.filter((w) => w.deletedAt === null && w.date <= input.today).map((w) => w.date).sort(ascending)
  const days = dailyTotals(live)
  const dayDates = days.map((d) => d.date)
  const foodDates = firstSeen(live, foodKey)

  // Meals per day, in the order the days were logged, which is ascending because `live` is.
  const mealsByDay = new Map<string, Set<Meal>>()
  for (const e of live) {
    const bucket = mealsByDay.get(e.date)
    if (bucket === undefined) mealsByDay.set(e.date, new Set([e.meal]))
    else bucket.add(e.meal)
  }
  const mealCount = (meals: ReadonlySet<Meal>): number => DAY_MEALS.filter((m) => meals.has(m)).length
  const bestMeals = Math.max(0, ...[...mealsByDay.values()].map(mealCount))
  const wholeDays = new Set([...mealsByDay].filter(([, meals]) => mealCount(meals) === DAY_MEALS.length).map(([date]) => date))

  const targetsOn = dayTargets(profile, input.weights)
  // A day that logged no calories — water, black coffee, a row typed in at zero — is not a day against a target,
  // the same way it is not a fiber day. Without this, targets of 0 (the Goals form takes them) hand every target
  // badge to a reader who logged nothing at all.
  const judged = days.filter((d) => d.nutrients.calories > 0).map((d) => ({ day: d, targets: targetsOn(d.date) }))
  const inks = (day: DayTotal, targets: Targets | null): number => (targets === null ? 0 : onTargets(day, targets))
  // A protein target of 0 is met by a day with no protein in it, so the protein stamps sit out that case.
  const proteinDays = judged
    .filter(({ day, targets }) => targets !== null && targets.protein > 0 && day.nutrients.protein >= targets.protein)
    .map(({ day }) => day.date)
  const bestInks = Math.max(0, ...judged.map(({ day, targets }) => inks(day, targets)))
  const fullDays = judged.filter(({ day, targets }) => inks(day, targets) === TARGET_KEYS.length).map(({ day }) => day.date)
  // Only while cutting, and never for eating less: at or under target, no lower than the floor, and only on a day
  // whose three meals are all logged — the band alone stamped a day whose dinner was eaten and never written down,
  // which is the one thing the badge's own sentence claims did not happen.
  const cutDays = profile?.goal !== 'cut' ? [] : judged
    .filter(({ day, targets }) => targets !== null && wholeDays.has(day.date) &&
      day.nutrients.calories <= targets.calories && day.nutrients.calories >= (targets.calories * CUT_FLOOR_PCT) / 100)
    .map(({ day }) => day.date)
  const adaptiveOn = profile?.tdeeUpdatedOn ?? null

  return {
    firstFood: { hits: live.map((e) => e.date), need: 1 },
    threeMeals: { hits: [...wholeDays], need: 1, progress: { have: bestMeals, need: DAY_MEALS.length } },
    ownFood: { hits: live.filter((e) => e.customFoodId !== null).map((e) => e.date), need: 1 },
    firstWeighIn: { hits: weighIns, need: 1 },
    proteinDay: { hits: proteinDays, need: 1 },
    fiberDay: {
      hits: days.filter((d) => fiberPer(d) >= FIBER_PER_1000_KCAL).map((d) => d.date), need: 1,
      // Floored, not rounded: rounding up printed a full "14 of 14" bar under a stamp that had not been earned.
      progress: { have: Math.floor(Math.max(0, ...days.map(fiberPer))), need: FIBER_PER_1000_KCAL },
      params: { mark: t.n(FIBER_PER_1000_KCAL), per: t.n(FIBER_PER) },
    },
    fullRegister: { hits: fullDays, need: 1, progress: { have: bestInks, need: TARGET_KEYS.length }, params: { pct: t.n(BAND_PCT) } },
    onPlanCut: { hits: cutDays, need: 1, params: { floor: t.n(CUT_FLOOR_PCT) } },
    threeHalls: { hits: firstSeen(live, (e) => e.hall), need: HALL_COUNT, params: { halls: t.n(HALL_COUNT) } },
    sevenDays: { hits: dayDates, need: WEEK_DAYS, params: { days: t.n(WEEK_DAYS) } },
    proteinFive: { hits: proteinDays, need: PROTEIN_DAYS, params: { days: t.n(PROTEIN_DAYS) } },
    twentyFiveFoods: { hits: foodDates, need: SOME_FOODS, params: { count: t.n(SOME_FOODS) } },
    tenWeighIns: { hits: weighIns, need: MANY_WEIGH_INS, params: { count: t.n(MANY_WEIGH_INS) } },
    adaptive: { hits: adaptiveOn === null ? [] : [adaptiveOn], need: 1 },
    thirtyDays: { hits: dayDates, need: LONG_DAYS, params: { days: t.n(LONG_DAYS) } },
    hundredFoods: { hits: foodDates, need: MANY_FOODS, params: { count: t.n(MANY_FOODS) } },
  }
}

/**
 * "Earned 9/20" for a stamp printed this year, "Earned 9/20/2025" for an older one. The long-haul badges are
 * built for a reader who is still here two semesters later, and by then a bare month and day says nothing.
 */
function earnedLabel(on: string, today: string, t: T): string {
  const year = on.slice(0, 4)
  const params = { date: dateLabel(on, t).date, year }
  return t.t(year === today.slice(0, 4) ? 'badge.earnedOn' : 'badge.earnedOnYear', params)
}

/** Every badge, in the order they are printed: the early ones first, the long haul last. */
export function achievements(input: BadgeInput): Achievements {
  const t = input.t
  const rules = ruleSet(input)
  const badges: Badge[] = BADGE_IDS.map((id) => {
    const { hits, need, progress, params } = rules[id]
    // The unit that got there. Reading the date off the list rather than comparing lengths keeps "earned" and
    // "earned on" the same answer: a badge cannot be earned with no date, or dated without being earned.
    const on = hits[need - 1] ?? null
    const shown = progress?.need ?? need
    const have = Math.min(progress?.have ?? hits.length, shown)
    const title: Key = `badge.${id}.title`
    const description: Key = `badge.${id}.desc`
    return {
      id,
      title: t.t(title),
      description: t.t(description, params),
      earned: on !== null,
      earnedOn: on,
      earnedLabel: on === null ? null : earnedLabel(on, input.today, t),
      progress: { have, need: shown },
      progressLabel: t.t('badge.progress', { have: t.n(have), need: t.n(shown) }),
    }
  })
  const earned = badges.filter((b) => b.earned).length
  return { earned, total: badges.length, summary: t.t('badge.summary', { earned: t.n(earned), total: t.n(badges.length) }), badges }
}
