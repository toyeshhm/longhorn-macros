import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

async function createCustomFood(page: Page, name: string, values: Record<string, string>): Promise<void> {
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
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
test('totals, edit servings, delete with undo, date nav', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  const goTracker = async (): Promise<void> => { await tabs.getByRole('button', { name: 'Tracker' }).click() }

  await goTracker()
  await expect(page.getByText('Nothing logged for this day.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set up your goals' })).toBeVisible()

  await tabs.getByRole('button', { name: 'Menu' }).click()
  await createCustomFood(page, 'E2E Shake', { 'Calories (kcal)': '160', 'Protein (g)': '30', 'Carbs (g)': '5', 'Fat (g)': '2', 'Fiber (g)': '1', 'Sugar (g)': '3', 'Sodium (mg)': '200' })
  await createCustomFood(page, 'E2E Bar', { 'Calories (kcal)': '250', 'Protein (g)': '10', 'Carbs (g)': '30', 'Fat (g)': '9', 'Fiber (g)': '4', 'Sugar (g)': '12', 'Sodium (mg)': '150' })

  // Totals equal the sum of both items.
  await goTracker()
  const calories = page.getByRole('region', { name: 'Calories' })
  const eaten = calories.locator('.big')
  const macros = page.getByRole('region', { name: 'Macros' })
  const logged = page.getByRole('region', { name: 'Logged foods' })
  await expect(eaten).toHaveText('410')
  await expect(macros).toContainText('Protein40 g')
  await expect(macros).toContainText('Carbs35 g')
  await expect(macros).toContainText('Fat11 g')
  await expect(page.locator('.micros')).toHaveText('Fiber 5 g · Sugar 15 g · Sodium 350 mg')
  await expect(logged.getByRole('heading', { name: 'Lunch' })).toContainText('410 kcal')

  // Tapping an entry shows the food's detail: source, portion, meal, per-serving and scaled macros.
  await logged.getByRole('button', { name: /E2E Shake/ }).click()
  const shake = page.getByRole('dialog', { name: 'E2E Shake' })
  const nutrients = shake.locator('table.nutrients')
  await expect(shake).toContainText('Custom food')
  await expect(shake).toContainText('Portion: 1 serving')
  await expect(shake.getByLabel('Meal')).toHaveValue('lunch')
  await expect(shake).toContainText('These are the numbers saved with this entry, last edited ')
  await expect(nutrients.locator('caption')).toHaveText('Nutrition for 1 serving')
  await expect(nutrients).toContainText('Calories160 kcal160 kcal')
  await expect(nutrients).toContainText('Protein30 g30 g')
  await expect(nutrients).toContainText('Sodium200 mg200 mg')

  // Editing servings rescales the Total column live, leaving Per serving alone.
  await shake.getByRole('textbox', { name: 'Servings' }).fill('3')
  await expect(nutrients.locator('caption')).toHaveText('Nutrition for 3 servings')
  await expect(nutrients).toContainText('Calories480 kcal160 kcal')
  await expect(nutrients).toContainText('Carbs15 g5 g')
  await expect(nutrients).toContainText('Fat6 g2 g')
  await shake.getByRole('textbox', { name: 'Servings' }).fill('0')
  await expect(nutrients).toContainText('Calories—160 kcal')

  // Edit servings → totals update.
  await shake.getByRole('textbox', { name: 'Servings' }).fill('1')
  await shake.getByRole('button', { name: 'Increase servings' }).click()
  await expect(shake.getByRole('textbox', { name: 'Servings' })).toHaveValue('1.5')
  await shake.getByRole('textbox', { name: 'Servings' }).fill('2')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(shake).toBeHidden()
  await expect(eaten).toHaveText('570')
  await expect(macros).toContainText('Protein70 g')
  await expect(logged.getByRole('button', { name: /E2E Shake/ })).toContainText('2 × 1 serving320 kcal')

  // A logged entry can move to another meal from its sheet.
  await logged.getByRole('button', { name: /E2E Shake/ }).click()
  await shake.getByLabel('Meal').selectOption('dinner')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(logged.getByRole('heading', { name: 'Dinner' })).toContainText('320 kcal')
  await logged.getByRole('button', { name: /E2E Shake/ }).click()
  await shake.getByLabel('Meal').selectOption('lunch')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(logged.getByRole('heading', { name: 'Lunch' })).toContainText('570 kcal')

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
  await goTracker()
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible()
  await expect(eaten).toHaveText('410')

  // The Today stamp jumps back, and goes away once it would do nothing.
  const todayButton = page.locator('.date-nav').getByRole('button', { name: 'Today' })
  await todayButton.click()
  await expect(page.locator('.date-nav h2')).toHaveText('Today')
  await expect(todayButton).toHaveCount(0)
  await expect(eaten).toHaveText('570')
  await expect(page.getByRole('button', { name: 'Repeat a past meal' })).toHaveCount(0)
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
  await tabs.getByRole('button', { name: 'Tracker' }).click()

  const calories = page.getByRole('region', { name: 'Calories' })
  const macros = page.getByRole('region', { name: 'Macros' })
  await expect(calories).toContainText('160 eaten of 300')
  await expect(calories.locator('.hero-label')).toHaveText('calories left today')
  await expect(calories.locator('.big')).toHaveText('140')
  await expect(page.getByRole('button', { name: 'Set up your goals' })).toHaveCount(0)
  const calBar = page.getByRole('progressbar', { name: 'Calories eaten' })
  await expect(calBar).toHaveAttribute('aria-valuenow', '160')
  await expect(calBar).toHaveAttribute('aria-valuemax', '300')
  await expect(calBar).toHaveAttribute('aria-valuetext', '160 of 300 kcal')
  // Protein 30 > 25 → over; carbs/fat under.
  await expect(macros.locator('.macro.over')).toHaveCount(1)
  await expect(macros).toContainText('Protein30 g / 25 g over')
  await expect(macros).toContainText('Carbs5 g / 40 g')
  const protein = page.getByRole('progressbar', { name: 'Protein' })
  await expect(protein).toHaveAttribute('aria-valuenow', '25')
  await expect(protein).toHaveAttribute('aria-valuetext', '30 g / 25 g')
  await expect(page.getByRole('progressbar', { name: 'Fat' })).toHaveAttribute('aria-valuenow', '2')

  // 2 servings → 320 kcal, 20 over; bar clamps at the target.
  await page.getByRole('region', { name: 'Logged foods' }).getByRole('button', { name: /E2E Shake/ }).click()
  const shake = page.getByRole('dialog', { name: 'E2E Shake' })
  await shake.getByRole('textbox', { name: 'Servings' }).fill('2')
  await shake.getByRole('button', { name: 'Save' }).click()
  await expect(shake).toBeHidden()
  await expect(calories.locator('.hero-label')).toHaveText('target passed today')
  await expect(calories.locator('p.over')).toHaveText('20 over')
  // The orange overprint is decoration: screen readers hear the number once.
  await expect(calories).toMatchAriaSnapshot('- paragraph: 20 over')
  await expect(calories.locator('.bar-fill.over')).toHaveCount(1)
  await expect(calBar).toHaveAttribute('aria-valuenow', '300')
  await expect(calBar).toHaveAttribute('aria-valuetext', '320 of 300 kcal')

  // The bars are the design, not only the aria: on a 320px phone at 200% text the macro track used to collapse to
  // 0px, so three of the four hand-drawn bars stopped printing while every assertion above still passed.
  await page.setViewportSize({ width: 320, height: 780 })
  await page.addStyleTag({ content: 'html { font-size: 32px }' })
  const bars = await page.evaluate(() => [...document.querySelectorAll('[role="progressbar"]')]
    .map((b) => ({ label: b.getAttribute('aria-label'), width: Math.round(b.getBoundingClientRect().width) })))
  expect(bars.map((b) => b.label)).toEqual(['Calories eaten', 'Protein', 'Carbs', 'Fat'])
  for (const b of bars) expect(b.width, `${b.label ?? '?'} bar at 320px with 32px root text`).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.innerWidth)).toBe(320)
})
