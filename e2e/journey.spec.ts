import { devices } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { localDateKey } from '../src/dates'
import { fetchMenu } from '../src/menu/feed'
import { currentMeal, groupByStation } from '../src/menu/select'
import { expect, test, watchConsole } from './fixtures'

test.use({ allowFailedLoads: true }) // the offline leg makes sync requests fail on purpose

// The spec's canonical flow: sign up → profile/goal → add a menu item → offline → add another → online →
// both rows in Supabase → a second device signed in as the same user sees both on Today.
test('sign up, set goal, log online and offline, rows reach Supabase and a second device', async ({ page, browser, baseURL, consoleErrors, allowFailedLoads }) => {
  // Expected rows come from the same live feed the app loads (default hall J2, today, current meal).
  const menu = await fetchMenu(fetch)
  const now = new Date()
  const today = localDateKey(now)
  const day = menu.dates.includes(today) ? today : menu.dates[0]
  if (day === undefined) throw new Error('UT feed has no dates')
  const meals = (menu.days[day]?.find((h) => h.hall === 'J2')?.meals ?? []).filter((m) => m.items.length > 0)
  const mealName = currentMeal(meals.map((m) => m.name), now)
  const [first, second] = groupByStation(meals.find((m) => m.name === mealName)?.items ?? []).flatMap((s) => s.items)
  if (first === undefined || second === undefined) throw new Error(`J2 has fewer than 2 items posted for ${day}`)

  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })

  // Profile + goal.
  await expect(page.getByText('Set up your profile and first weigh-in')).toBeVisible()
  await page.getByLabel('Female', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2005')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('5')
  await page.getByLabel('Current weight (lb)').fill('140')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByLabel('Bulk').check()
  await page.getByLabel('Pace').selectOption({ label: 'gain 0.5 lb/week' })
  await page.getByRole('button', { name: 'Save goals' }).click()
  await expect(page.getByText('Set up your profile and first weigh-in')).toHaveCount(0)

  // Online add.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  const rows = page.locator('section.station button.food-row')
  const addRow = async (n: number, name: string): Promise<void> => {
    await expect(rows.nth(n)).toContainText(name)
    await rows.nth(n).click()
    const sheet = page.getByRole('dialog', { name })
    await sheet.getByRole('button', { name: 'Add' }).click()
    await expect(sheet).toBeHidden()
  }
  await addRow(0, first.name)

  // Offline add queues; reconnecting drains it.
  await page.context().setOffline(true)
  await addRow(1, second.name)
  const waiting = page.getByRole('status').filter({ hasText: /^\d+ changes? waiting to sync$/ })
  await expect(waiting).toBeVisible()
  await page.context().setOffline(false)
  await expect(waiting).toBeHidden()

  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: authError } = await client.auth.signInWithPassword({ email, password })
  expect(authError).toBeNull()
  const byName = (a: { name: string }, b: { name: string }): number => a.name.localeCompare(b.name)
  await expect.poll(async () => {
    const { data, error } = await client.from('food_log').select('name, recipe_number, hall, date, deleted_at')
    expect(error).toBeNull()
    return (data ?? []).sort(byName)
  }).toEqual([first, second].map((i) => ({ name: i.name, recipe_number: i.recipeNumber, hall: 'J2', date: today, deleted_at: null })).sort(byName))

  // Second device: a fresh context (own IndexedDB) pulls both rows.
  if (baseURL === undefined) throw new Error('playwright project has no baseURL')
  const laptop = await browser.newContext({ ...devices['iPhone 13'], baseURL })
  watchConsole(laptop, consoleErrors, allowFailedLoads)
  const other = await laptop.newPage()
  await other.goto('/')
  await other.getByLabel('Email').fill(email)
  await other.getByLabel('Password').fill(password)
  await other.getByRole('button', { name: 'Sign in' }).click()
  await other.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Today' }).click()
  const logged = other.getByRole('region', { name: 'Logged foods' })
  await expect(logged).toContainText(first.name)
  await expect(logged).toContainText(second.name)
  await laptop.close()
})
