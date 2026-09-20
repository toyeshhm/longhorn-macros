import { expect, test } from './fixtures'
import { dateLabel, localDateKey } from '../src/dates'
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

test('Profile: the section stamps are a real tablist, and the page is remembered per device', async ({ page }) => {
  await signUp(page)
  const nav = page.getByRole('tablist', { name: 'Profile sections' })
  for (const name of ['Achievements', 'Goals', 'Account', 'Appearance', 'Dining hours', 'Data']) {
    await expect(nav.getByRole('tab', { name, exact: true })).toBeVisible()
  }
  // First run has no profile, so the tab opens on the page the app sent the reader here for.
  await expect(nav.getByRole('tab', { name: 'Goals' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByLabel('Birth year')).toBeVisible()
  await expect(page.getByLabel('Current password')).toHaveCount(0)

  // One page at a time, and the panel says which stamp it belongs to.
  await nav.getByRole('tab', { name: 'Account' }).click()
  await expect(page.getByLabel('Current password')).toBeVisible()
  await expect(page.getByLabel('Birth year')).toHaveCount(0)
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-account')

  // What this screen deliberately cannot do is said, not hidden.
  await expect(page.getByText(/Changing your email address and deleting your account are not available/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Delete account/ })).toHaveCount(0)

  // The keyboard drives the row: the selected stamp is the only tab stop, the arrows move along it and wrap.
  await nav.getByRole('tab', { name: 'Account' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(nav.getByRole('tab', { name: 'Appearance' })).toBeFocused()
  await expect(nav.getByRole('tab', { name: 'Appearance' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('radiogroup', { name: 'Theme' })).toBeVisible()
  await page.keyboard.press('End')
  await expect(nav.getByRole('tab', { name: 'Data' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Export my log' })).toBeVisible()
  await page.keyboard.press('ArrowRight') // wraps round to the first stamp
  await expect(nav.getByRole('tab', { name: 'Achievements' })).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(nav.getByRole('tab', { name: 'Data' })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(nav.getByRole('tab', { name: 'Achievements' })).toBeFocused()
  await expect(nav.getByRole('tab', { name: 'Goals' })).toHaveAttribute('tabindex', '-1')

  // Per device, like the press and the language: it outlives a reload and never goes to the server.
  await nav.getByRole('tab', { name: 'Dining hours' }).click()
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Dining hours' })).toHaveAttribute('aria-selected', 'true')

  // 320px: the row scrolls sideways rather than hiding a stamp past the edge, and nothing widens the page.
  await page.setViewportSize({ width: 320, height: 780 })
  await expect(page.getByRole('table').first()).toBeVisible()
  expect(await page.evaluate(() => window.innerWidth)).toBe(320)
  expect(await page.evaluate(() => {
    const row = document.querySelector('.section-nav')
    if (row === null) return 'the section row is missing'
    const shortest = Math.min(...[...row.children].map((c) => c.getBoundingClientRect().height))
    if (shortest < 44) return `a stamp is only ${String(Math.round(shortest))}px tall`
    if (getComputedStyle(row).overflowX !== 'auto') return 'the row hides what is past its edge'
    return row.scrollWidth > row.clientWidth ? 'scrolls' : 'fits'
  })).toBe('scrolls')
})

test('Profile: the week table prints every hall and day from the live UT hours feed', async ({ page }) => {
  const hours = parseHours(await fetchHours(fetch), localDateKey(new Date()))
  await signUp(page)
  await page.getByRole('tab', { name: 'Dining hours' }).click()
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
  await page.getByRole('tab', { name: 'Data' }).click()
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
  await page.getByRole('tab', { name: 'Appearance' }).click()
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
  await page.getByRole('tab', { name: 'Appearance' }).click()
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
  await page.getByRole('tab', { name: 'Appearance' }).click()
  await page.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'Night' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night') // applied, just not remembered
})

test.describe(() => {
  test.use({ allowFailedLoads: true }) // the 400 from the token endpoint is the wrong-password check

  test('Account: the current password is checked before the new one is set', async ({ page }) => {
    const password = crypto.randomUUID()
    const email = await signUp(page, password)
    await page.getByRole('tab', { name: 'Account' }).click()
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

test('Achievements: Profile opens on the stamps, all unprinted on a new account, and one prints after a food is logged', async ({ page }) => {
  await signUp(page)
  // A saved profile, so the app no longer has a first run to send this reader to Goals for.
  await page.getByLabel('Male', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2005')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('10')
  await page.getByLabel('Current weight (lb)').fill('170')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible()

  const tabs = page.getByRole('navigation', { name: 'Main' })
  const card = (title: string) => page.locator('.badge-card').filter({ hasText: title })
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await tabs.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByRole('tab', { name: 'Achievements' })).toHaveAttribute('aria-selected', 'true')

  // A sheet with nothing logged reads as stamps waiting, with honest progress under each: never as a broken
  // screen. The weigh-in the profile form saved is the one stamp that is already printed.
  await expect(page.getByText('1 of 16 earned')).toBeVisible()
  await expect(page.locator('.badge-card')).toHaveCount(16)
  await expect(page.locator('.badge-card.unearned')).toHaveCount(15)
  await expect(card('First print')).toContainText('0 of 1')
  await expect(card('Seven pages')).toContainText('0 of 7')
  await expect(card('Full plate')).toContainText('0 of 3')
  // Nothing on the sheet counts a day off against the reader.
  await expect(page.getByText('a day off costs you nothing here', { exact: false })).toBeVisible()

  // One logged food prints two stamps, dated today, and moves the week's page along.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill('Badge Bar')
  for (const [label, v] of Object.entries({ 'Calories (kcal)': '250', 'Protein (g)': '10', 'Carbs (g)': '30', 'Fat (g)': '9' })) {
    await form.getByLabel(label).fill(v)
  }
  await form.getByRole('button', { name: 'Save food' }).click()
  const added = page.getByRole('dialog', { name: 'Badge Bar' })
  await added.getByLabel('Meal').selectOption('lunch')
  await added.getByRole('button', { name: 'Add' }).click()
  await expect(added).toBeHidden()

  await tabs.getByRole('button', { name: 'Profile' }).click()
  await expect(page.getByText('3 of 16 earned')).toBeVisible()
  await expect(page.locator('.badge-card.unearned')).toHaveCount(13)
  const today = dateLabel(localDateKey(new Date()), translator('en')).date
  await expect(card('First print')).toContainText(`Earned ${today}`)
  await expect(card('Off menu')).toContainText(`Earned ${today}`)
  await expect(card('Seven pages')).toContainText('1 of 7')
  await expect(card('Full plate')).toContainText('1 of 3')
})
