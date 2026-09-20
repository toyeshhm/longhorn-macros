import { describe, expect, test } from 'vitest'
import {
  achievements, BADGE_IDS, BAND_PCT, FIBER_PER, MANY_FOODS, SOME_FOODS,
  type Achievements, type Badge, type BadgeId, type BadgeInput,
} from '../src/achievements'
import type { LogEntry, ProfileRow, WeightEntry } from '../src/db/types'
import type { Targets } from '../src/goals'
import { translator } from '../src/i18n'
import { zeroNutrients, type Nutrients } from '../src/nutrition'

const t = translator('en')
const TODAY = '2026-09-30'
const TARGETS: Targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 }

const nutrients = (over: Partial<Nutrients>): Nutrients => ({ ...zeroNutrients(), ...over })

let seq = 0
const entry = (over: Partial<LogEntry> = {}): LogEntry => ({
  id: `e${String(seq++)}`, date: '2026-09-02', meal: 'lunch', hall: 'J2', station: 'Grill', name: 'Grilled Chicken',
  recipeNumber: null, customFoodId: null, portion: '1 each', servings: 1, perServing: zeroNutrients(),
  updatedAt: '', deletedAt: null, ...over,
})

const weighIn = (date: string, over: Partial<WeightEntry> = {}): WeightEntry => ({
  id: `w${String(seq++)}`, date, weightLb: 170, updatedAt: '', deletedAt: null, ...over,
})

const profileRow = (over: Partial<ProfileRow> = {}): ProfileRow => ({
  id: 'u', sex: 'male', birthYear: 2005, heightIn: 70, activity: 'moderate', goal: 'maintain', rateLbPerWeek: 0,
  override: null, adaptiveEnabled: false, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null,
  updatedAt: '', deletedAt: null, ...over,
})

/**
 * Targets are no longer handed in: they are read back off the profile and the weigh-ins, per day. Pinning all
 * four with an override is how a test says "these targets, on every day" without the Mifflin arithmetic; the
 * per-day reading itself is what the last describe block is about.
 */
const onTargets = (over: Partial<ProfileRow> = {}): Partial<BadgeInput> =>
  ({ profile: profileRow({ override: TARGETS, ...over }), weights: [weighIn('2026-08-01')] })

const run = (over: Partial<BadgeInput> = {}): Achievements =>
  achievements({ entries: [], weights: [], profile: null, today: TODAY, t, ...over })

function badge(result: Achievements, id: BadgeId): Badge {
  const found = result.badges.find((b) => b.id === id)
  if (found === undefined) throw new Error(`no badge ${id}`)
  return found
}

/** A day's worth of rows: one lunch carrying the whole day's nutrients. */
const day = (date: string, over: Partial<Nutrients>): LogEntry => entry({ date, perServing: nutrients(over) })

/** The same day logged whole — the three meals the cut stamp asks for, with lunch carrying the nutrients. */
const wholeDay = (date: string, over: Partial<Nutrients>): LogEntry[] =>
  [entry({ date, meal: 'breakfast' }), day(date, over), entry({ date, meal: 'dinner' })]

describe('a brand-new account', () => {
  test('prints every badge unearned, with progress, and nothing missing', () => {
    const fresh = run()
    expect(fresh.badges.map((b) => b.id)).toEqual([...BADGE_IDS])
    expect(fresh.total).toBe(16)
    expect(fresh.earned).toBe(0)
    expect(fresh.summary).toBe('0 of 16 earned')
    for (const b of fresh.badges) {
      expect({ id: b.id, earned: b.earned, on: b.earnedOn, label: b.earnedLabel })
        .toEqual({ id: b.id, earned: false, on: null, label: null })
      expect(b.title.trim(), b.id).not.toBe('')
      expect(b.description, b.id).not.toContain('{')
      expect(b.progress.need, b.id).toBeGreaterThan(0)
      expect(b.progressLabel, b.id).toBe(`0 of ${String(b.progress.need)}`)
    }
  })

  test('the descriptions print the same figures the rules run on', () => {
    const fresh = run()
    expect(badge(fresh, 'sevenDays').description).toBe('Log something on 7 different days. They do not have to be in a row.')
    expect(badge(fresh, 'fiberDay').description).toBe(`Eat 14 g of fiber per ${t.n(FIBER_PER)} kcal in one day.`)
    expect(badge(fresh, 'fullRegister').description).toBe(`Land calories and all three macros within ${String(BAND_PCT)}% of target on one day.`)
    expect(badge(fresh, 'twentyFiveFoods').description).toBe(`Log ${String(SOME_FOODS)} different foods.`)
    expect(badge(fresh, 'hundredFoods').description).toBe(`Log ${String(MANY_FOODS)} different foods.`)
    expect(badge(fresh, 'onPlanCut').description).toContain('90%')
    expect(badge(fresh, 'threeHalls').description).toBe('Log food at 3 different dining halls.')
    expect(badge(fresh, 'adaptive').description).toBe('Let the app learn your maintenance calories and adjust your target.')
  })
})

