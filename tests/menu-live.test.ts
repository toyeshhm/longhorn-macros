import { expect, test } from 'vitest'
import { fetchMenu } from '../src/menu/feed'
test('live UT feed parses with ≥1 hall and ≥20 items', async () => {
  const menu = await fetchMenu(fetch)
  expect(menu.dates.length).toBeGreaterThan(0)
  const items = Object.values(menu.days).flat().flatMap(h => h.meals.flatMap(m => m.items))
  expect(items.length).toBeGreaterThanOrEqual(20)
}, 30_000)
test('non-OK response throws', async () => {
  await expect(fetchMenu(() => fetch('https://hf-foodpro.austin.utexas.edu/foodpro/does-not-exist-404'))).rejects.toThrow(/UT menu HTTP/)
}, 30_000)
