import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

async function createCustomFood(page: Page, name: string, values: Record<string, string>): Promise<void> {
  await page.getByRole('button', { name: 'Add custom food' }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill(name)
  for (const [label, v] of Object.entries(values)) await form.getByLabel(label).fill(v)
  await form.getByRole('button', { name: 'Save food' }).click()
  await addToLunch(page, name)
}

async function addToLunch(page: Page, name: string): Promise<void> {
  const sheet = page.getByRole('dialog', { name })
  await sheet.getByLabel('Meal').selectOption('lunch')
  await sheet.getByRole('button', { name: 'Add' }).click()
  await expect(sheet).toBeHidden()
}

// This test has no profile, so it checks totals without targets. The next test seeds one.
test('totals, edit servings, delete with undo, date nav, repeat a meal', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  const goToday = async (): Promise<void> => { await tabs.getByRole('button', { name: 'Today' }).click() }

  await goToday()
  await expect(page.getByText('Nothing logged for this day.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set up your goals' })).toBeVisible()

  await tabs.getByRole('button', { name: 'Menu' }).click()
  await createCustomFood(page, 'E2E Shake', { 'Calories (kcal)': '160', 'Protein (g)': '30', 'Carbs (g)': '5', 'Fat (g)': '2', 'Fiber (g)': '1', 'Sugar (g)': '3', 'Sodium (mg)': '200' })
  await createCustomFood(page, 'E2E Bar', { 'Calories (kcal)': '250', 'Protein (g)': '10', 'Carbs (g)': '30', 'Fat (g)': '9', 'Fiber (g)': '4', 'Sugar (g)': '12', 'Sodium (mg)': '150' })

  // Totals equal the sum of both items.
  await goToday()
  const calories = page.getByRole('region', { name: 'Calories' })
  const eaten = calories.locator('.eaten')
  const macros = page.getByRole('region', { name: 'Macros' })
  const logged = page.getByRole('region', { name: 'Logged foods' })
  await expect(eaten).toHaveText('410')
  await expect(macros).toContainText('Protein40 g')
  await expect(macros).toContainText('Carbs35 g')
  await expect(macros).toContainText('Fat11 g')
  await expect(page.locator('.micros')).toHaveText('Fiber 5 g · Sugar 15 g · Sodium 350 mg')
  await expect(logged.getByRole('heading', { name: 'Lunch' })).toContainText('410 kcal')

  // Edit servings → totals update.
  await logged.getByRole('button', { name: /E2E Shake/ }).click()
  const shake = page.getByRole('dialog', { name: 'E2E Shake' })
  await shake.getByRole('button', { name: 'Increase servings' }).click()
  await expect(shake.getByRole('textbox', { name: 'Servings' })).toHaveValue('1.5')
  await shake.getByRole('textbox', { name: 'Servings' }).fill('2')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(shake).toBeHidden()
  await expect(eaten).toHaveText('570')
  await expect(macros).toContainText('Protein70 g')
  await expect(logged.getByRole('button', { name: /E2E Shake/ })).toContainText('320 kcal2 × 1 serving')

  // Delete → Undo restores.
  await logged.getByRole('button', { name: /E2E Bar/ }).click()
  await page.getByRole('dialog', { name: 'E2E Bar' }).getByRole('button', { name: 'Delete' }).click()
  await expect(logged).not.toContainText('E2E Bar')
  await expect(eaten).toHaveText('320')
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(logged).toContainText('E2E Bar')
  await expect(eaten).toHaveText('570')

  // ‹ to yesterday; Menu's Add logs to the viewed day.
  await page.getByRole('button', { name: 'Previous day' }).click()
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible()
  await expect(eaten).toHaveText('0')
  await tabs.getByRole('button', { name: 'Menu' }).click()
  const search = page.getByRole('searchbox', { name: 'Search foods' })
  const results = page.getByRole('list', { name: 'Search results' })
  for (const name of ['E2E Shake', 'E2E Bar']) {
    await search.fill(name)
    await results.getByRole('button').filter({ hasText: name }).filter({ hasText: 'Custom' }).click()
    await addToLunch(page, name)
  }
  await goToday()
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible()
  await expect(eaten).toHaveText('410')

  // Today button returns; repeat yesterday's lunch onto today.
  const todayButton = page.locator('.date-nav').getByRole('button', { name: 'Today' })
  await todayButton.click()
  await expect(page.locator('.date-nav h2')).toHaveText('Today')
  await expect(todayButton).toHaveCount(0)
  await page.getByRole('button', { name: 'Repeat a past meal' }).click()
  const repeat = page.getByRole('dialog', { name: 'Repeat a past meal' })
  await repeat.getByLabel('Meal').selectOption('lunch')
  const preview = repeat.getByRole('list', { name: 'Items to copy' })
  await expect(preview).toContainText('E2E Shake')
  await expect(preview).toContainText('E2E Bar')
  await repeat.getByRole('button', { name: 'Add 2 items' }).click()
  await expect(repeat).toBeHidden()
  await expect(page.getByRole('status').filter({ hasText: 'Added 2 items' })).toBeVisible()
  await expect(eaten).toHaveText('980')
  await expect(logged.getByRole('button', { name: /E2E Bar/ })).toHaveCount(2)
})

