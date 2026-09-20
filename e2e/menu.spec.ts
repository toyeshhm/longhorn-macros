import { expect, test } from './fixtures'
import { dateLabel as dateLabelIn, daysBetween, localDateKey } from '../src/dates'
import { translator } from '../src/i18n'
import { fetchMenu } from '../src/menu/feed'
import { fetchHours, hoursLine as hoursLineIn, parseHours } from '../src/menu/hours'
import { currentMeal, groupByStation } from '../src/menu/select'
import type { Week } from '../src/menu/hours'

// The app is in English by default, so the expected wording is the English one.
const en = translator('en')
const dateLabel = (key: string): { date: string; weekday: string; full: string } => dateLabelIn(key, en)
const hoursLine = (week: Week, now: Date, offset: number): { head: string; detail: string | null } =>
  hoursLineIn(week, now, offset, en)

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

  await tabs.getByRole('button', { name: 'Tracker' }).click()
  const logged = page.getByRole('region', { name: 'Logged foods' })
  await expect(logged).toContainText(first.name)
  await expect(logged).toContainText(`${Math.round(1.5 * first.nutrients.calories).toLocaleString('en-US')} kcal`)

  // Search replaces browse.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  const search = page.getByRole('searchbox', { name: 'Search foods' })
  await search.fill('a')
  const results = page.getByRole('list', { name: 'Search results' })
  await expect(results.getByRole('listitem').first()).toBeVisible()
  await expect(stations).toHaveCount(0)
  await search.fill('')

  // Custom food: save opens its sheet; Esc closes; it is then searchable and addable.
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
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

  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await expect(logged).toContainText('Protein Shake')
  await expect(logged).toContainText('160 kcal')
})

// The selected hall's state right now, and today's windows, printed next to the hall chips.
test('the hall hours line says whether the selected hall is open, from the live hours feed', async ({ page }) => {
  const hours = parseHours(await fetchHours(fetch), localDateKey(new Date()))
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Menu' }).click()

  const line = page.locator('p.hall-hours')
  const now = new Date()
  const j2 = hoursLine(hours.J2, now, 0)
  await expect(line).toContainText(j2.head)
  if (j2.detail !== null) await expect(line).toContainText(j2.detail)
  // The same line is spoken from a region that was on the page before the menu arrived, so switching hall is
  // announced rather than silently repainted.
  const spoken = page.getByRole('status').filter({ hasText: j2.head })
  await expect(spoken).toHaveCount(1)

  // Switching hall switches the line with it.
  await page.getByRole('radiogroup', { name: 'Hall' }).getByRole('radio', { name: 'JCL' }).check()
  await expect(line).toContainText(hoursLine(hours.JCL, now, 0).head)

  // A day that is not today prints that day's own windows: never "Today" over another day's menu.
  const days = page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio')
  const dates = await page.getByRole('radiogroup', { name: 'Day' }).locator('input').evaluateAll(
    (els) => els.map((e) => e.getAttribute('value') ?? ''),
  )
  const other = dates.findIndex((d) => d !== localDateKey(now))
  if (other >= 0) {
    const offset = daysBetween(localDateKey(now), dates[other] ?? '')
    await days.nth(other).check()
    await expect(line).toHaveText(hoursLine(hours.JCL, now, offset).head)
    await expect(line).not.toContainText('Today')
  }
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
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(hall.getByRole('radio', { name: 'JCL' })).toBeChecked()
  await page.reload()
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await expect(hall.getByRole('radio', { name: 'JCL' })).toBeChecked()

  const days = page.getByRole('radiogroup', { name: 'Day' }).getByRole('radio')
  await expect(days).toHaveCount(menu.dates.length)
  // Chips print the date over its weekday; the whole date is what a screen reader hears.
  const first = menu.dates[0]
  if (first === undefined) throw new Error('UT feed has no dates')
  const label = dateLabel(first)
  await expect(days.first()).toHaveAccessibleName(label.full)
  // WCAG 2.5.3: what the chip prints is where its spoken name starts, so "tap 9/19" and "tap Sat" both land.
  expect(label.full.startsWith(`${label.date} ${label.weekday}`)).toBe(true)
  await expect(page.getByRole('radiogroup', { name: 'Day' }).locator('label').first()).toContainText(label.date)
  await expect(page.getByRole('radiogroup', { name: 'Day' })).not.toContainText('Today')
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
  // The Meal chip being browsed is the meal an Add logs to, not the clock's guess.
  await page.locator('section.station button.food-row').first().click()
  await expect(page.getByRole('dialog').getByLabel('Meal')).toHaveValue(last.name.toLowerCase())
})

// The owner's complaint was measurable and so is the fix: on a 390x844 phone the hall, day and meal strips, the
// hours line and the search ate 500px — 59% of the viewport — before a single food. This holds the budget.
//
// It is asserted in two halves because only one of them is the layout's. `chrome` is everything above the first
// food row except the hours line: the search row, the UT-names note and the three stamp strips, which are fixed
// and came to 342px across all 56 hall/day/meal combinations the live feed offered. The hours line is content
// whose length is the hall's — one line for a hall with one service window, two or three for a hall with more —
// so it is measured out rather than being allowed to read as the filters bloating again.
test('the filter block stays out of the way of the food', async ({ page }) => {
  // The phone the owner measured on, at its full 844: Playwright's own iPhone 13 is 390x664, which is that
  // screen less Safari's chrome, and the budget below is quoted against the screen.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Menu' }).click()
  await expect(page.locator('section.station button.food-row').first()).toBeVisible()

  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('section.station button.food-row')]
    const first = rows[0]?.getBoundingClientRect().top ?? 0
    const hours = document.querySelector('p.hall-hours')?.getBoundingClientRect().height ?? 0
    const tabbar = document.querySelector('.tabbar')?.getBoundingClientRect().height ?? 0
    const targets = [...document.querySelectorAll('.menu fieldset.chips .chip input')].map((e) => e.getBoundingClientRect())
    const overlapping = targets.filter((a, i) => targets.some((b, j) =>
      i !== j && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom))
    return {
      viewport: window.innerHeight,
      firstFood: Math.round(first),
      chrome: Math.round(first - hours),
      // Fully printed and clear of the tab bar: a row half under it is not a row you can read or tap.
      rowsVisible: rows.filter((r) => r.getBoundingClientRect().bottom <= window.innerHeight - tabbar).length,
      undersized: targets.filter((r) => r.height < 44 || r.width < 44).length,
      overlapping: overlapping.length,
      strips: [...document.querySelectorAll('.menu fieldset.chips')].map((f) => Math.round(f.getBoundingClientRect().height)),
    }
  })

  expect(m.chrome, 'px above the first food row, less the hours line (was 456)').toBeLessThanOrEqual(350)
  // 0.47, not 0.45: the measured worst case is 376px of 844 (44.6%), and the margin is the third line a hall
  // with three service windows can add to the hours. The regression this guards against is 59%.
  expect(m.firstFood, 'px above the first food row (was 500 of 844)').toBeLessThanOrEqual(Math.round(m.viewport * 0.47))
  expect(m.rowsVisible, 'food rows fully printed above the tab bar without scrolling').toBeGreaterThanOrEqual(3)
  // The stamps print at 32px; their targets do not shrink with them, and shrinking the strips must never let two
  // rows' targets overlap into each other.
  expect(m.strips.every((h) => h <= 44), `strip heights ${m.strips.join(',')}`).toBe(true)
  expect(m.undersized, 'chip targets under 44x44 CSS px').toBe(0)
  expect(m.overlapping, 'chip targets overlapping another chip').toBe(0)
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
