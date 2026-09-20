import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { localDateKey } from '../src/dates'
import { computeTargets, type Profile } from '../src/goals'
import { translator } from '../src/i18n'

const es = translator('es')

const signUp = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.getByLabel('Email').fill(`e2e-${crypto.randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(crypto.randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible()
}

// The Profile tab's own sections are a tablist: opening one is selecting its stamp.
const openSection = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('tab', { name, exact: true }).click()
}

const toSpanish = async (page: Page): Promise<void> => {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Profile' }).click()
  await openSection(page, 'Appearance')
  await page.getByRole('radiogroup', { name: 'Language' }).getByRole('radio', { name: 'Español' }).check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
}

// A custom food is the only way to put numbers a test chose onto the screen: the UT feed's are whatever UT posts.
// Every control it touches is already in Spanish, which is half the point of the walk.
const logFood = async (page: Page, values: Readonly<Record<string, string>>): Promise<void> => {
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Alimento propio', exact: true }).click()
  const form = page.getByRole('dialog', { name: 'Alimento propio' })
  await form.getByLabel('Nombre').fill('Migas Taco')
  for (const [label, v] of Object.entries(values)) await form.getByLabel(label).fill(v)
  await form.getByRole('button', { name: 'Guardar alimento' }).click()
  const added = page.getByRole('dialog', { name: 'Migas Taco' })
  await added.getByRole('button', { name: 'Añadir' }).click()
  await expect(added).toBeHidden()
}

test('the app switches to Spanish, keeps the choice per device, and tells the document it did', async ({ page }) => {
  await signUp(page)
  await toSpanish(page)

  // The whole chrome moves, not just the section that holds the switch.
  await expect(page.getByRole('navigation', { name: es.t('tab.nav') })).toMatchAriaSnapshot(`
    - navigation "Principal":
      - button "Menú"
      - button "Diario"
      - button "Salud"
      - button "Progreso"
      - button "Perfil"
  `)
  for (const name of ['Logros', 'Objetivos', 'Cuenta', 'Apariencia', 'Horarios', 'Datos']) {
    await expect(page.getByRole('tab', { name, exact: true })).toBeVisible()
  }
  await openSection(page, 'Objetivos')
  await expect(page.getByLabel('Año de nacimiento')).toBeVisible()

  // Per device, like the press: it outlives a reload and never goes to the server.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Diario' })).toBeVisible()

  // And back again, so the switch is not a one-way door for a reader who taps it by accident.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Perfil' }).click()
  await openSection(page, 'Apariencia')
  await page.getByRole('radiogroup', { name: 'Idioma' }).getByRole('radio', { name: 'English' }).check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible()
})

test('the app still prints, in English, when the device blocks storage', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage blocked') } })
  })
  await signUp(page)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await toSpanish(page) // applied, just not remembered
  await expect(page.getByRole('tab', { name: 'Apariencia' })).toBeVisible()
})

test('Spanish moves the numbers, the dates and the clock, and leaves UT’s own words alone', async ({ page }) => {
  await signUp(page)
  await toSpanish(page)

  // Targets, so the Tracker has a figure to count down from and a decimal to mark.
  await openSection(page, 'Objetivos')
  const draft: Profile = {
    sex: 'male', birthYear: 2006, heightIn: 70, activity: 'moderate', goal: 'maintain', rateLbPerWeek: 0,
    override: null, adaptiveEnabled: true, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null,
  }
  const targets = computeTargets(draft, 170, new Date().getFullYear())
  await page.getByLabel('Año de nacimiento').fill(String(draft.birthYear))
  await page.getByLabel('Pies').fill('5')
  await page.getByLabel('Pulgadas').fill('10')
  await page.getByLabel('Peso actual (lb)').fill('170')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Guardado' })).toBeVisible()

  await logFood(page, { 'Calorías (kcal)': '1500', 'Proteína (g)': '12.5', 'Carbos (g)': '30', 'Grasa (g)': '9' })

  // A food name from UT stays in UT's English; the app's own note says why, once, on the Menu.
  await expect(page.getByText('Los alimentos, comedores, estaciones y etiquetas de UT van en inglés.')).toBeVisible()

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Diario' }).click()
  await expect(page.getByRole('heading', { name: 'Hoy' })).toBeVisible()
  // es-ES leaves four digits unseparated where English writes "1,500", and marks the decimal with a comma.
  await expect(page.locator('p.eaten')).toHaveText(`1500 consumidas de ${es.n(targets.calories)}`)
  expect(es.n(targets.calories)).not.toContain(',')
  await expect(page.locator('.macro').filter({ hasText: 'Proteína' })).toContainText('12,5 g')
  await expect(page.locator('section.micros')).toContainText('Fibra')

  // The day chips run day-first: 19/9, not 9/19.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Menú' }).click()
  const today = new Date(`${localDateKey(new Date())}T12:00:00`)
  const dayFirst = es.date(today, { month: 'numeric', day: 'numeric' })
  expect(dayFirst).not.toBe(translator('en').date(today, { month: 'numeric', day: 'numeric' }))
  await expect(page.getByRole('radiogroup', { name: 'Día' }).locator('label').filter({ hasText: dayFirst }).first()).toBeVisible()

  // The weigh-in form says lb in Spanish and validates in Spanish.
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Progreso' }).click()
  await page.getByRole('button', { name: 'Guardar peso' }).click()
  await expect(page.getByLabel('Peso (lb)')).toHaveAccessibleDescription('El peso debe estar entre 50 y 700 lb.')
})

test('the longest Spanish lines still fit a 320px phone, in both presses', async ({ page }) => {
  await signUp(page)
  await toSpanish(page)
  await page.setViewportSize({ width: 320, height: 780 })

  const tabs = page.getByRole('navigation', { name: 'Principal' })
  // A phone does not scroll sideways: it widens its own layout viewport, so innerWidth staying at 320 is the tell.
  const layoutWidth = (): number => window.innerWidth

  for (const theme of ['light', 'night'] as const) {
    await tabs.getByRole('button', { name: 'Perfil' }).click()
    await openSection(page, 'Apariencia')
    await page.getByRole('radiogroup', { name: 'Tema' })
      .getByRole('radio', { name: theme === 'light' ? 'Claro' : 'Noche' }).check()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)

    for (const s of ['Menú', 'Diario', 'Salud', 'Progreso', 'Perfil']) {
      await tabs.getByRole('button', { name: s }).click()
      await expect(tabs.getByRole('button', { name: s })).toHaveAttribute('aria-current', 'page')
      expect(await page.evaluate(layoutWidth), `${s} in ${theme} at 320px`).toBe(320)
    }

    // Every section of the Profile tab in turn, which is where the long notes are, and the widest of them all
    // is the one that explains why the food names did not move.
    await tabs.getByRole('button', { name: 'Perfil' }).click()
    for (const name of ['Logros', 'Cuenta', 'Horarios', 'Datos']) {
      await openSection(page, name)
      expect(await page.evaluate(layoutWidth), `Profile > ${name} in ${theme} at 320px`).toBe(320)
    }
  }

  // The reader's text size doubled, in Spanish: still nothing hanging off the side.
  await page.addStyleTag({ content: 'html { font-size: 32px }' })
  for (const s of ['Menú', 'Diario', 'Salud', 'Progreso', 'Perfil']) {
    await tabs.getByRole('button', { name: s }).click()
    expect(await page.evaluate(layoutWidth), `${s} at 320px with 32px root text`).toBe(320)
  }
})