describe('the first stamps', () => {
  test('one logged food earns the first print, dated the day it was logged', () => {
    const result = run({ entries: [entry({ date: '2026-09-02' })] })
    const first = badge(result, 'firstFood')
    expect({ earned: first.earned, on: first.earnedOn, label: first.earnedLabel })
      .toEqual({ earned: true, on: '2026-09-02', label: 'Earned 9/2' })
    expect(first.progressLabel).toBe('1 of 1')
    expect(result.earned).toBe(1)
    expect(result.summary).toBe('1 of 16 earned')
    expect(badge(result, 'sevenDays').progressLabel).toBe('1 of 7')
  })

  test('a stamp printed in an earlier year says which year, because the long haul outlives a semester', () => {
    expect(badge(run({ entries: [entry({ date: '2025-11-08' })] }), 'firstFood').earnedLabel).toBe('Earned 11/8/2025')
  })

  test('a food typed in by hand earns the off-menu stamp; one off the menu does not', () => {
    expect(badge(run({ entries: [entry({ customFoodId: 'c1' })] }), 'ownFood').earned).toBe(true)
    expect(badge(run({ entries: [entry({ recipeNumber: '4321' })] }), 'ownFood').earned).toBe(false)
  })

  test('deleted rows and rows dated after today earn nothing', () => {
    const result = run({
      entries: [entry({ deletedAt: '2026-09-03T00:00:00Z' }), entry({ date: '2026-10-05' })],
      weights: [weighIn('2026-09-04', { deletedAt: '2026-09-05T00:00:00Z' }), weighIn('2026-10-06')],
    })
    expect(result.earned).toBe(0)
    expect(badge(result, 'firstFood').earned).toBe(false)
    expect(badge(result, 'firstWeighIn').earned).toBe(false)
  })
})

describe('days logged', () => {
  test('seven days in any order earn the seventh, and thirty keeps counting', () => {
    const dates = ['2026-09-08', '2026-09-01', '2026-09-05', '2026-09-03', '2026-09-07', '2026-09-02', '2026-09-06', '2026-09-04']
    const result = run({ entries: dates.map((d) => entry({ date: d })) })
    const week = badge(result, 'sevenDays')
    // The seventh day *chronologically*, not the seventh row handed in.
    expect({ earned: week.earned, on: week.earnedOn }).toEqual({ earned: true, on: '2026-09-07' })
    expect(week.progressLabel).toBe('7 of 7')
    expect(badge(result, 'thirtyDays').progressLabel).toBe('8 of 30')
    expect(badge(result, 'thirtyDays').earned).toBe(false)
  })

  test('a breakfast, a lunch and a dinner on one day earn the full plate; a snack is not one of the three', () => {
    const twoMeals = run({ entries: [entry({ date: '2026-09-02', meal: 'breakfast' }), entry({ date: '2026-09-02', meal: 'snack' })] })
    expect(badge(twoMeals, 'threeMeals').progressLabel).toBe('1 of 3')

    const result = run({
      entries: [
        entry({ date: '2026-09-02', meal: 'breakfast' }), entry({ date: '2026-09-02', meal: 'lunch' }),
        entry({ date: '2026-09-03', meal: 'breakfast' }), entry({ date: '2026-09-03', meal: 'lunch' }),
        entry({ date: '2026-09-03', meal: 'dinner' }), entry({ date: '2026-09-03', meal: 'snack' }),
      ],
    })
    const plate = badge(result, 'threeMeals')
    expect({ earned: plate.earned, on: plate.earnedOn, progress: plate.progress })
      .toEqual({ earned: true, on: '2026-09-03', progress: { have: 3, need: 3 } })
  })
})

