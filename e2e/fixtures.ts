import { test as base, expect, type BrowserContext } from '@playwright/test'

// Collects console errors and uncaught page errors from every page in a context. With allowFailedLoads, Chromium's own
// "Failed to load resource" lines (a request the test deliberately makes fail: offline, wrong password) are not errors.
export function watchConsole(context: BrowserContext, errors: string[], allowFailedLoads: boolean): void {
  context.on('console', (m) => {
    if (m.type() !== 'error' || (allowFailedLoads && m.text().startsWith('Failed to load resource:'))) return
    errors.push(`${m.text()} @ ${m.location().url}`)
  })
  context.on('weberror', (e) => { errors.push(String(e.error())) })
}

// Every E2E fails on a console error. Contexts a test opens itself join via watchConsole(ctx, consoleErrors, allowFailedLoads).
export const test = base.extend<{ allowFailedLoads: boolean; consoleErrors: string[] }>({
  allowFailedLoads: [false, { option: true }],
  consoleErrors: [async ({ context, allowFailedLoads }, use) => {
    const errors: string[] = []
    watchConsole(context, errors, allowFailedLoads)
    await use(errors)
    expect(errors, 'console errors during the test').toEqual([])
  }, { auto: true }],
})

export { expect }
