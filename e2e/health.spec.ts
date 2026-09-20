import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { addDays, localDateKey } from '../src/dates'
import { type Gap, pickFoods as pickFoodsIn, type Pick } from '../src/health'
import { translator } from '../src/i18n'
import { fetchMenu } from '../src/menu/feed'
import { HOURS_URL, parseHours, type Hours } from '../src/menu/hours'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../tests/helpers/supabase'
import { expect, test } from './fixtures'

// The menu stays live, as it does in menu.spec: these assertions are derived from the same feed the app loads.
// The hall *clock* is the one input a test cannot choose, and a spec that only suggests food between 11am and 9pm
// is a spec that fails at midnight, so the hours feed is pinned to "J2 open, the others shut" and nothing else is.
const OPEN_ALL_DAY = 'const diningHours = ' + JSON.stringify({
  'Fall 2026 Semester (08/24/26 - 12/15/26)': {
    'Dining Halls': {
      'J2 Dining': Array.from({ length: 7 }, () => '12:00am-11:59pm'),
      'Jester City Limits': Array.from({ length: 7 }, () => 'Closed'),
      'Kins Dining': Array.from({ length: 7 }, () => 'Closed'),
    },
  },
}) + ';'

const HOURS: Hours = parseHours(OPEN_ALL_DAY, localDateKey(new Date()))

async function pinHours(page: Page): Promise<void> {
  await page.route(`${HOURS_URL}*`, (route) => route.fulfill({ body: OPEN_ALL_DAY, contentType: 'text/plain' }))
}

async function signUp(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
}

// Same inputs as the screen, so the expected list is the module's own ranking rather than a pinned menu.
async function expectedPicks(gap: Gap | null, flags: { sodiumHigh: boolean; fiberLow: boolean }) {
  const now = new Date()
  const picks: Pick[] = pickFoodsIn({ menu: await fetchMenu(fetch), hours: HOURS, now, today: localDateKey(now), gap, ...flags, t: translator('en') })
  if (picks.length === 0) throw new Error('UT posts nothing at J2 for the current service; cannot check suggestions')
  return picks
}

test('a brand-new account reads as a page, not a wall of zeros', async ({ page }) => {
  await pinHours(page)
  await signUp(page)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Health' }).click()

  await expect(page.getByRole('region', { name: 'Today' })).toContainText('Nothing logged today, and no targets set yet.')
  await expect(page.getByRole('button', { name: 'Set up your goals' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Last 7 days' })).toContainText('0 of 7 days logged')
  await expect(page.getByRole('region', { name: 'Last 7 days' })).toContainText('Nothing logged in the last 7 days, so there is no average to read yet.')
  // Each block says what it will read once there is something to read, instead of printing three or four zeros.
  await expect(page.getByRole('region', { name: 'Macro balance' })).toContainText('Log a few days and this reads protein, carbs and fat')
  await expect(page.getByRole('region', { name: 'Diet quality' })).toContainText('Log a few days and this reads fiber, sodium, sugar')
  await expect(page.locator('.health')).not.toContainText('0 g')

  // With no targets to close, the suggestions fall back to protein per 100 kcal, and still name real food.
  const picks = await expectedPicks(null, { sodiumHigh: false, fiberLow: false })
  const rows = page.getByRole('list', { name: 'Suggested foods' }).getByRole('listitem')
  await expect(rows).toHaveCount(picks.length)
  await expect(rows.first()).toContainText(picks[0]?.item.name ?? '')
  await expect(rows.first()).toContainText('g of protein in')
})

test('a logged week reads back in plain sentences, and a suggestion can be added from here', async ({ page }) => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  const { error: signUpError } = await client.auth.signUp({ email, password })
  expect(signUpError).toBeNull()
  const now = new Date().toISOString()
  const today = localDateKey(new Date())
  const targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 }
  expect((await client.from('profile').insert({
    sex: 'male', birth_year: 2006, height_in: 70, activity: 'moderate', goal: 'maintain', rate_lb_per_week: 0,
    override: targets, adaptive_enabled: false, updated_at: now,
  })).error).toBeNull()
  expect((await client.from('weights').insert({ id: crypto.randomUUID(), date: addDays(today, -1), weight_lb: 170, updated_at: now })).error).toBeNull()
  // Three days, none of them today: short on protein and fat, steady on carbs, and heavy on sodium and sugar.
  expect((await client.from('food_log').insert([1, 2, 3].map((back) => ({
    id: crypto.randomUUID(), date: addDays(today, -back), meal: 'dinner', hall: 'J2', station: 'Grill',
    name: `Seeded Day ${String(back)}`, portion: '1 plate', servings: 1, updated_at: now,
    per_serving: { calories: 1500, protein: 60, carbs: 200, fat: 40, fiber: 10, sugar: 60, sodium: 3000 },
  })))).error).toBeNull()

  await pinHours(page)
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Health' }).click()

  await expect(page.getByRole('region', { name: 'Today' })).toContainText('Nothing logged today. 2,000 kcal and 150 g of protein to go.')
  const week = page.getByRole('region', { name: 'Last 7 days' })
  await expect(week).toContainText('3 of 7 days logged')
  await expect(week).toContainText('Averaging 1,500 kcal on the 3 days you logged against 2,000. About 500 under.')

  // The macro read names the macro, counts the days, and prints both numbers. No badge, no grade, no blame.
  const macros = page.getByRole('region', { name: 'Macro balance' })
  await expect(macros).toContainText('Short on 3 of 3 logged days, averaging 60 g against 150 g.')
  await expect(macros).toContainText('16% of calories · target 30%')
  await expect(macros).toContainText('Steady, averaging 200 g against 200 g.')
  await expect(macros).toContainText('Short on 3 of 3 logged days, averaging 40 g against 60 g.')

  // Diet quality is UT's own numbers against published marks, with the sugar caveat said out loud.
  const quality = page.getByRole('region', { name: 'Diet quality' })
  await expect(quality).toContainText('6.7 g per 1,000 kcal, against the 14 g mark.')
  await expect(quality).toContainText('3,000 mg a day, against the 2,300 mg mark.')
  await expect(quality).toContainText('16% of calories, against the 10% mark for added sugar.')
  await expect(quality).toContainText('UT publishes total sugar only')
  await expect(quality).toContainText('Nothing logged in the last 7 days carried a UT label.')

  // The suggestions know the week ran low on fiber and high on sodium, and rank accordingly.
  const picks = await expectedPicks({ remaining: targets, targets }, { sodiumHigh: true, fiberLow: true })
  const rows = page.getByRole('list', { name: 'Suggested foods' }).getByRole('listitem')
  await expect(rows).toHaveCount(picks.length)
  const first = picks[0]
  if (first === undefined) throw new Error('no suggestions')
  await expect(rows.first()).toContainText(first.item.name)
  await expect(rows.first()).toContainText(first.reason)
  await expect(rows.first()).toContainText(`${first.hall} · ${first.item.station ?? ''}`)
  await expect(rows.first()).toContainText(`${first.meal} · now`)

  // Adding from Health opens the same food sheet as the Menu, and logs to today.
  await rows.first().getByRole('button').click()
  const sheet = page.getByRole('dialog', { name: first.item.name })
  await expect(sheet).toContainText(`Portion: ${first.item.portion}`)
  await sheet.getByRole('button', { name: 'Add' }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: /^Added to / })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Today' })).toContainText(`of 2,000 kcal today,`)

  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(page.locator('.date-nav h2')).toHaveText('Today')
  await expect(page.getByRole('region', { name: 'Logged foods' })).toContainText(first.item.name)
})
