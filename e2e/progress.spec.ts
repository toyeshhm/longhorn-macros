import { expect, test } from './fixtures'
import { addDays, localDateKey } from '../src/dates'

test('weight log replaces same-day entry, chart dots, weekly stats, adaptive status', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })

  // Log one food today so the stats have something to show.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill('E2E Shake')
  for (const [label, v] of [['Calories (kcal)', '160'], ['Protein (g)', '30'], ['Carbs (g)', '5'], ['Fat (g)', '2']] as const) await form.getByLabel(label).fill(v)
  await form.getByRole('button', { name: 'Save food' }).click()
  const sheet = page.getByRole('dialog', { name: 'E2E Shake' })
  await sheet.getByRole('button', { name: 'Add' }).click()
  await expect(sheet).toBeHidden()

  await tabs.getByRole('button', { name: 'Progress' }).click()
  await expect(page.getByText('No weigh-ins in this range yet.')).toBeVisible()
  const today = localDateKey(new Date())
  const weight = page.getByLabel('Weight (lb)')
  const date = page.getByLabel('Date')
  const save = page.getByRole('button', { name: 'Save weight' })
  await expect(date).toHaveValue(today)
  await expect(weight).toHaveAttribute('inputmode', 'decimal')

  const dots = page.locator('.weight-chart > svg .dot')
  const rows = page.locator('.weight-chart tbody tr')
  await weight.fill('170')
  await save.click()
  await expect(dots).toHaveCount(1)
  await expect(rows).toHaveText([`${today}170170`])

  // Same day again replaces rather than adding a second point.
  await weight.fill('171')
  await save.click()
  await expect(rows).toHaveText([`${today}171171`])
  await expect(dots).toHaveCount(1)

  // Out of range is rejected at the form boundary.
  await weight.fill('20')
  await save.click()
  await expect(page.getByRole('alert')).toHaveText('Weight must be between 50 and 700 lb.')
  await expect(dots).toHaveCount(1)

  const yesterday = addDays(today, -1)
  await date.fill(yesterday)
  await weight.fill('172')
  await save.click()
  await expect(dots).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
  // Trend starts at the first (yesterday's) weight: 172, then 172 + 0.1·(171 − 172) = 171.9.
  await expect(rows).toHaveText([`${yesterday}172172`, `${today}171171.9`])
  await expect(page.getByRole('img', { name: /Weight chart: 2 weigh-ins, trend 171.9 lb/ })).toBeVisible()

  // Range toggle: All still shows both.
  await page.getByText('All', { exact: true }).click()
  await expect(dots).toHaveCount(2)

  const stats = page.getByRole('region', { name: 'Last 7 days' })
  await expect(stats).toContainText('Avg calories160 kcal')
  await expect(stats).toContainText('Avg protein30 g')
  await expect(stats).toContainText('Days logged1 / 7')
  await expect(page.locator('.adaptive-status')).toHaveText('Needs ~13 more logged days and 6 weigh-ins')
})
