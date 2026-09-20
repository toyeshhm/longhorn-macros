import { expect, test } from './fixtures'
import { localDateKey } from '../src/dates'
import { translator } from '../src/i18n'
import { dayText, fetchHours, parseHours } from '../src/menu/hours'
import { THEME_COLOR } from '../src/theme'

const signUp = async (page: import('@playwright/test').Page, password = crypto.randomUUID()): Promise<string> => {
  const email = `e2e-${crypto.randomUUID()}@example.test`
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  return email
}

const bodyBackground = (): Promise<string> =>
  Promise.resolve(getComputedStyle(document.body).backgroundColor)

test('Profile: every section is a named heading, and the page opens folded except Goals', async ({ page }) => {
  await signUp(page)
  for (const name of ['Goals', 'Account', 'Appearance', 'Dining hours', 'Data']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  }
  // Only the Goals section's fields are on the page until you unfold another one.
  await expect(page.getByLabel('Birth year')).toBeVisible()
  await expect(page.getByLabel('Current password')).toBeHidden()
  await page.getByRole('heading', { name: 'Account' }).click()
  await expect(page.getByLabel('Current password')).toBeVisible()

  // What this screen deliberately cannot do is said, not hidden.
  await expect(page.getByText(/Changing your email address and deleting your account are not available/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Delete account/ })).toHaveCount(0)

  // 320px: the folded-open sections still do not push the page sideways.
  await page.setViewportSize({ width: 320, height: 780 })
  for (const name of ['Appearance', 'Dining hours', 'Data']) await page.getByRole('heading', { name }).click()
  await expect(page.getByRole('table').first()).toBeVisible()
  expect(await page.evaluate(() => window.innerWidth)).toBe(320)
})

test('Profile: the week table prints every hall and day from the live UT hours feed', async ({ page }) => {
  const hours = parseHours(await fetchHours(fetch), localDateKey(new Date()))
  await signUp(page)
  await page.getByRole('heading', { name: 'Dining hours' }).click()
  const tables = page.getByRole('table')
  await expect(tables).toHaveCount(3)
  for (const [i, name] of ['J2 Dining', 'Jester City Limits (JCL)', 'Kins Dining'].entries()) {
    await expect(tables.nth(i)).toContainText(name)
  }
  // Saturday of the J2 week, straight from the feed.
  const saturday = hours.J2[5] ?? null
  await expect(tables.first().getByRole('row').nth(5)).toContainText(dayText(saturday, translator('en')))
})

test('Profile: the log exports as one JSON file', async ({ page }) => {
  await signUp(page)
  // One weigh-in, so the spoken confirmation has a singular count to get right.
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Progress' }).click()
  await page.getByLabel('Weight (lb)').fill('170')
  await page.getByRole('button', { name: 'Save weight' }).click()
  await tabs.getByRole('button', { name: 'Profile' }).click()
  await page.getByRole('heading', { name: 'Data' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export my log' }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`longhorn-macros-${localDateKey(new Date())}.json`)
  await expect(page.getByRole('status').filter({ hasText: /^Exported / }))
    .toHaveText('Exported 0 logged foods, 1 weigh-in and 0 custom foods.')
  // Singular or plural depending on whether the weigh-in has drained yet — the point is that it agrees with itself.
  await expect(page.getByText(/^1 change waiting|^\d+ changes waiting/)).toBeVisible()
})

test('Appearance: Night repaints on dark stock, survives a reload, and Match phone follows the device', async ({ page }) => {
  await signUp(page)
  await page.getByRole('heading', { name: 'Appearance' }).click()
  const themes = page.getByRole('radiogroup', { name: 'Theme' })
  await expect(themes.getByRole('radio', { name: 'Match phone' })).toBeChecked() // the default

  const light = await page.evaluate(bodyBackground)
  await themes.getByRole('radio', { name: 'Night' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  const night = await page.evaluate(bodyBackground)
  expect(night).not.toBe(light)
  expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(THEME_COLOR.night)

  // Per device, so it outlives a reload without ever going to the server.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  expect(await page.evaluate(bodyBackground)).toBe(night)

  // Match phone tracks prefers-color-scheme in both directions.
  await page.getByRole('heading', { name: 'Appearance' }).click()
  await themes.getByRole('radio', { name: 'Match phone' }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(THEME_COLOR.light)
  expect(await page.evaluate(bodyBackground)).toBe(light)

  // Light stays light on a dark phone.
  await themes.getByRole('radio', { name: 'Light' }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('Appearance: the app still prints when the device blocks storage', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked'); } })
  })
  await signUp(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('heading', { name: 'Appearance' }).click()
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'Night' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night') // applied, just not remembered
})

test.describe(() => {
  test.use({ allowFailedLoads: true }) // the 400 from the token endpoint is the wrong-password check

  test('Account: the current password is checked before the new one is set', async ({ page }) => {
    const password = crypto.randomUUID()
    const email = await signUp(page, password)
    await page.getByRole('heading', { name: 'Account' }).click()
    await expect(page.getByText(email)).toBeVisible()
    const submit = page.getByRole('button', { name: 'Change password' })

    await page.getByLabel('New password').fill('short')
    await submit.click()
    await expect(page.getByRole('alert')).toContainText('Enter your current password.')
    await page.getByLabel('Current password').fill('not-the-password')
    await submit.click()
    await expect(page.getByRole('alert')).toContainText('New password must be at least 6 characters.')

    // The message belongs to the field it is about: the new-password box is not marked invalid by it.
    await expect(page.getByLabel('New password')).toHaveAccessibleDescription('New password must be at least 6 characters.')
    await expect(page.getByLabel('New password')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel('Current password')).toHaveAttribute('aria-invalid', 'false')

    const next = crypto.randomUUID()
    await page.getByLabel('New password').fill(next)
    await submit.click()
    await expect(page.getByRole('alert')).toContainText('Current password is incorrect.')
    await expect(page.getByLabel('Current password')).toHaveAccessibleDescription('Current password is incorrect.')
    await expect(page.getByLabel('New password')).toHaveAttribute('aria-invalid', 'false')
    // Password managers need an identifier in the form to tie the new password to the account.
    await expect(page.locator('form input[autocomplete="username"]')).toHaveValue(email)

    await page.getByLabel('Current password').fill(password)
    await submit.click()
    await expect(page.getByRole('status').filter({ hasText: 'Password changed.' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)

    // The new password is the one the account now has.
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText(/invalid/i)
    await page.getByLabel('Password').fill(next)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
  })
})