describe('where and what was eaten', () => {
  test('three different halls earn the tour; a hall-less row and a repeat are not a new hall', () => {
    const entries = [
      entry({ date: '2026-09-01', hall: 'J2' }), entry({ date: '2026-09-02', hall: null, customFoodId: 'c1' }),
      entry({ date: '2026-09-03', hall: 'J2' }), entry({ date: '2026-09-04', hall: 'JCL' }),
      entry({ date: '2026-09-05', hall: 'Kins' }),
    ]
    const result = run({ entries })
    const tour = badge(result, 'threeHalls')
    expect({ earned: tour.earned, on: tour.earnedOn }).toEqual({ earned: true, on: '2026-09-05' })
    expect(badge(run({ entries: entries.slice(0, 4) }), 'threeHalls').progressLabel).toBe('2 of 3')
  })

  test('distinct foods count by recipe number, by custom food and otherwise by name', () => {
    const result = run({
      entries: [
        entry({ recipeNumber: '1', name: 'Rice' }), entry({ recipeNumber: '1', name: 'Rice' }),
        entry({ customFoodId: 'c1', name: 'Bar' }), entry({ customFoodId: 'c1', name: 'Bar' }),
        entry({ name: 'Tofu Scramble' }), entry({ name: ' tofu scramble ' }), entry({ name: 'Migas Taco' }),
      ],
    })
    expect(badge(result, 'twentyFiveFoods').progressLabel).toBe('4 of 25')
    expect(badge(result, 'hundredFoods').progressLabel).toBe('4 of 100')
  })

  test('twenty-five different foods earn the explorer, dated the twenty-fifth', () => {
    const entries = Array.from({ length: SOME_FOODS }, (_, i) => entry({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, name: `Food ${String(i)}` }))
    const explorer = badge(run({ entries }), 'twentyFiveFoods')
    expect({ earned: explorer.earned, on: explorer.earnedOn }).toEqual({ earned: true, on: '2026-09-25' })
  })
})

