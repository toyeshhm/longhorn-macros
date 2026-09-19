import { expect, test } from 'vitest'
import { loadMenu } from '../../src/menu/cache'
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
