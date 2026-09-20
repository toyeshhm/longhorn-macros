import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { translator } from '../src/i18n'
import { PRESS_IDS, PRESSES, type PressId } from '../src/theme'

const t = translator('en')
const pressName = (id: PressId): string => t.t(`press.${id}`)

const openAppearance = async (page: Page): Promise<void> => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Profile' }).click()
  await page.getByRole('tab', { name: 'Appearance' }).click()
}

const choosePress = async (page: Page, id: PressId): Promise<void> => {
  await openAppearance(page)
  await page.getByRole('radiogroup', { name: 'Press', exact: true }).getByRole('radio', { name: pressName(id), exact: true }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', id)
}

/** A profile, so the Tracker prints its hero and its macro bars, and one food so the bars carry ink. */
async function signUpAndLog(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByLabel('Female', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2005')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('5')
  await page.getByLabel('Current weight (lb)').fill('170')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Welcome! Set up your profile')).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill('Press Test Plate')
  await form.getByLabel('Calories (kcal)').fill('900')
  await form.getByLabel('Protein (g)').fill('60')
  await form.getByLabel('Carbs (g)').fill('80')
  await form.getByLabel('Fat (g)').fill('30')
  await form.getByRole('button', { name: 'Save food' }).click()
  const sheet = page.getByRole('dialog', { name: 'Press Test Plate' })
  await sheet.getByRole('button', { name: 'Add' }).click()
  await expect(sheet).toBeHidden()
}

interface Pixels { readonly darkest: number; readonly lightest: number; readonly dominant: number }

/** A fraction of an element's own box: 0,0,1,1 is all of it. */
interface Region { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
const WHOLE: Region = { x: 0, y: 0, width: 1, height: 1 }

/**
 * The luminance of what was actually painted inside part of an element, grain and blend modes included. A token
 * is not what the reader sees: the grain layer lies over every pixel of the page and the second drum multiplies
 * or screens onto the stock under it, and both cost contrast that the hexes in src/theme.ts cannot show.
 *
 * The element screenshots itself and the PNG goes back into the page through a canvas, rather than being decoded
 * here: no image library, no new dependency, and no arithmetic converting a bounding box into page coordinates.
 */
async function pixels(locator: Locator, region: Region = WHOLE): Promise<Pixels> {
  const arg: [string, Region] = [(await locator.screenshot()).toString('base64'), region]
  return locator.page().evaluate(async ([data, part]: [string, Region]): Promise<Pixels> => {
    const img = new Image()
    img.src = `data:image/png;base64,${data}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('no 2d canvas context')
    ctx.drawImage(img, 0, 0)
    const px = ctx.getImageData(
      Math.floor(part.x * img.width), Math.floor(part.y * img.height),
      Math.max(1, Math.floor(part.width * img.width)), Math.max(1, Math.floor(part.height * img.height)),
    ).data
    const channel = (v: number): number => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4)
    const all: number[] = []
    // Quantised to 5 bits a channel, so antialiasing does not split one flat area into a hundred near colours.
    const buckets = new Map<number, { count: number; sum: number }>()
    for (let i = 0; i + 3 < px.length; i += 4) {
      const [r, g, b] = [px[i] ?? 0, px[i + 1] ?? 0, px[i + 2] ?? 0]
      const lum = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
      all.push(lum)
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
      const bucket = buckets.get(key) ?? { count: 0, sum: 0 }
      buckets.set(key, { count: bucket.count + 1, sum: bucket.sum + lum })
    }
    all.sort((a, b) => a - b)
    const at = (q: number): number => all[Math.min(all.length - 1, Math.floor(all.length * q))] ?? 0
    let top = { count: 0, sum: 0 }
    for (const bucket of buckets.values()) if (bucket.count > top.count) top = bucket
    // Third and 97th rather than the two extremes: one stray antialiased pixel is not what anybody reads.
    return { darkest: at(0.03), lightest: at(0.97), dominant: top.sum / Math.max(1, top.count) }
  }, arg)
}

function ratio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test('every press repaints on its own stock and is still there after a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()

  const stocks = new Set<string>()
  for (const id of PRESS_IDS) {
    await choosePress(page, id)
    // Per device, so it outlives a reload without ever going to the server — and the boot script, not the
    // bundle, is what puts it back: the stock is on the page before a line of the app has parsed.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', id)
    expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe(PRESSES[id].paper)
    const stock: string = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(stocks, `${id} prints on a stock another press already uses`).not.toContain(stock)
    stocks.add(stock)
    // The marks are drawn from the press too, so the page's hand-ruled lines change with it.
    const rule: string = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--mark-rule'))
    expect(rule, `${id} rule`).toContain(encodeURIComponent(PRESSES[id].blue))
  }
})

test('Match phone runs the press the reader named for each side of the phone', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await openAppearance(page)
  await page.getByRole('radiogroup', { name: 'Press', exact: true }).getByRole('radio', { name: 'Match phone' }).check()

  await page.getByRole('radiogroup', { name: 'Press for light mode' }).getByRole('radio', { name: pressName('newsprint') }).check()
  await page.getByRole('radiogroup', { name: 'Press for dark mode' }).getByRole('radio', { name: pressName('blueprint') }).check()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'newsprint')

  // The pair is remembered per device as well, so Match phone does not reset to the two presses it shipped with.
  await page.reload()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blueprint')
})

test('every press clears 4.5:1 on body text and 3:1 on a macro ink, measured on rendered pixels', async ({ page }) => {
  await signUpAndLog(page)
  const failures: string[] = []
  for (const id of PRESS_IDS) {
    await choosePress(page, id)
    await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Tracker' }).click()

    // Body text at its lightest: the Soft Ink line of micros. Inside one line of type the darkest pixels are the
    // glyph and the lightest are the stock it is printed on, grain and all, which is the ratio a reader gets.
    const micros = await pixels(page.locator('.micros'))
    const text = ratio(micros.darkest, micros.lightest)
    if (text < 4.5) failures.push(`${id}: body text ${text.toFixed(2)}:1`)

    // A macro ink as it actually prints: the calories fill is the second drum laid onto the stock in the press's
    // own blend mode, so the painted colour is not the token. Taken from the left of the bar, well inside the
    // fill and clear of its hand-drawn outline, against the stock the line above is printed on — which is that
    // line's commonest colour, not its lightest: on dark stock the lightest pixel in a line of type is the type.
    const fill = await pixels(page.locator('.calories .ink-bar'), { x: 0.04, y: 0.35, width: 0.08, height: 0.3 })
    const ink = ratio(fill.dominant, micros.dominant)
    if (ink < 3) failures.push(`${id}: the calories ink ${ink.toFixed(2)}:1 on its stock`)
  }
  expect(failures).toEqual([])
})