// No Goals UI until Task 13: seed a profile (targets via override) and a weight straight into the real local DB, then sign in so pull brings them down.
test('targets: left / over text and progressbars', async ({ page }) => {
  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: signUpError } = await client.auth.signUp({ email, password })
  expect(signUpError).toBeNull()
  const now = new Date().toISOString()
  const { error: profileError } = await client.from('profile').insert({
    sex: 'male', birth_year: 2006, height_in: 70, activity: 'moderate', goal: 'maintain', rate_lb_per_week: 0,
    override: { calories: 300, protein: 25, carbs: 40, fat: 10 }, adaptive_enabled: false, updated_at: now,
  })
  expect(profileError).toBeNull()
  const { error: weightError } = await client.from('weights').insert({ id: crypto.randomUUID(), date: '2026-01-15', weight_lb: 170, updated_at: now })
  expect(weightError).toBeNull()

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await createCustomFood(page, 'E2E Shake', { 'Calories (kcal)': '160', 'Protein (g)': '30', 'Carbs (g)': '5', 'Fat (g)': '2' })
  await tabs.getByRole('button', { name: 'Today' }).click()

  const calories = page.getByRole('region', { name: 'Calories' })
  const macros = page.getByRole('region', { name: 'Macros' })
  await expect(calories).toContainText('160 kcal eaten of 300')
  await expect(calories.locator('.left')).toHaveText('140 kcal left')
  await expect(page.getByRole('button', { name: 'Set up your goals' })).toHaveCount(0)
  const calBar = page.getByRole('progressbar', { name: 'Calories eaten' })
  await expect(calBar).toHaveAttribute('aria-valuenow', '160')
  await expect(calBar).toHaveAttribute('aria-valuemax', '300')
  await expect(calBar).toHaveAttribute('aria-valuetext', '160 of 300 kcal')
  // Protein 30 > 25 → over; carbs/fat under.
  await expect(macros.locator('.macro.over')).toHaveCount(1)
  await expect(macros).toContainText('Protein5 g over 25 g')
  await expect(macros).toContainText('Carbs35 g left of 40 g')
  const protein = page.getByRole('progressbar', { name: 'Protein' })
  await expect(protein).toHaveAttribute('aria-valuenow', '25')
  await expect(protein).toHaveAttribute('aria-valuetext', '30 g eaten of 25 g')
  await expect(page.getByRole('progressbar', { name: 'Fat' })).toHaveAttribute('aria-valuenow', '2')

  // 2 servings → 320 kcal, 20 over; bar clamps at the target.
  await page.getByRole('region', { name: 'Logged foods' }).getByRole('button', { name: /E2E Shake/ }).click()
  const shake = page.getByRole('dialog', { name: 'E2E Shake' })
  await shake.getByRole('textbox', { name: 'Servings' }).fill('2')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(shake).toBeHidden()
  await expect(calories.locator('p.over')).toHaveText('20 kcal over')
  await expect(calories.locator('.bar-fill.over')).toHaveCount(1)
  await expect(calBar).toHaveAttribute('aria-valuenow', '300')
  await expect(calBar).toHaveAttribute('aria-valuetext', '320 of 300 kcal')
})
