import { expect, test } from 'vitest'
import { bmr, computeTargets, maintenance, plannedDelta, validateProfile, type Profile } from '../src/goals'

const base: Profile = {
  sex: 'male', birthYear: 2006, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
  override: null, adaptiveEnabled: true, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null,
}

// 170 lb, 2026 → age 20; kg 77.111, cm 177.8; BMR = 771.11+1111.25-100+5 = 1787.36
test('bmr male', () => { expect(bmr(base, 170, 2026)).toBeCloseTo(1787.36, 1) })
test('bmr female', () => { expect(bmr({ ...base, sex: 'female' }, 170, 2026)).toBeCloseTo(1621.36, 1) })

// tdee = 1787.36·1.55 = 2770.4 → 2270; fat round(0.25·2270/9)=63; carbs round((2270−680−567)/4)=round(255.75)=256
test('cut 1 lb/wk targets', () => {
  expect(computeTargets(base, 170, 2026)).toEqual({ calories: 2270, protein: 170, fat: 63, carbs: 256 })
})

// maintain: tdee = 1787.36·1.55 = 2770.4 → 2770 (delta 0); protein round(0.8·170)=136;
// fat round(0.25·2770/9)=77; carbs round((2770−544−693)/4)=round(383.25)=383
test('maintain uses 0.8 g/lb protein, delta 0', () => {
  const p: Profile = { ...base, goal: 'maintain', rateLbPerWeek: 0 }
  expect(plannedDelta(p)).toBe(0)
  expect(computeTargets(p, 170, 2026)).toEqual({ calories: 2770, protein: 136, fat: 77, carbs: 383 })
})

// bulk 0.5 lb/wk: delta = +250 → 2770.4+250=3020.4 → 3020; protein round(1·170)=170;
// fat round(0.25·3020/9)=round(83.89)=84; carbs round((3020−680−756)/4)=round(396)=396
test('bulk adds rate*500', () => {
  const p: Profile = { ...base, goal: 'bulk', rateLbPerWeek: 0.5 }
  expect(plannedDelta(p)).toBe(250)
  expect(computeTargets(p, 170, 2026)).toEqual({ calories: 3020, protein: 170, fat: 84, carbs: 396 })
})

test('calorie floor male 1500 / female 1200', () => {
  // tiny male, sedentary, cut 2 lb/wk, 100 lb: bmr=453.59+762-100+5=1120.59; tdee=1344.71;
  // -1000 → 344.71 → 345, floored to 1500; fat round(0.25·1500/9)=42; carbs round((1500−400−378)/4)=round(180.5)=181
  const male: Profile = { ...base, heightIn: 48, activity: 'sedentary', rateLbPerWeek: 2 }
  expect(computeTargets(male, 100, 2026)).toEqual({ calories: 1500, protein: 100, fat: 42, carbs: 181 })

  // tiny female, sedentary, cut 2 lb/wk, 100 lb: bmr=453.59+762-100-161=954.59; tdee=1145.51;
  // -1000 → 145.51 → 146, floored to 1200; fat round(0.25·1200/9)=33; carbs round((1200−400−297)/4)=round(125.75)=126
  const female: Profile = { ...male, sex: 'female' }
  expect(computeTargets(female, 100, 2026)).toEqual({ calories: 1200, protein: 100, fat: 33, carbs: 126 })
})

test('adaptive estimate overrides formula in maintenance()', () => {
  expect(maintenance({ ...base, tdeeEstimate: 2000 }, 170, 2026)).toBe(2000)
  // adaptiveEnabled only gates whether Task 13's runner computes a *new* estimate;
  // it doesn't gate consumption here — a previously-learned estimate still applies
  // even after the toggle is turned off (spec: "tdee_estimate if adaptive has
  // produced one, else formula TDEE" — no mention of the toggle at this layer).
  expect(maintenance({ ...base, adaptiveEnabled: false, tdeeEstimate: 2000 }, 170, 2026)).toBe(2000)
})

test('override replaces only given fields', () => {
  // protein override cascades into carbs: round((2270−4·200−9·63)/4)=round((2270−800−567)/4)=round(225.75)=226
  const p: Profile = { ...base, override: { protein: 200 } }
  expect(computeTargets(p, 170, 2026)).toEqual({ calories: 2270, protein: 200, fat: 63, carbs: 226 })
})

test('carbs never negative', () => {
  // tiny female floor case (calories 1200, fat 33) with protein overridden to 400:
  // round((1200−1600−297)/4)=round(-174.25)=-174 → floored to 0
  const p: Profile = { ...base, sex: 'female', heightIn: 48, activity: 'sedentary', rateLbPerWeek: 2, override: { protein: 400 } }
  expect(computeTargets(p, 100, 2026)).toEqual({ calories: 1200, protein: 400, fat: 33, carbs: 0 })
})

// The module names the bad field and stops there: the sentence is written on the screen, in the reader's
// language. It used to return English prose that the form then parsed back to find the field.
test('validateProfile names each bad field and says nothing about wording', () => {
  const fields = (p: Profile): string[] => validateProfile(p).map((e) => e.field)
  expect(validateProfile(base)).toEqual([])

  expect(fields({ ...base, birthYear: 1899 })).toEqual(['birthYear'])
  expect(fields({ ...base, birthYear: 2016 })).toEqual(['birthYear'])
  expect(fields({ ...base, birthYear: Number.POSITIVE_INFINITY })).toEqual(['birthYear'])

  expect(fields({ ...base, heightIn: 47 })).toEqual(['height'])
  expect(fields({ ...base, heightIn: 97 })).toEqual(['height'])

  expect(fields({ ...base, rateLbPerWeek: 3 })).toEqual(['rate'])

  // A field left out of the override is not validated; one inside the range passes.
  expect(fields({ ...base, override: { protein: Number.NaN, fat: -5, carbs: 20_000, calories: 500 } }))
    .toEqual(['protein', 'carbs', 'fat'])
  expect(fields({ ...base, override: { calories: 500 } })).toEqual([])

  // Every bad field is reported at once, in the order the form prints them.
  expect(fields({ ...base, birthYear: 0, heightIn: 0, rateLbPerWeek: 9, override: { fat: -1 } }))
    .toEqual(['birthYear', 'height', 'rate', 'fat'])
})
