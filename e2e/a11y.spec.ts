import { expect, test } from './fixtures'

const SCREENS = ['Menu', 'Tracker', 'Health', 'Progress', 'Profile'] as const

// A phone does not scroll sideways when something is too wide: it widens its own layout viewport and shrinks
// everything to fit, so window.innerWidth staying at the viewport width is the tell that nothing overflowed.
const layoutWidth = (): number => window.innerWidth

test('mobile and screen reader basics: 320px layout, big text, dialogs, focus return, field errors', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await expect(tabs).toMatchAriaSnapshot(`
    - navigation "Main":
      - button "Menu"
      - button "Tracker"
      - button "Health"
      - button "Progress"
      - button "Profile"
  `)

  // A link that switches tabs unmounts the control that had focus. The new screen claims it back rather than
  // letting it fall to <body>, which is silent: a screen-reader user would be dropped at the top of the document
  // with no word that the page had changed.
  await tabs.getByRole('button', { name: 'Health' }).click()
  await page.getByRole('button', { name: 'Set up your goals' }).click()
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
  await expect(page.locator('main.screen')).toBeFocused()

  // Custom food: every message is tied to the input it is about, not pooled at the foot of the form.
  await tabs.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('button', { name: 'Custom food', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Custom food' })
  await form.getByRole('button', { name: 'Save food' }).click()
  await expect(form.getByLabel('Name')).toHaveAccessibleDescription('Name must be 1–200 characters.')
  await expect(form.getByLabel('Name')).toHaveAttribute('aria-invalid', 'true')
  await form.getByLabel('Name').fill('A11y Bar')
  await form.getByRole('button', { name: 'Save food' }).click()
  await expect(form.getByLabel('Calories (kcal)')).toHaveAccessibleDescription('Calories (kcal) is required.')
  for (const [label, v] of Object.entries({ 'Calories (kcal)': '250', 'Protein (g)': '10', 'Carbs (g)': '30', 'Fat (g)': '9' })) {
    await form.getByLabel(label).fill(v)
  }
  await form.getByRole('button', { name: 'Save food' }).click()
  const added = page.getByRole('dialog', { name: 'A11y Bar' })
  await added.getByLabel('Meal').selectOption('lunch')
  await added.getByRole('button', { name: 'Add' }).click()
  await expect(added).toBeHidden()

  // Weight form: same, and the message names the field it belongs to.
  await tabs.getByRole('button', { name: 'Progress' }).click()
  await page.getByRole('button', { name: 'Save weight' }).click()
  await expect(page.getByLabel('Weight (lb)')).toHaveAccessibleDescription('Weight must be between 50 and 700 lb.')

  // iPhone SE width: no screen pushes the page sideways, and the tab bar says which page is current.
  await page.setViewportSize({ width: 320, height: 780 })
  for (const s of SCREENS) {
    await tabs.getByRole('button', { name: s }).click()
    await expect(tabs.getByRole('button', { name: s })).toHaveAttribute('aria-current', 'page')
    expect(await page.evaluate(layoutWidth), `${s} at 320px`).toBe(320)
  }

  // The entry sheet is a labelled dialog; Esc closes it and focus goes back to the row that opened it.
  await tabs.getByRole('button', { name: 'Tracker' }).click()
  const row = page.getByRole('button', { name: /A11y Bar/ })
  await row.click()
  const entry = page.getByRole('dialog', { name: 'A11y Bar' })
  await expect(entry).toBeVisible()
  await expect(entry.getByRole('heading', { name: 'A11y Bar' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(entry).toBeHidden()
  await expect(row).toBeFocused()
  // Save unmounts the sheet without ever calling close(), which is the path that used to drop focus on <body>.
  await row.click()
  await entry.getByRole('button', { name: 'Save' }).click()
  await expect(entry).toBeHidden()
  await expect(row).toBeFocused()

  // Deleting takes the focused row away with it, so focus moves to the Undo in the toast, and back to the
  // screen when the toast is gone: never to <body>.
  await row.click()
  await entry.getByRole('button', { name: 'Delete' }).click()
  const undo = page.getByRole('status').getByRole('button', { name: 'Undo' })
  await expect(undo).toBeFocused()
  await undo.click()
  await expect(page.locator('main.screen')).toBeFocused()
  await expect(row).toBeVisible()

  // The user's text size doubled: still no sideways scroll, and the tab bar does not cover the page.
  await page.addStyleTag({ content: 'html { font-size: 32px }' })
  for (const s of SCREENS) {
    await tabs.getByRole('button', { name: s }).click()
    expect(await page.evaluate(layoutWidth), `${s} at 320px with 32px root text`).toBe(320)
  }
  expect(await page.evaluate(() => {
    const bar = document.querySelector('nav.tabbar')?.getBoundingClientRect().height ?? 0
    const reserved = parseFloat(getComputedStyle(document.querySelector('main.screen') ?? document.body).paddingBottom)
    return reserved >= bar
  }), 'the space reserved under the screen still clears the tab bar').toBe(true)
})

test.describe(() => {
  test.use({ reducedMotion: 'reduce' })

  test('reduced motion stops the line boil and every transition', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByLabel('Email')).toBeVisible()
    expect(await page.evaluate(() => {
      const frames = [...document.querySelectorAll('.boil')]
      const button = document.querySelector('button.primary')
      const [first, second] = frames
      return {
        boil: first === undefined ? 'missing' : getComputedStyle(first).animationName,
        frame2: second === undefined ? 'missing' : getComputedStyle(second).visibility,
        button: button === null ? 'missing' : getComputedStyle(button).transitionDuration,
      }
    })).toEqual({ boil: 'none', frame2: 'hidden', button: '0s' })
  })
})

test('at 320px with 200% text nothing runs off the page and nothing overprints, in Spanish too', async ({ page }) => {
  // Two failures the English sweep above cannot see. The Spanish empty state ran 22px past a 320px viewport,
  // which widens the layout viewport and drags the fixed tab bar out with it on every screen in the session; and
  // the Tracker's macro rows printed the macro name on top of its own number, which is the app's main readout.
  // The second is entirely inside the page, so window.innerWidth never notices it.
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  // Targets, so the Tracker prints its macro rows; nothing logged, so it also prints its empty state.
  await page.getByLabel('Female', { exact: true }).check()
  await page.getByLabel('Birth year').fill('2005')
  await page.getByLabel('Feet').fill('5')
  await page.getByLabel('Inches').fill('5')
  await page.getByLabel('Current weight (lb)').fill('170')
  await page.getByLabel('Activity').selectOption({ label: 'Moderate: exercise 3–5×/wk' })
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Welcome! Set up your profile')).toHaveCount(0)

  await page.getByRole('heading', { name: 'Appearance' }).click()
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Español' }).check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')

  await page.setViewportSize({ width: 320, height: 780 })
  await page.addStyleTag({ content: 'html { font-size: 32px }' })
  const tabs = page.getByRole('navigation', { name: 'Principal' })
  for (const s of ['Menú', 'Diario', 'Salud', 'Progreso', 'Perfil']) {
    await tabs.getByRole('button', { name: s }).click()
    expect(await page.evaluate(layoutWidth), `${s} at 320px with 32px root text, in Spanish`).toBe(320)
    expect(await page.evaluate(() => Math.round(document.querySelector('nav.tabbar')?.getBoundingClientRect().right ?? -1)),
      `the tab bar still ends at the page edge on ${s}`).toBe(320)
  }

  await tabs.getByRole('button', { name: 'Diario' }).click()
  await expect(page.locator('.empty')).toBeVisible()
  // The painted text, not the box: a grid item whose track resolves narrower than the word inside it paints its
  // glyphs outside its own area, so the element's rect can look fine while the reader sees one word over another.
  expect(await page.evaluate(() => [...document.querySelectorAll('.macro')].map((row) => {
    const name = row.querySelector('.macro-name')
    const num = row.querySelector('.macro-num')
    if (name === null || num === null) return 'a macro row is missing its name or its number'
    const range = document.createRange()
    range.selectNodeContents(name)
    const right = Math.max(...[...range.getClientRects()].map((r) => r.right))
    const left = num.getBoundingClientRect().left
    return left >= right ? 'clear' : `${name.textContent} overprints its number by ${String(Math.round(right - left))}px`
  }))).toEqual(['clear', 'clear', 'clear'])
})
