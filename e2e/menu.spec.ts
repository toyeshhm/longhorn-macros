import { expect, test } from '@playwright/test'
import { localDateKey } from '../src/dates'
import { fetchMenu } from '../src/menu/feed'
import { currentMeal, groupByStation } from '../src/menu/select'

// Live UT feed on both sides: the test derives the expected first row (default hall J2, today, current meal)
// from the same feed the app loads, so it checks real numbers without pinning any menu content.
test('browse, add with servings, search, custom food', async ({ page }) => {
  const menu = await fetchMenu(fetch)
  const now = new Date()
  const today = localDateKey(now)
  const day = menu.dates.includes(today) ? today : menu.dates[0]
  if (day === undefined) throw new Error('UT feed has no dates')
  const meals = (menu.days[day]?.find((h) => h.hall === 'J2')?.meals ?? []).filter((m) => m.items.length > 0)
  const mealName = currentMeal(meals.map((m) => m.name), now)
  const first = groupByStation(meals.find((m) => m.name === mealName)?.items ?? [])[0]?.items[0]
  if (first === undefined) throw new Error(`J2 has nothing posted for ${day}`)

  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Menu' }).click()

  // Browse: at least one station, first row is the feed's first item.
  const stations = page.locator('section.station')
  await expect(stations.first().getByRole('heading')).toBeVisible()
  const firstRow = stations.first().getByRole('button').first()
  await expect(firstRow).toContainText(first.name)
  await firstRow.click()

  const sheet = page.getByRole('dialog', { name: first.name })
  const servings = sheet.getByRole('textbox', { name: 'Servings' })
  const add = sheet.getByRole('button', { name: 'Add' })
  for (const legend of first.legends) await expect(sheet.getByRole('list', { name: 'Allergens and diet' })).toContainText(legend)
  await servings.fill('0')
  await expect(sheet.getByText(/Enter servings/)).toBeVisible()
  await expect(add).toBeDisabled()
  await servings.fill('1 1/2')
  await expect(add).toBeEnabled()
  await sheet.getByRole('button', { name: 'Increase servings' }).click()
  await expect(servings).toHaveValue('2')
  await servings.fill('1.5')
  await add.click()
  await expect(page.getByRole('status').filter({ hasText: /^Added to / })).toBeVisible()
  await expect(sheet).toBeHidden()

  await tabs.getByRole('button', { name: 'Today' }).click()
  const logged = page.getByRole('region', { name: 'Logged foods' })
  await expect(logged).toContainText(first.name)
  await expect(logged).toContainText(`${String(Math.round(1.5 * first.nutrients.calories))} kcal`)

  // Search replaces browse.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  const search = page.getByRole('searchbox', { name: 'Search foods' })
  await search.fill('a')
  const results = page.getByRole('list', { name: 'Search results' })
  await expect(results.getByRole('listitem').first()).toBeVisible()
  await expect(stations).toHaveCount(0)
  await search.fill('')

  // Custom food: save opens its sheet; Esc closes; it is then searchable and addable.
  await page.getByRole('button', { name: '+ Custom food' }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill('Protein Shake')
  await form.getByLabel('Calories (kcal)').fill('160')
  await form.getByLabel('Protein (g)').fill('30')
  await form.getByLabel('Carbs (g)').fill('5')
  await form.getByLabel('Fat (g)').fill('2')
  await form.getByRole('button', { name: 'Save food' }).click()
  const shakeSheet = page.getByRole('dialog', { name: 'Protein Shake' })
  await expect(shakeSheet).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(shakeSheet).toBeHidden()

  await search.fill('protein sha')
  const shakeRow = results.getByRole('button').filter({ hasText: 'Protein Shake' })
  await expect(shakeRow).toContainText('Custom')
  await expect(shakeRow).toContainText('160 kcal')
  await shakeRow.click()
  await shakeSheet.getByRole('button', { name: 'Add' }).click()
  await expect(shakeSheet).toBeHidden()

  await tabs.getByRole('button', { name: 'Today' }).click()
  await expect(logged).toContainText('Protein Shake')
  await expect(logged).toContainText('160 kcal')
})
