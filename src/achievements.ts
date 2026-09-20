import { dateLabel } from './dates'
import type { LogEntry, Meal, ProfileRow, WeightEntry } from './db/types'
import { TARGET_KEYS, type Targets } from './goals'
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
 * got there, so it never moves when more data arrives. A few badges measure partial progress on a different
 * scale than they earn on (three meals in *one* day is earned once, but reads "2 of 3" on the way), and those
 * carry their own progress.
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
  readonly targets: Targets | null
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

/** How many of the four targets the day landed within the band of. */
function onTargets(d: DayTotal, targets: Targets): number {
  return TARGET_KEYS.filter((k) => Math.abs(d.nutrients[k] - targets[k]) <= (targets[k] * BAND_PCT) / 100).length
}

function ruleSet(input: BadgeInput): Readonly<Record<BadgeId, Rule>> {
  const { profile, targets, t } = input
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
  const wholeDays = [...mealsByDay].filter(([, meals]) => mealCount(meals) === DAY_MEALS.length).map(([date]) => date)

  const proteinDays = targets === null ? [] : days.filter((d) => d.nutrients.protein >= targets.protein).map((d) => d.date)
  const bestInks = targets === null ? 0 : Math.max(0, ...days.map((d) => onTargets(d, targets)))
  const fullDays = targets === null ? [] : days.filter((d) => onTargets(d, targets) === TARGET_KEYS.length).map((d) => d.date)
  // Only while cutting, and never for eating less: at or under target, and no lower than the floor.
  const cutDays = targets === null || profile?.goal !== 'cut' ? [] : days
    .filter((d) => d.nutrients.calories <= targets.calories && d.nutrients.calories >= (targets.calories * CUT_FLOOR_PCT) / 100)
    .map((d) => d.date)
  const adaptiveOn = profile?.tdeeUpdatedOn ?? null

  return {
    firstFood: { hits: live.map((e) => e.date), need: 1 },
    threeMeals: { hits: wholeDays, need: 1, progress: { have: bestMeals, need: DAY_MEALS.length } },
    ownFood: { hits: live.filter((e) => e.customFoodId !== null).map((e) => e.date), need: 1 },
    firstWeighIn: { hits: weighIns, need: 1 },
    proteinDay: { hits: proteinDays, need: 1 },
    fiberDay: {
      hits: days.filter((d) => fiberPer(d) >= FIBER_PER_1000_KCAL).map((d) => d.date), need: 1,
      progress: { have: Math.round(Math.max(0, ...days.map(fiberPer))), need: FIBER_PER_1000_KCAL },
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
      earnedLabel: on === null ? null : t.t('badge.earnedOn', { date: dateLabel(on, t).date }),
      progress: { have, need: shown },
      progressLabel: t.t('badge.progress', { have: t.n(have), need: t.n(shown) }),
    }
  })
  const earned = badges.filter((b) => b.earned).length
  return { earned, total: badges.length, summary: t.t('badge.summary', { earned: t.n(earned), total: t.n(badges.length) }), badges }
}
