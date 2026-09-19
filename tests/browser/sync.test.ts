import { afterEach, beforeAll, expect, test } from 'vitest'
import { openDB } from 'idb'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { backoffMs, SyncEngine } from '../../src/sync/engine'
import { LocalStore } from '../../src/sync/store'
import type { LogEntry, ProfileRow, WeightEntry } from '../../src/db/types'
import { ANON_KEY, SUPABASE_URL } from './env'

const per = { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, sugar: 1, sodium: 50 }
const entry = (servings = 1): LogEntry => ({
  id: crypto.randomUUID(), date: '2026-09-18', meal: 'dinner', hall: 'Kins', station: null, name: 'Pasta', recipeNumber: '42',
  customFoodId: null, portion: '1 cup', servings, perServing: per, updatedAt: '', deletedAt: null,
})
const client = (url = SUPABASE_URL) =>
  createClient(url, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: crypto.randomUUID() } })
const dbName = (): string => `t-${crypto.randomUUID()}`

let email: string
let password: string
let phone: SupabaseClient
let userId: string
const engines: SyncEngine[] = []
const engine = (store: LocalStore, c: SupabaseClient): SyncEngine => {
  const e = new SyncEngine(store, c, userId)
  engines.push(e)
  return e
}
afterEach(() => { for (const e of engines.splice(0)) e.stop() })

beforeAll(async () => {
  email = `t-${crypto.randomUUID()}@example.test`
  password = crypto.randomUUID()
  phone = client()
  const { data, error } = await phone.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('signUp returned no user')
  userId = data.user.id
}, 30_000)

test('backoff doubles from 2s and caps at 5 min', () => {
  expect([backoffMs(0), backoffMs(3), backoffMs(20)]).toEqual([2000, 16000, 300000])
})

test('push uploads, pull syncs to a second device, edits flow back', async () => {
  const s1 = await LocalStore.open(dbName())
  const e1 = engine(s1, phone)
  const log = entry()
  const w: WeightEntry = { id: crypto.randomUUID(), date: '2026-09-18', weightLb: 181.5, updatedAt: '', deletedAt: null }
  const profile: ProfileRow = {
    id: userId, sex: 'male', birthYear: 2004, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
    override: null, adaptiveEnabled: true, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null, updatedAt: '', deletedAt: null,
  }
  await s1.put('food_log', log)
  await s1.put('weights', w)
  await s1.put('profile', profile)
  expect(await e1.pending()).toEqual({ queued: 3, failed: 0 })
  expect(await e1.push()).toEqual({ pushed: 3, failed: 0 })
  expect(await s1.outbox()).toEqual([])
  const remote = await phone.from('food_log').select('id, user_id, servings').eq('id', log.id)
  expect(remote.data).toEqual([{ id: log.id, user_id: userId, servings: 1 }])
  expect((await phone.from('weights').select('id').eq('id', w.id)).data).toEqual([{ id: w.id }])

  const laptop = client()
  const signIn = await laptop.auth.signInWithPassword({ email, password })
  expect(signIn.error).toBeNull()
  const s2 = await LocalStore.open(dbName())
  const e2 = engine(s2, laptop)
  expect(await e2.pull()).toBeGreaterThanOrEqual(3)
  expect(await s2.get('food_log', log.id)).toEqual(await s1.get('food_log', log.id))
  expect((await s2.get('weights', w.id))?.weightLb).toBe(181.5)
  expect(await e2.pull()).toBe(0) // cursor advanced

  const synced = await s2.get('food_log', log.id)
  if (!synced) throw new Error('missing')
  await s2.put('food_log', { ...synced, servings: 3 })
  await e2.runOnce()
  expect(await e2.pending()).toEqual({ queued: 0, failed: 0 })
  await e1.runOnce()
  expect((await s1.get('food_log', log.id))?.servings).toBe(3)
}, 30_000)

test('a rejected row is marked failed and not retried', async () => {
  const s = await LocalStore.open(dbName())
  const e = engine(s, phone)
  await s.put('food_log', entry(0)) // violates CHECK servings > 0
  const ok = entry()
  await s.put('food_log', ok)
  expect(await e.push()).toEqual({ pushed: 1, failed: 1 })
  expect(await e.pending()).toEqual({ queued: 0, failed: 1 })
  const [item] = await s.outbox()
  expect(item?.failed).toMatch(/servings/)
  expect(item?.attempts).toBe(1)
  expect(await e.push()).toEqual({ pushed: 0, failed: 0 })
  expect((await s.outbox())[0]).toEqual(item)
})

test('an outbox item whose local row vanished is acked', async () => {
  const name = dbName()
  const s = await LocalStore.open(name)
  const e = engine(s, phone)
  const log = entry()
  await s.put('food_log', log)
  const raw = await openDB(name)
  await raw.delete('food_log', log.id)
  raw.close()
  expect(await e.push()).toEqual({ pushed: 0, failed: 0 })
  expect(await s.outbox()).toEqual([])
})

test('network failure: push and pull reject, outbox is retained', async () => {
  const s = await LocalStore.open(dbName())
  const e = engine(s, client('http://127.0.0.1:9'))
  await s.put('food_log', entry())
  await expect(e.push()).rejects.toThrow(/network/)
  await expect(e.pull()).rejects.toThrow(/Failed to fetch/)
  expect(await e.pending()).toEqual({ queued: 1, failed: 0 })
  await e.runOnce() // swallowed + logged; not started, so no retry scheduled
  expect(await e.pending()).toEqual({ queued: 1, failed: 0 })
})

test('start syncs now and on online/visibilitychange; overlapping runs share one cycle', async () => {
  const s = await LocalStore.open(dbName())
  const e = engine(s, phone)
  const a = e.runOnce()
  expect(e.runOnce()).toBe(a)
  await a
  e.start()
  await e.runOnce() // joins the cycle start() kicked off
  await s.put('food_log', entry())
  window.dispatchEvent(new Event('online'))
  await expect.poll(async () => (await e.pending()).queued).toBe(0)
  await s.put('food_log', entry())
  document.dispatchEvent(new Event('visibilitychange'))
  await expect.poll(async () => (await e.pending()).queued).toBe(0)
  e.stop()
  await s.put('food_log', entry())
  window.dispatchEvent(new Event('online'))
  await new Promise((r) => setTimeout(r, 300))
  expect((await e.pending()).queued).toBe(1)
})

test('a started engine schedules a backoff retry after a network failure', async () => {
  const s = await LocalStore.open(dbName())
  const e = engine(s, client('http://127.0.0.1:9'))
  await s.put('food_log', entry())
  expect(e.retrying).toBe(false)
  e.start()
  await e.runOnce()
  expect(e.retrying).toBe(true)
  expect(await e.pending()).toEqual({ queued: 1, failed: 0 })
})

test('a trigger during a cycle runs one more cycle, so a write made mid-cycle is pushed', async () => {
  const s = await LocalStore.open(dbName())
  const e = engine(s, phone)
  const a = e.runOnce() // its push has already read the (empty) outbox
  await s.put('food_log', entry())
  expect(e.runOnce()).toBe(a)
  await a
  expect(await e.pending()).toEqual({ queued: 0, failed: 0 })
})
