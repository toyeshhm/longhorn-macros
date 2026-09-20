import { expect, test } from './fixtures'

/*
 * Safari's engine, on the sheet that broke in the owner's installed app.
 *
 * The bug: `.sheet-body { flex: 1 }` gives the scrollport a zero basis, so wherever the dialog's own height
 * resolves oddly (iOS standalone) the body collapsed to a sliver — one clipped line above the Add plate, with
 * every number gone. Chromium sized it from content and reported the sheet perfect through three audits.
 *
 * So this asserts the shape a screenshot would show: the body is a real fraction of the sheet, the name and
 * the numbers are inside the viewport, and the plate is not sitting on top of the content.
 */
test('the food sheet opens at full height, not collapsed above the Add plate', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()

  const tabs = page.getByRole('navigation', { name: 'Main' })
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByLabel('Name').fill('Sheet Height Check')
  for (const [label, v] of Object.entries({
    'Calories (kcal)': '420', 'Protein (g)': '31', 'Carbs (g)': '44', 'Fat (g)': '12',
    'Fiber (g)': '6', 'Sugar (g)': '9', 'Sodium (mg)': '380',
  })) await form.getByLabel(label).fill(v)
  await form.getByRole('button', { name: 'Save food' }).click()

  const sheet = page.getByRole('dialog', { name: 'Sheet Height Check' })
  await expect(sheet).toBeVisible()

  const box = await sheet.evaluate((d: HTMLElement) => {
    const rect = (el: Element | null): { top: number; bottom: number; height: number } =>
      el === null ? { top: 0, bottom: 0, height: 0 } : (({ top, bottom, height }) => ({ top, bottom, height }))(el.getBoundingClientRect())
    return { sheet: rect(d), body: rect(d.querySelector('.sheet-body')), foot: rect(d.querySelector('.sheet-foot')), viewport: window.innerHeight }
  })

  // The scrollport carries the sheet, not a sliver of it: on a phone this body is ~400px against a ~70px plate.
  expect(box.body.height, 'sheet body collapsed').toBeGreaterThan(200)
  expect(box.body.height / box.sheet.height, 'body is a sliver of the sheet').toBeGreaterThan(0.6)
  // The plate sits below the content rather than over it, and is actually on screen. `toBeInViewport` rather
  // than arithmetic against innerHeight: WebKit measures that against the toolbars-hidden viewport, so the
  // subtraction reports a 15px overhang nobody can see.
  expect(Math.round(box.body.bottom - box.foot.top), 'body overlaps the Add plate').toBeLessThanOrEqual(1)
  await expect(sheet.getByRole('button', { name: 'Add' })).toBeInViewport()

  // The things a reader opens the sheet for are on screen without scrolling it.
  for (const text of ['Sheet Height Check', '420', '31', '44', '12']) {
    await expect(sheet.getByText(text, { exact: false }).first()).toBeInViewport()
  }
})
