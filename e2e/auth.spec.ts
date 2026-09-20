import { expect, test } from './fixtures'

test('create account, stay signed in across reload, log out', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()

  const tabs = page.getByRole('navigation', { name: 'Main' })
  await expect(tabs).toBeVisible()
  // No profile yet: first run lands on Profile, with its Goals section unfolded.
  await expect(tabs.getByRole('button', { name: 'Profile' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(/Set up your profile/)).toBeVisible()

  await page.reload()
  await expect(tabs).toBeVisible()

  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(tabs.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-current', 'page')
  await tabs.getByRole('button', { name: 'Profile' }).click()
  await page.getByRole('heading', { name: 'Account' }).click() // its section is folded shut
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  await expect(tabs).toBeHidden()
})

test.describe(() => {
  test.use({ allowFailedLoads: true }) // the 400 from the token endpoint is the point of this test

  test('wrong password shows an alert', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
    await page.getByLabel('Password').fill('not-the-password')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toContainText(/invalid/i)
  })
})
