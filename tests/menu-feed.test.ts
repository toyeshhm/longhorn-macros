import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseFeed } from '../src/menu/feed'
const raw: unknown = JSON.parse(readFileSync(new URL('./fixtures/feed-sample.json', import.meta.url), 'utf8'))
test('parses halls, meals, stations, nutrients from real feed sample', () => {
  const menu = parseFeed(raw)
  const day = menu.days[menu.dates[0] ?? '']
  expect(day?.map(h => h.hall).sort()).toEqual(['J2', 'JCL', 'Kins'])
  const item = day?.[0]?.meals[0]?.items[0]
  expect(item?.station).not.toBe('')
  expect(item?.portion).toMatch(/\S/)
  expect(Number.isFinite(item?.nutrients.calories)).toBe(true)
})
test('skips unknown location, missing recipe, and non-numeric required nutrient', () => {
  const menu = parseFeed(raw)
  const names = Object.values(menu.days).flat().flatMap(h => h.meals.flatMap(m => m.items.map(i => i.name)))
  expect(names).not.toContain('Ghost Item')
  expect(names).not.toContain('Blank Cals Item')
})
test.each([[null, 'root'], [{}, 'menuWindow'], [{ menuWindow: { dates: [] }, days: {}, data_object: {} }, 'recipes_data']])(
  'throws on shape change %#', (bad, path) => { expect(() => parseFeed(bad)).toThrow(new RegExp(`format changed: .*${path}`)) })

test('throws when a would-be array field is not an array', () => {
  expect(() => parseFeed({ menuWindow: { dates: 'nope' } })).toThrow(/format changed: .*menuWindow\.dates/)
})

test('throws when a would-be string field is not a string', () => {
  expect(() => parseFeed({ menuWindow: { dates: [123] } })).toThrow(/format changed: .*menuWindow\.dates\[0\]/)
})

// Minimal literal (not a cast of `raw`) so each edge case stays typed without `as`.
function baseFeed(recipeOverrides: Record<string, unknown> = {}, recipes: { number: string; name: string }[] = [
  { number: '', name: '-- Grill --' },
  { number: '1', name: 'Test Item' },
]) {
  return {
    last_cached: '2026-01-01 00:00:00',
    menuWindow: { dates: ['01/01/2026'] },
    data_object: {
      global_data: { legendInfo: { VGN_lbl: 'Vegan' } },
      recipes_data: {
        '1': {
          name: 'Test Item',
          portionSize: '3',
          portionUnit: 'oz',
          legends: ['VGN'],
          nutrients: [
            { name: 'Cals', value: '100' },
            { name: 'Prot', value: '5' },
            { name: 'Carb', value: '10' },
            { name: 'Fat-T', value: '2' },
            { name: 'Fiber', value: '1' },
          ],
          ...recipeOverrides,
        },
      },
    },
    days: {
      '01/01/2026': {
        locations: [
          { locationNum: '12', locationName: 'J2 Dining', meals: [{ mealName: 'Breakfast', recipes }] },
        ],
      },
    },
  }
}
function firstItem(menu: ReturnType<typeof parseFeed>) {
  return menu.days[menu.dates[0] ?? '']?.[0]?.meals[0]?.items[0]
}

test('station header regex groups items under the header name', () => {
  const item = firstItem(parseFeed(baseFeed()))
  expect(item?.station).toBe('Grill')
})

test('items before any station header get station "Other"', () => {
  const item = firstItem(parseFeed(baseFeed({}, [{ number: '1', name: 'Test Item' }])))
  expect(item?.station).toBe('Other')
})

test('optional nutrient missing or non-finite defaults to 0', () => {
  const item = firstItem(parseFeed(baseFeed({
    nutrients: [
      { name: 'Cals', value: '100' }, { name: 'Prot', value: '5' }, { name: 'Carb', value: '10' }, { name: 'Fat-T', value: '2' },
    ],
  })))
  expect(item?.nutrients.fiber).toBe(0)
})

test('empty portion size and unit default to "1 serving"', () => {
  const item = firstItem(parseFeed(baseFeed({ portionSize: '', portionUnit: '' })))
  expect(item?.portion).toBe('1 serving')
})

test('unknown legend code is kept raw', () => {
  const item = firstItem(parseFeed(baseFeed({ legends: ['ZZZ_UNKNOWN'] })))
  expect(item?.legends).toEqual(['ZZZ_UNKNOWN'])
})

test('missing legends/nutrients keys on a recipe default to empty arrays', () => {
  const withLegends = firstItem(parseFeed(baseFeed({ legends: undefined })))
  expect(withLegends?.legends).toEqual([])
  const menu = parseFeed(baseFeed({ nutrients: undefined }))
  const names = Object.values(menu.days).flat().flatMap(h => h.meals.flatMap(m => m.items.map(i => i.name)))
  expect(names).not.toContain('Test Item') // required nutrients absent -> item skipped
})

test('non-string portionSize/portionUnit fall back to empty and still yield "1 serving"', () => {
  const item = firstItem(parseFeed(baseFeed({ portionSize: null, portionUnit: null })))
  expect(item?.portion).toBe('1 serving')
})

test('a "" number row that does not match the station-header pattern is ignored, station stays "Other"', () => {
  const item = firstItem(parseFeed(baseFeed({}, [{ number: '', name: 'Not A Header' }, { number: '1', name: 'Test Item' }])))
  expect(item?.station).toBe('Other')
})

test('missing legendInfo on global_data defaults to {} and legend codes stay raw', () => {
  const feed = baseFeed()
  const withoutLegendInfo = { ...feed, data_object: { ...feed.data_object, global_data: {} } }
  const item = firstItem(parseFeed(withoutLegendInfo))
  expect(item?.legends).toEqual(['VGN'])
})
