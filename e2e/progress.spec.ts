import { expect, test } from './fixtures'
import { addDays, localDateKey } from '../src/dates'

test('weigh-ins, the three chart views and the range they all answer to', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })

  // A profile, so there is a maintenance estimate for the prediction to run on.
  await page.getByLabel('Female', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2005')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('5')
  await page.getByLabel('Current weight (lb)').fill('170')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Welcome! Set up your profile')).toHaveCount(0)

  // Log one food today so the calories view and the prediction have a day to work with.
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
  const today = localDateKey(new Date())
  const yesterday = addDays(today, -1)
  const weight = page.getByLabel('Weight (lb)')
  const date = page.getByLabel('Date')
  const save = page.getByRole('button', { name: 'Save weight' })
  await expect(date).toHaveValue(today)
  await expect(weight).toHaveAttribute('inputmode', 'decimal')

  // Setting up goals wrote today's weight, so the chart already has the one point it can draw.
  const dots = page.locator('.ink-chart > svg .dots')
  const rows = page.locator('.ink-chart tbody tr')
  await expect(dots).toHaveCount(1)
  await expect(rows).toHaveText([`${today}170170`])

  // The same day again replaces that point rather than adding a second one.
  await weight.fill('171')
  await save.click()
  await expect(rows).toHaveText([`${today}171171`])
  await expect(dots).toHaveCount(1)

  // Out of range is rejected at the form boundary.
  await weight.fill('20')
  await save.click()
  await expect(page.getByRole('alert')).toHaveText('Weight must be between 50 and 700 lb.')
  await expect(dots).toHaveCount(1)

  await date.fill(yesterday)
  await weight.fill('172')
  await save.click()
  await expect(dots).toHaveCount(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
  // Trend starts at the first (yesterday's) weight: 172, then 172 + 0.1·(171 − 172) = 171.9.
  await expect(rows).toHaveText([`${yesterday}172172`, `${today}171171.9`])
  await expect(page.getByRole('img', { name: 'Weight, the last 30 days' })).toBeVisible()

  // The numbers under the chart, which are what the screen is actually for.
  const summary = page.getByRole('region', { name: 'Summary' })
  await expect(summary).toContainText('171.9 lbTrend weight')
  await expect(summary).toContainText('-0.1 lbChange over a day (smoothed)')
  await expect(summary).toContainText('160 kcalAvg calories')
  await expect(summary).toContainText('1 of 30Days logged')
  await expect(summary.locator('.adaptive-status')).toHaveText('Needs ~13 more logged days and 6 weigh-ins')

  // The range applies to every view: yesterday falls outside a range that starts today.
  const view = page.getByRole('radiogroup', { name: 'View' })
  await page.getByText('All', { exact: true }).click()
  await expect(dots).toHaveCount(2)
  await expect(page.getByRole('img', { name: 'Weight, all time' })).toBeVisible()

  await view.getByRole('radio', { name: 'Calories' }).click()
  await expect(page.getByRole('img', { name: 'Daily calories, all time' })).toBeVisible()
  await expect(dots).toHaveCount(1) // one logged day, not one weigh-in
  await expect(rows).toHaveText([`${today}160no reading160`])
  await expect(page.locator('.chart-key')).toContainText('7-day average')

  await view.getByRole('radio', { name: 'Predicted' }).click()
  await expect(page.getByRole('img', { name: 'Predicted and actual weight, all time' })).toBeVisible()
  // Yesterday's weigh-in anchors the line; today's 160 kcal against maintenance drops it about half a pound.
  // The estimate is the Mifflin-St Jeor guess, not one learned from this account's own data, and the note says so.
  await expect(page.locator('.chart-note')).toContainText('at an estimated ')
  await expect(page.locator('.chart-note')).toContainText('rather than learned from your own data, 3,500 kcal to the pound')
  await expect(page.locator('.ink-chart > svg path.predicted')).toHaveCount(1)
  await expect(page.locator('.ink-chart thead')).toHaveText('DateWeigh-inTrend (smoothed)Predicted from intake')
  await expect(rows.first()).toHaveText(`${yesterday}172172172`)
  await expect(rows.last()).toHaveText(new RegExp(`^${today}171171\\.9\\d+(\\.\\d)?$`))

  // The date field has to be wide enough for the date it is about to save. A narrower grid track clipped
  // "09/20/2026" under its own calendar mark at 320px and again in landscape, and because a replaced element
  // clips its own content rather than pushing the page out, no page-width assertion could ever see it.
  const dateSlack = (): Promise<number> => page.evaluate(() => {
    const input = document.querySelector('.weight-form input[type="date"]')
    if (!(input instanceof HTMLInputElement)) return -1
    const clone = input.cloneNode(true)
    if (!(clone instanceof HTMLInputElement)) return -1
    clone.style.cssText = 'width: max-content; position: absolute; visibility: hidden'
    input.parentElement?.append(clone)
    const need = clone.getBoundingClientRect().width
    clone.remove()
    return Math.round(input.getBoundingClientRect().width - need)
  })
  for (const size of [{ width: 320, height: 780 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size)
    expect(await dateSlack(), `the date field fits its own value at ${String(size.width)}px`).toBeGreaterThanOrEqual(0)
  }
})

test('with nothing logged at all, every view says so in words rather than drawing an empty chart', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  // Wait for the profile to come back empty before leaving: the app pulls a first-run account to Profile itself.
  await expect(page.getByText('Welcome! Set up your profile')).toBeVisible()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Progress' }).click()

  const view = page.getByRole('radiogroup', { name: 'View' })
  await expect(page.getByText('No weigh-ins in this range yet.')).toBeVisible()
  await view.getByRole('radio', { name: 'Calories' }).click()
  await expect(page.getByText('Nothing logged in this range yet.')).toBeVisible()
  await view.getByRole('radio', { name: 'Predicted' }).click()
  await expect(page.locator('.chart-note')).toHaveText('No maintenance estimate yet, so there is nothing to predict from. Set up your goals first.')
  await expect(page.getByText('No weigh-ins in this range yet, so there is nothing to compare a prediction with.')).toBeVisible()

  const summary = page.getByRole('region', { name: 'Summary' })
  await expect(summary).toContainText('—Trend weight')
  await expect(summary).toContainText('—Change (smoothed)')
  await expect(summary).toContainText('0 of 30Days logged')
})