describe('the target badges', () => {
  test('nothing that needs a target is earnable without one, and none of it reads as broken', () => {
    const result = run({ entries: [day('2026-09-02', { calories: 2000, protein: 150, carbs: 200, fat: 60, fiber: 30 })] })
    for (const id of ['proteinDay', 'proteinFive', 'fullRegister', 'onPlanCut'] as const) {
      expect(badge(result, id).earned, id).toBe(false)
      expect(badge(result, id).progress.have, id).toBe(0)
    }
    // Fiber needs no target: it is a ratio of what was eaten.
    expect(badge(result, 'fiberDay').earned).toBe(true)
  })

  test('the protein target met on a day earns one stamp, and on five days the other', () => {
    const entries = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']
      .map((d) => day(d, { calories: 2000, protein: 160 }))
    const one = run({ entries: entries.slice(0, 2), ...onTargets() })
    expect(badge(one, 'proteinDay').earnedOn).toBe('2026-09-01')
    expect(badge(one, 'proteinFive').progressLabel).toBe('2 of 5')

    const five = run({ entries, ...onTargets() })
    expect(badge(five, 'proteinFive').earnedOn).toBe('2026-09-05')
    // Short of the target is not a hit, and it costs nothing that was already earned.
    expect(badge(run({ entries: [day('2026-09-01', { calories: 2000, protein: 100 })], ...onTargets() }), 'proteinDay').earned).toBe(false)
  })

  test('all four inks within the band on one day earn the full register, and part of the way reads as part of the way', () => {
    const near = run({ entries: [day('2026-09-02', { calories: 1900, protein: 145, carbs: 140, fat: 20 })], ...onTargets() })
    expect(badge(near, 'fullRegister').progress).toEqual({ have: 2, need: 4 })
    const onRegister = run({ entries: [day('2026-09-02', { calories: 2050, protein: 143, carbs: 210, fat: 57 })], ...onTargets() })
    expect(badge(onRegister, 'fullRegister').earnedOn).toBe('2026-09-02')
  })

  test('a fiber-rich day is a ratio, a day with no calories is not one, and progress never overshoots', () => {
    const rich = run({ entries: [day('2026-09-02', { calories: 2000, fiber: 40 })] })
    expect(badge(rich, 'fiberDay').earnedOn).toBe('2026-09-02')
    expect(badge(rich, 'fiberDay').progress).toEqual({ have: 14, need: 14 }) // 20 per 1000, capped at what it needed
    const thin = run({ entries: [day('2026-09-02', { calories: 2000, fiber: 14 })] })
    expect(badge(thin, 'fiberDay').progressLabel).toBe('7 of 14')
    const nothing = run({ entries: [day('2026-09-02', { calories: 0, fiber: 6 })] })
    expect(badge(nothing, 'fiberDay').progressLabel).toBe('0 of 14')
  })

  test('the cut stamp is for landing on the plan, never for eating less, and only while cutting', () => {
    const cutting = onTargets({ goal: 'cut', rateLbPerWeek: 1 })
    const onPlan = wholeDay('2026-09-02', { calories: 1900 })
    expect(badge(run({ ...cutting, entries: onPlan }), 'onPlanCut').earnedOn).toBe('2026-09-02')
    // Far under target earns nothing: the badge would otherwise pay for skipping meals.
    expect(badge(run({ ...cutting, entries: wholeDay('2026-09-02', { calories: 1200 }) }), 'onPlanCut').earned).toBe(false)
    // Over target is not on plan either.
    expect(badge(run({ ...cutting, entries: wholeDay('2026-09-02', { calories: 2400 }) }), 'onPlanCut').earned).toBe(false)
    // Nor is a day that landed in the band with its dinner eaten and never written down, which is the one thing
    // the badge's own sentence claims did not happen.
    expect(badge(run({ ...cutting, entries: onPlan.slice(0, 2) }), 'onPlanCut').earned).toBe(false)
    // Nor a day on any other goal, nor one with no targets to land on.
    expect(badge(run({ ...onTargets({ goal: 'maintain' }), entries: onPlan }), 'onPlanCut').earned).toBe(false)
    expect(badge(run({ entries: onPlan, profile: profileRow({ goal: 'cut' }) }), 'onPlanCut').earned).toBe(false)
  })

  test('a target of zero, and a day that logged no calories, hand out nothing', () => {
    // Every override the Goals form will take set to 0: a day of water then sits inside every band at once.
    const zeroed = { profile: profileRow({ override: { calories: 0, protein: 0, carbs: 0, fat: 0 } }), weights: [weighIn('2026-08-01')] }
    const water = run({ ...zeroed, entries: [day('2026-09-02', { calories: 0 })] })
    for (const id of ['proteinDay', 'proteinFive', 'fullRegister', 'onPlanCut'] as const) {
      expect(badge(water, id).earned, id).toBe(false)
    }
    // A real day against a protein target of 0 is still not a protein day: it is met by eating no protein at all.
    const fed = run({ ...zeroed, entries: [day('2026-09-02', { calories: 1800, protein: 0, carbs: 0, fat: 0 })] })
    expect(badge(fed, 'proteinDay').earned).toBe(false)
    // The band never closes to nothing, though: 0 g of carbs against a target of 0 is landing on it, not missing
    // it by a hair, so the full register is reachable rather than stuck at "3 of 4" forever.
    expect(badge(fed, 'fullRegister').progress).toEqual({ have: 3, need: 4 })
  })
})

