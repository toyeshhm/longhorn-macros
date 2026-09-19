import { expect, test } from 'vitest'
import { openDB } from 'idb'
import { LocalStore } from '../../src/sync/store'
import type { LogEntry, WeightEntry } from '../../src/db/types'

const per = { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, sugar: 1, sodium: 50 }
const entry = (date = '2026-09-18'): LogEntry => ({
  id: crypto.randomUUID(), date, meal: 'lunch', hall: 'J2', station: null, name: 'Rice', recipeNumber: null,
  customFoodId: null, portion: '1 cup', servings: 1, perServing: per, updatedAt: '', deletedAt: null,
})
const weight = (date: string): WeightEntry => ({ id: crypto.randomUUID(), date, weightLb: 180, updatedAt: '', deletedAt: null })
const open = (): Promise<LocalStore> => LocalStore.open(`t-${crypto.randomUUID()}`)

test('put stamps updatedAt and writes the row plus one outbox item', async () => {
  const s = await open()
  const e = entry()
  const before = new Date().toISOString()
  await s.put('food_log', e)
  const got = await s.get('food_log', e.id)
  expect((got?.updatedAt ?? '') >= before).toBe(true)
  expect({ ...got, updatedAt: '' }).toEqual(e)
  const ob = await s.outbox()
  expect(ob).toEqual([{ seq: ob[0]?.seq, table: 'food_log', id: e.id, attempts: 0, failed: null }])
})

test('a second put of the same id supersedes its outbox item', async () => {
  const s = await open()
  const e = entry()
  await s.put('food_log', e)
  await s.put('food_log', { ...e, servings: 2 })
  expect((await s.outbox()).map((o) => o.id)).toEqual([e.id])
})

test('remove soft-deletes and all() hides it', async () => {
  const s = await open()
  const [a, b] = [entry(), entry()]
  await s.put('food_log', a)
  await s.put('food_log', b)
  await s.remove('food_log', a.id)
  expect((await s.get('food_log', a.id))?.deletedAt).not.toBeNull()
  expect((await s.all('food_log')).map((r) => r.id)).toEqual([b.id])
  await expect(s.remove('food_log', crypto.randomUUID())).rejects.toThrow(/no food_log row/)
})

test('logForDate and weightForDate filter by date and hide deleted', async () => {
  const s = await open()
  const [a, b, c] = [entry('2026-09-18'), entry('2026-09-19'), entry('2026-09-18')]
  for (const r of [a, b, c]) await s.put('food_log', r)
  await s.remove('food_log', c.id)
  expect((await s.logForDate('2026-09-18')).map((r) => r.id)).toEqual([a.id])
  const w = weight('2026-09-18')
  await s.put('weights', w)
  expect((await s.weightForDate('2026-09-18'))?.id).toBe(w.id)
  expect(await s.weightForDate('2026-09-19')).toBeUndefined()
})

test('applyRemote is last-write-wins and skips ids with pending outbox items', async () => {
  const s = await open()
  const local = entry()
  await s.put('food_log', local)
  const pending = await s.get('food_log', local.id)
  if (!pending) throw new Error('missing')
  // Pending local change: even a newer remote row is ignored.
  await s.applyRemote('food_log', [{ ...pending, name: 'Remote', updatedAt: '2999-01-01T00:00:00.000Z' }])
  expect((await s.get('food_log', local.id))?.name).toBe('Rice')
  for (const o of await s.outbox()) await s.ackOutbox(o.seq)
  await s.applyRemote('food_log', [{ ...pending, name: 'Older', updatedAt: '2000-01-01T00:00:00.000Z' }])
  expect((await s.get('food_log', local.id))?.name).toBe('Rice')
  const fresh = { ...entry(), updatedAt: '2026-01-01T00:00:00.000Z' }
  await s.applyRemote('food_log', [{ ...pending, name: 'Newer', updatedAt: '2999-01-01T00:00:00.000Z' }, fresh])
  expect((await s.get('food_log', local.id))?.name).toBe('Newer')
  expect(await s.get('food_log', fresh.id)).toEqual(fresh)
  expect(await s.outbox()).toEqual([])
})

test('bumpOutbox counts attempts and records the reason; unknown seq is a no-op', async () => {
  const s = await open()
  await s.put('food_log', entry())
  const [item] = await s.outbox()
  if (!item) throw new Error('missing')
  await s.bumpOutbox(item.seq, 'rejected')
  expect(await s.outbox()).toEqual([{ ...item, attempts: 1, failed: 'rejected' }])
  await s.bumpOutbox(item.seq + 1000, null)
  expect(await s.outbox()).toEqual([{ ...item, attempts: 1, failed: 'rejected' }])
})

test('meta round-trips', async () => {
  const s = await open()
  expect(await s.getMeta('k')).toBeUndefined()
  await s.setMeta('k', 'v')
  expect(await s.getMeta('k')).toBe('v')
})

test('onChange fires after writes until unsubscribed', async () => {
  const s = await open()
  let n = 0
  const off = s.onChange(() => { n++ })
  await s.put('food_log', entry())
  await s.applyRemote('weights', [])
  expect(n).toBe(2)
  off()
  await s.put('food_log', entry())
  expect(n).toBe(2)
})

test('reopening a database keeps its data', async () => {
  const name = `t-${crypto.randomUUID()}`
  const e = entry()
  await (await LocalStore.open(name)).put('food_log', e)
  expect((await (await LocalStore.open(name)).get('food_log', e.id))?.name).toBe('Rice')
  const raw = await openDB(name)
  expect([...raw.objectStoreNames].sort()).toEqual(['custom_foods', 'food_log', 'meta', 'outbox', 'profile', 'weights'])
  raw.close()
})
