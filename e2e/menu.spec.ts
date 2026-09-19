import { expect, test } from './fixtures'
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
  await page.getByRole('button', { name: 'Add custom food' }).click()
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

// Hall choice survives a reload; day and meal chips pick what's shown (checked against the live feed).
test('hall is remembered; day and meal chips switch the listing', async ({ page }) => {
  const menu = await fetchMenu(fetch)
  const day = menu.dates.at(-1)
  if (day === undefined) throw new Error('UT feed has no dates')
  const meals = (menu.days[day]?.find((h) => h.hall === 'JCL')?.meals ?? []).filter((m) => m.items.length > 0)

  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Menu' }).click()

  const hall = page.getByRole('radiogroup', { name: 'Hall' })
  await expect(hall.getByRole('radio', { name: 'J2' })).toBeChecked()
  await hall.getByRole('radio', { name: 'JCL' }).check()
  // Remounting Menu re-reads the saved hall; IndexedDB orders that read after the write, so the reload can't cut it off.
  await tabs.getByRole('button', { name: 'Today' }).click()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(hall.getByRole('radio', { name: 'JCL' })).toBeChecked()
  await page.reload()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(hall.getByRole('radio', { name: 'JCL' })).toBeChecked()

  const days = page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio')
  await expect(days).toHaveCount(menu.dates.length)
  await days.last().check()
  await expect(days.last()).toBeChecked()
  const mealChips = page.getByRole('radiogroup', { name: 'Meal' }).getByRole('radio')
  await expect(mealChips).toHaveCount(meals.length)
  const last = meals.at(-1)
  if (last === undefined) {
    await expect(page.getByText('No menu posted for this hall and day.')).toBeVisible()
    return
  }
  await page.getByRole('radiogroup', { name: 'Meal' }).getByRole('radio', { name: last.name, exact: true }).check()
  const firstItem = groupByStation(last.items)[0]?.items[0]
  await expect(page.locator('section.station button.food-row').first()).toContainText(firstItem?.name ?? '')
})

test.describe(() => {
  test.use({ allowFailedLoads: true }) // the feed request fails offline on purpose

  // No saved copy yet and UT unreachable: an error banner with Retry, which loads the menu once UT is reachable.
  // Only the UT host is cut (setOffline would also take down the dev server and Supabase); nothing is faked, the
  // request just fails like a dead dining-hall connection, and Retry hits the real feed.
  test('feed unreachable with nothing cached shows Retry, which recovers', async ({ page, context }) => {
    const feed = 'https://hf-foodpro.austin.utexas.edu/**'
    await context.route(feed, (route) => route.abort('internetdisconnected'))
    await page.goto('/')
    await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
    await page.getByLabel('Password').fill(crypto.randomUUID())
    await page.getByRole('button', { name: 'Create account' }).click()
    const tabs = page.getByRole('navigation', { name: 'Main' })
    await tabs.getByRole('button', { name: 'Menu' }).click()
    const banner = page.getByRole('alert').filter({ hasText: "Couldn't load UT menu" })
    await expect(banner).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Hall' })).toHaveCount(0)

    await context.unroute(feed)
    await banner.getByRole('button', { name: 'Retry' }).click()
    await expect(banner).toBeHidden()
    await expect(page.getByRole('radiogroup', { name: 'Hall' })).toBeVisible()
  })
})