describe('the scale and the learned target', () => {
  test('weigh-ins earn the first and the tenth, in date order whatever order they arrive in', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-09-${String(10 - i).padStart(2, '0')}`)
    const result = run({ weights: dates.map((d) => weighIn(d)) })
    expect(badge(result, 'firstWeighIn').earnedOn).toBe('2026-09-01')
    expect(badge(result, 'tenWeighIns').earnedOn).toBe('2026-09-10')
    expect(badge(run({ weights: dates.slice(0, 3).map((d) => weighIn(d)) }), 'tenWeighIns').progressLabel).toBe('3 of 10')
  })

  test('the learned maintenance stamp is dated the day the app moved the target', () => {
    expect(badge(run({ profile: profileRow({ tdeeEstimate: 2500, tdeeUpdatedOn: '2026-09-14' }) }), 'adaptive'))
      .toMatchObject({ earned: true, earnedOn: '2026-09-14', earnedLabel: 'Earned 9/14' })
    expect(badge(run({ profile: profileRow() }), 'adaptive').earned).toBe(false)
  })
})

describe('the targets as they stood that day', () => {
  // Every target badge used to be re-judged against the reader's *current* targets, and the commonest way to
  // move those is to step on the scale after a gain. These are the cases that used to un-print a stamp.
  const cutter = (over: Partial<ProfileRow> = {}): ProfileRow => profileRow({ goal: 'cut', rateLbPerWeek: 1, ...over })

  test('weighing in heavier later does not take back the protein stamp', () => {
    const light = [weighIn('2026-09-01', { weightLb: 150 })]
    const logged = [day('2026-09-02', { calories: 2000, protein: 155 })]
    const then = run({ entries: logged, weights: light, profile: cutter() })
    expect(badge(then, 'proteinDay').earnedOn).toBe('2026-09-02')
    // 200 lb on a cut is a 200 g target today. The day is still judged on the 150 it was logged against.
    const heavier = run({ entries: logged, weights: [...light, weighIn('2026-09-20', { weightLb: 200 })], profile: cutter() })
    expect(badge(heavier, 'proteinDay').earnedOn).toBe('2026-09-02')
  })

  test('a day logged before the first weigh-in is judged on that first one', () => {
    const result = run({
      entries: [day('2026-08-20', { calories: 2000, protein: 155 })],
      weights: [weighIn('2026-09-01', { weightLb: 150 })], profile: cutter(),
    })
    expect(badge(result, 'proteinDay').earnedOn).toBe('2026-08-20')
  })

  test('a day before the last adaptive run is judged on the estimate that run replaced', () => {
    // 2200 kcal maintenance less the 500 the cut plans for is a 1700 target; the run moved it to 2100.
    const profile = cutter({ tdeeEstimate: 2600, tdeePrevious: 2200, tdeeUpdatedOn: '2026-09-10' })
    const result = run({
      entries: [...wholeDay('2026-09-05', { calories: 1650 }), ...wholeDay('2026-09-15', { calories: 1650 })],
      weights: [weighIn('2026-09-01', { weightLb: 150 })], profile,
    })
    // Only the earlier day landed on plan: 1650 is under the newer target's 90% floor of 1890.
    expect(badge(result, 'onPlanCut').earnedOn).toBe('2026-09-05')
  })

  test('a profile with nothing on the scale has no targets to judge a day against', () => {
    const result = run({ entries: [day('2026-09-02', { calories: 2000, protein: 155 })], profile: cutter() })
    for (const id of ['proteinDay', 'fullRegister', 'onPlanCut'] as const) expect(badge(result, id).earned, id).toBe(false)
  })
})

describe('the sheet as a whole', () => {
  test('a well-used account earns the early stamps and still has the long haul to go', () => {
    const entries = [
      entry({ date: '2026-09-01', meal: 'breakfast', hall: 'J2', name: 'Oatmeal', perServing: nutrients({ calories: 400, protein: 12, fiber: 8 }) }),
      entry({ date: '2026-09-01', meal: 'lunch', hall: 'JCL', name: 'Chicken', perServing: nutrients({ calories: 800, protein: 80, fiber: 6 }) }),
      entry({ date: '2026-09-01', meal: 'dinner', hall: 'Kins', name: 'Salmon', perServing: nutrients({ calories: 800, protein: 70, fiber: 16 }) }),
      entry({ date: '2026-09-02', meal: 'lunch', customFoodId: 'c1', hall: null, name: 'Migas Taco', perServing: nutrients({ calories: 500, protein: 20 }) }),
    ]
    const result = run({ entries, weights: [weighIn('2026-09-01')], profile: profileRow() })
    const earned = result.badges.filter((b) => b.earned).map((b) => b.id)
    expect(earned).toEqual(['firstFood', 'threeMeals', 'ownFood', 'firstWeighIn', 'proteinDay', 'fiberDay', 'threeHalls'])
    expect(result.summary).toBe('7 of 16 earned')
    expect(badge(result, 'sevenDays').progressLabel).toBe('2 of 7')
    expect(badge(result, 'hundredFoods').progressLabel).toBe('4 of 100')
  })

  test('every line is the reader’s language, figures and dates included', () => {
    const spanish = translator('es')
    const result = achievements({
      entries: [entry({ date: '2026-09-14' })], weights: [], profile: null, today: TODAY, t: spanish,
    })
    expect(result.summary).toBe('1 de 16 conseguidas')
    expect(badge(result, 'firstFood').title).toBe('Primera tirada')
    expect(badge(result, 'firstFood').earnedLabel).toBe('Conseguida el 14/9')
    expect(badge(result, 'sevenDays').progressLabel).toBe('1 de 7')
    expect(badge(result, 'fiberDay').description).toBe('Come 14 g de fibra por cada 1000 kcal en un día.')
  })
})
