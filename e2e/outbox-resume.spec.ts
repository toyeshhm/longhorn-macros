import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

// Auth expiry / logout must keep the LocalStore: a change queued while signed out is pushed after the next sign-in.
test('outbox queued while signed out is pushed after sign-in', async ({ page }) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`
  const password = crypto.randomUUID()
  const weightId = crypto.randomUUID()

  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  const tabs = page.getByRole('navigation', { name: 'Main' })
  await expect(tabs).toBeVisible()
  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  // Signed out: the user's database is still on disk. Queue a weight directly in it (no weight UI until Task 13).
  const queued = await page.evaluate(async (id) => {
    const name = (await indexedDB.databases()).map((d) => d.name).find((n) => n?.startsWith('lm-'))
    if (name === undefined) throw new Error('user database was deleted on sign-out')
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name)
      r.onsuccess = () => { resolve(r.result) }
      r.onerror = () => { reject(new Error(String(r.error))) }
    })
    const tx = db.transaction(['weights', 'outbox'], 'readwrite')
    tx.objectStore('weights').put({ id, date: '2026-01-15', weightLb: 181.5, updatedAt: new Date().toISOString(), deletedAt: null })
    tx.objectStore('outbox').add({ table: 'weights', id, attempts: 0, failed: null })
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => { resolve() }
      tx.onerror = () => { reject(new Error(String(tx.error))) }
    })
    db.close()
    return name
  }, weightId)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(tabs).toBeVisible()

  // Outbox drains locally...
  await expect.poll(() => page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(name)
      r.onsuccess = () => { resolve(r.result) }
      r.onerror = () => { reject(new Error(String(r.error))) }
    })
    const n = await new Promise<number>((resolve, reject) => {
      const c = db.transaction('outbox').objectStore('outbox').count()
      c.onsuccess = () => { resolve(c.result) }
      c.onerror = () => { reject(new Error(String(c.error))) }
    })
    db.close()
    return n
  }, queued)).toBe(0)

  // ...and the row is on the server.
  const env = loadEnv('test', process.cwd(), 'VITE_')
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('run `make db-env` first')
  const client = createClient(url, key, { auth: { persistSession: false } })
  const { error: authError } = await client.auth.signInWithPassword({ email, password })
  expect(authError).toBeNull()
  const { data, error } = await client.from('weights').select('id, weight_lb').eq('id', weightId)
  expect(error).toBeNull()
  expect(data).toEqual([{ id: weightId, weight_lb: 181.5 }])
})
