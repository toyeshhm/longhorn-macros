import { expect, test } from 'vitest'
import { fetchHours, parseHours } from '../src/menu/hours'
import { localDateKey } from '../src/dates'

test('live UT hours feed parses with a week for every dining hall', async () => {
  const hours = parseHours(await fetchHours(fetch), localDateKey(new Date()))
  for (const week of [hours.J2, hours.JCL, hours.Kins]) {
    expect(week).toHaveLength(7)
    expect(week.filter((d) => d !== null).length).toBeGreaterThan(0)
  }
}, 30_000)

test('non-OK response throws', async () => {
  await expect(fetchHours(() => fetch('https://hf-foodpro.austin.utexas.edu/foodpro/does-not-exist-404')))
    .rejects.toThrow(/UT hours HTTP/)
}, 30_000)
