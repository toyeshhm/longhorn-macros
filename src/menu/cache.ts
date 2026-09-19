import { log } from '../log'
import type { LocalStore } from '../sync/store'
import { fetchFeed, parseFeed, type Menu } from './feed'

export interface MenuState { menu: Menu | null; stale: boolean; error: string | null; cachedAt: string | null }

// The raw feed is cached (not the parsed Menu) so a parser fix applies to the cached copy too.
export async function loadMenu(store: LocalStore, fetchFn: typeof fetch): Promise<MenuState> {
  try {
    const raw = await fetchFeed(fetchFn)
    const menu = parseFeed(raw)
    await store.setMeta('menu', JSON.stringify(raw))
    return { menu, stale: false, error: null, cachedAt: menu.cachedAt }
  } catch (e) {
    const error = String(e)
    log.warn('menu.fetch_failed', { error })
    const cached = await store.getMeta('menu')
    if (cached === undefined) return { menu: null, stale: false, error, cachedAt: null }
    try {
      const menu = parseFeed(JSON.parse(cached))
      return { menu, stale: true, error, cachedAt: menu.cachedAt }
    } catch (cacheError) {
      log.error('menu.cache_unreadable', { error: String(cacheError) })
      return { menu: null, stale: false, error, cachedAt: null }
    }
  }
}
