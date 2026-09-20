import { expect, test } from 'vitest'
import { loadHours, loadMenu } from '../../src/menu/cache'
import { LocalStore } from '../../src/sync/store'

const open = (): Promise<LocalStore> => LocalStore.open(`t-${crypto.randomUUID()}`)
const down: typeof fetch = () => fetch('http://127.0.0.1:9/') // real failing network, nothing listens on port 9

test('live fetch returns a fresh menu and caches the raw feed; a failed fetch then serves the cache as stale', async () => {
  const s = await open()
  const fresh = await loadMenu(s, fetch)
  expect(fresh.stale).toBe(false)
  expect(fresh.error).toBeNull()
  expect(fresh.menu?.dates.length).toBeGreaterThan(0)
  expect(fresh.cachedAt).toBe(fresh.menu?.cachedAt)
  expect(await s.getMeta('menu')).toContain('"menuWindow"')

  const cached = await loadMenu(s, down)
  expect(cached.stale).toBe(true)
  expect(cached.error).toMatch(/fetch/i)
  expect(cached.menu).toEqual(fresh.menu)
  expect(cached.cachedAt).toBe(fresh.cachedAt)
}, 60_000)

test('no cache and a failed fetch yields no menu', async () => {
  const r = await loadMenu(await open(), down)
  expect({ ...r, error: null }).toEqual({ menu: null, stale: false, error: null, cachedAt: null })
  expect(r.error).toMatch(/fetch/i)
})

test('a cache the current parser rejects is dropped, not thrown', async () => {
  const s = await open()
  await s.setMeta('menu', '{}')
  const r = await loadMenu(s, down)
  expect(r.menu).toBeNull()
  expect(r.error).toMatch(/fetch/i)
})

test('hours: a live fetch caches the raw body; a failed fetch then serves the cache as stale', async () => {
  const s = await open()
  const fresh = await loadHours(s, fetch)
  expect(fresh.stale).toBe(false)
  expect(fresh.error).toBeNull()
  expect(fresh.hours?.J2).toHaveLength(7)
  expect(await s.getMeta('hours')).toContain('diningHours')

  const cached = await loadHours(s, down)
  expect(cached.stale).toBe(true)
  expect(cached.error).toMatch(/fetch/i)
  expect(cached.hours).toEqual(fresh.hours)
}, 60_000)

test('hours: no cache and a failed fetch yields nothing; a cache the parser rejects is dropped, not thrown', async () => {
  const bare = await loadHours(await open(), down)
  expect({ ...bare, error: null }).toEqual({ hours: null, stale: false, error: null })
  expect(bare.error).toMatch(/fetch/i)

  const s = await open()
  await s.setMeta('hours', 'not a feed')
  expect((await loadHours(s, down)).hours).toBeNull()
})
