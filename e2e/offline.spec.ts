import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

// Installed-PWA path: once the service worker controls the page, a cold offline reload still boots the app,
// the menu falls back to its saved copy with an age banner, and edits made offline reach Supabase on reconnect.
test('offline reload serves shell and saved menu; offline edits sync on reconnect', async ({ page, context }) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  const food = `Offline Oats ${crypto.randomUUID().slice(0, 8)}`

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await expect(tabs).toBeVisible()

  // Wait for the SW to activate and claim this page, then reload so every request (feed included) goes through it.
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true)
  await page.reload()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  const stations = page.locator('section.station')
  await expect(stations.first().getByRole('heading')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(tabs).toBeVisible()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByRole('status').filter({ hasText: /^Showing menu saved .+ — couldn't reach UT dining\.$/ })).toBeVisible()
  await expect(stations.first().getByRole('heading')).toBeVisible()

  await page.getByRole('button', { name: '+ Custom food' }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill(food)
  await form.getByLabel('Calories (kcal)').fill('300')
  await form.getByLabel('Protein (g)').fill('10')
  await form.getByLabel('Carbs (g)').fill('54')
  await form.getByLabel('Fat (g)').fill('5')
  await form.getByRole('button', { name: 'Save food' }).click()
  const sheet = page.getByRole('dialog', { name: food })
  await sheet.getByRole('button', { name: 'Add' }).click()
  await expect(sheet).toBeHidden()
  const waiting = page.getByRole('status').filter({ hasText: /^\d+ changes? waiting to sync$/ })
  await expect(waiting).toBeVisible()

  await context.setOffline(false)
  await expect(waiting).toBeHidden()

  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: authError } = await client.auth.signInWithPassword({ email, password })
  expect(authError).toBeNull()
  // The banner hides as soon as the browser is online; the push lands shortly after, so poll the server.
  await expect.poll(async () => {
    const { data, error } = await client.from('custom_foods').select('name').eq('name', food)
    expect(error).toBeNull()
    return data
  }).toEqual([{ name: food }])
  await expect.poll(async () => {
    const { data, error } = await client.from('food_log').select('name, servings').eq('name', food)
    expect(error).toBeNull()
    return data
  }).toEqual([{ name: food, servings: 1 }])
})
