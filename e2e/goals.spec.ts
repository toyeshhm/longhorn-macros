import { expect, test } from './fixtures'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { addDays, localDateKey } from '../src/dates'

test('first-run profile → targets, manual override round trip, adaptive update with undo', async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  const calories = page.getByRole('region', { name: 'Calories' })
  const panel = page.getByRole('region', { name: 'Your targets' })

  // First run lands on Profile, Goals section unfolded. Invalid input is reported inline, tied to its field.
  await expect(page.getByText('Welcome! Set up your profile')).toBeVisible()
  await page.getByLabel('Birth year').fill('1800')
  await page.getByLabel('Feet').fill('3') // 36 in < 48
  await page.getByText('Adjust targets manually').click()
  await page.getByLabel('Calories (kcal)').fill('-5')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Birth year')).toHaveAccessibleDescription('birth year must be between 1900 and 2015')
  await expect(page.getByLabel('Feet')).toHaveAccessibleDescription('height must be between 48 and 96 inches')
  await expect(page.getByLabel('Calories (kcal)')).toHaveAccessibleDescription('override calories must be between 0 and 10000')
  await expect(page.getByLabel('Current weight (lb)')).toHaveAccessibleDescription('weight must be between 50 and 700 lb')
  // Each message is its own alert, so it is spoken when it appears; none fell through to the unattached form-level one.
  await expect(page.getByRole('alert')).toHaveCount(4)
  await expect(page.locator('p.error:not([id])')).toHaveCount(0)
  await page.getByLabel('Calories (kcal)').fill('') // blank override → details closes again (open tracks draft.override)

  await page.getByLabel('Male', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2006')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('10')
  await page.getByLabel('Current weight (lb)').fill('170')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByLabel('Cut').check()
  await page.getByLabel('Pace').selectOption({ label: 'lose 1 lb/week' })
  for (const t of ['Calories2,270 kcal', 'Protein170 g', 'Fat63 g', 'Carbs256 g']) await expect(panel).toContainText(t)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByLabel('Current weight (lb)')).toHaveCount(0) // saved: no longer first run
  await expect(page.getByText('Welcome! Set up your profile')).toHaveCount(0)

  // Override calories → Today uses it; clearing restores the computed target.
  await page.getByText('Adjust targets manually').click()
  await page.getByLabel('Calories (kcal)').fill('2000')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,000')
  await tabs.getByRole('button', { name: 'Profile' }).click()
  await page.getByLabel('Calories (kcal)').fill('')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,270')
  await expect(page.getByRole('region', { name: 'Targets updated' })).toHaveCount(0)

  // Adaptive: seed 21 days of 2500 kcal + 10 flat weigh-ins into the real local DB as this user, reload so pull brings them in.
  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  expect(signInError).toBeNull()
  const today = localDateKey(new Date())
  const now = new Date().toISOString()
  const perServing = { calories: 2500, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  const { error: logError } = await client.from('food_log').insert(Array.from({ length: 21 }, (_, i) => ({
    id: crypto.randomUUID(), date: addDays(today, -i), meal: 'lunch', name: 'Seed', portion: '1 serving', servings: 1, per_serving: perServing, updated_at: now,
  })))
  expect(logError).toBeNull()
  // Odd offsets 1..19 (today already has the 170 from the form).
  const { error: weightError } = await client.from('weights').insert(Array.from({ length: 10 }, (_, i) => ({
    id: crypto.randomUUID(), date: addDays(today, -(2 * i + 1)), weight_lb: 170, updated_at: now,
  })))
  expect(weightError).toBeNull()

  await page.reload()
  // previous = formula 2770.4; estimate = 2500 (flat trend); blend → 2635 maintenance → 2135 target on a 1 lb/wk cut.
  const card = page.getByRole('region', { name: 'Targets updated' })
  await expect(card).toContainText("Targets updated 2,270 → 2,135 kcal: you're losing slower than planned")
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,135')
  await tabs.getByRole('button', { name: 'Profile' }).click()
  await expect(panel).toContainText('Maintenance used2,635 kcal (learned from your data)')

  await card.getByRole('button', { name: 'Undo' }).click()
  await expect(card).toHaveCount(0)
  await expect(panel).toContainText('Calories2,270 kcal')
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,270')

  // Not re-applied on the next open (ran today; the undo keeps the run date).
  await page.reload()
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,270')
  await expect(card).toHaveCount(0)
})

// Adaptive off → an eligible history changes nothing; turning it on applies on the next open; Dismiss keeps the new target.
test('adaptive toggle gates the update; Dismiss hides the card and keeps it', async ({ page }) => {
  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: signUpError } = await client.auth.signUp({ email, password })
  expect(signUpError).toBeNull()
  // Same profile and data as the test above: formula 2270 kcal; eligible adaptive → 2135.
  const today = localDateKey(new Date())
  const now = new Date().toISOString()
  const { error: profileError } = await client.from('profile').insert({
    sex: 'male', birth_year: 2006, height_in: 70, activity: 'moderate', goal: 'cut', rate_lb_per_week: 1,
    override: null, adaptive_enabled: false, updated_at: now,
  })
  expect(profileError).toBeNull()
  const perServing = { calories: 2500, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  const { error: logError } = await client.from('food_log').insert(Array.from({ length: 21 }, (_, i) => ({
    id: crypto.randomUUID(), date: addDays(today, -i), meal: 'lunch', name: 'Seed', portion: '1 serving', servings: 1, per_serving: perServing, updated_at: now,
  })))
  expect(logError).toBeNull()
  const { error: weightError } = await client.from('weights').insert(Array.from({ length: 11 }, (_, i) => ({
    id: crypto.randomUUID(), date: addDays(today, -2 * i), weight_lb: 170, updated_at: now,
  })))
  expect(weightError).toBeNull()

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  const calories = page.getByRole('region', { name: 'Calories' })
  const card = page.getByRole('region', { name: 'Targets updated' })
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,270')
  // Pull applies profile last, so a target means logs and weights are local too; reopen so the runner sees them.
  await page.reload()
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,270')
  await expect(card).toHaveCount(0)

  await tabs.getByRole('button', { name: 'Profile' }).click()
  const toggle = page.getByLabel(/Adaptive TDEE/)
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()
  await expect(card).toHaveCount(0) // runs when the app opens, not on save

  await page.reload()
  await expect(card).toContainText('Targets updated 2,270 → 2,135 kcal')
  await card.getByRole('button', { name: 'Dismiss' }).click()
  await expect(card).toHaveCount(0)
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(calories).toContainText(' eaten of 2,135')
})
