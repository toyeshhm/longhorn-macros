import { expect, test } from 'vitest'
import { MEALS } from '../src/db/types'
import type { CustomFood, LogEntry } from '../src/db/types'
import type { Menu } from '../src/menu/feed'
import { zeroNutrients, type Nutrients } from '../src/nutrition'
import { buildIndex, recentItems, searchItems } from '../src/search'

const TODAY = '2026-01-01'

test('MEALS lists every Meal in order', () => {
  expect(MEALS).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
})

const nutrients = (calories: number): Nutrients => ({ ...zeroNutrients(), calories })

function logEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'log-1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
    date: '2026-01-01', meal: 'lunch', hall: 'History Hall', station: 'History Station',
    name: 'History Item', recipeNumber: null, customFoodId: null, portion: '1 cup', servings: 1,
    perServing: nutrients(100),
    ...overrides,
  }
}

function customFood(overrides: Partial<CustomFood> = {}): CustomFood {
  return {
    id: 'custom-1', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
    name: 'Custom Item', portion: '1 scoop', perServing: nutrients(200),
    ...overrides,
  }
}

function menuWith(recipeNumber: string, name: string, station: string, hall: 'J2' | 'JCL' | 'Kins' = 'J2'): Menu {
  return {
    cachedAt: '2026-01-01T00:00:00Z',
    dates: ['2026-01-01'],
    days: {
      '2026-01-01': [
        { hall, meals: [{ name: 'Lunch', items: [{ recipeNumber, name, station, portion: '1 serving', nutrients: nutrients(300), legends: [] }] }] },
      ],
    },
  }
}

test('dedup precedence: a menu item beats a history row logged against the same recipe', () => {
  const index = buildIndex({
    menu: menuWith('R1', 'Shared Recipe', 'Grill'),
    history: [logEntry({ recipeNumber: 'R1', name: 'Shared Recipe (stale)', station: 'Old Station' })],
    customFoods: [], today: TODAY,
  })
  expect(index).toHaveLength(1)
  expect(index[0]?.source).toBe('menu')
  expect(index[0]?.station).toBe('Grill')
  expect(index[0]?.logged).toBe(true) // the history flag survives the menu entry replacing it
})

test('custom food overrides a history entry logged against the same custom food id', () => {
  const index = buildIndex({
    menu: null,
    history: [logEntry({ customFoodId: 'c1', name: 'Old Name', portion: '1 cup' })],
    customFoods: [customFood({ id: 'c1', name: 'New Name', portion: '2 cups' })], today: TODAY,
  })
  expect(index).toHaveLength(1)
  expect(index[0]).toMatchObject({ key: 'c:c1', source: 'custom', name: 'New Name', portion: '2 cups' })
})

test('deleted history rows and deleted custom foods are excluded', () => {
  const index = buildIndex({
    menu: null,
    history: [logEntry({ id: 'log-del', deletedAt: '2026-01-02T00:00:00Z' })],
    customFoods: [customFood({ id: 'custom-del', deletedAt: '2026-01-02T00:00:00Z' })], today: TODAY,
  })
  expect(index).toEqual([])
})

test('null menu contributes nothing', () => {
  const index = buildIndex({ menu: null, history: [], customFoods: [], today: TODAY })
  expect(index).toEqual([])
})

test('menu items are gathered across all days and halls', () => {
  const menu: Menu = {
    cachedAt: '2026-01-01T00:00:00Z',
    dates: ['2026-01-01', '2026-01-02'],
    days: {
      '2026-01-01': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [{ recipeNumber: 'A', name: 'Item A', station: 'Grill', portion: '1', nutrients: nutrients(1), legends: [] }] }] }],
      '2026-01-02': [{ hall: 'Kins', meals: [{ name: 'Dinner', items: [{ recipeNumber: 'B', name: 'Item B', station: 'Wok', portion: '1', nutrients: nutrients(1), legends: [] }] }] }],
    },
  }
  const index = buildIndex({ menu, history: [], customFoods: [], today: TODAY })
  expect(index.map((i) => i.recipeNumber).sort()).toEqual(['A', 'B'])
})

test('the same recipeNumber served at two halls on the same day collapses to one deterministic entry', () => {
  // Confirmed reachable against the real UT FoodPro feed: tests/fixtures/feed-sample.json
  // (recorded live 2026-09-18) lists recipe "300041" ("Mini Cinnamon Roll") under both
  // J2 Dining and Kins Dining's breakfast bakery station on the same day — the feed's
  // recipes_data catalog is keyed globally by recipe number and referenced from multiple
  // hall/station listings, so this is not a hypothetical edge case.
  const menu: Menu = {
    cachedAt: '2026-01-01T00:00:00Z',
    dates: ['2026-01-01'],
    days: {
      '2026-01-01': [
        { hall: 'J2', meals: [{ name: 'Breakfast', items: [{ recipeNumber: '300041', name: 'Mini Cinnamon Roll', station: 'Bakery', portion: '1 each', nutrients: nutrients(270), legends: [] }] }] },
        { hall: 'Kins', meals: [{ name: 'Breakfast', items: [{ recipeNumber: '300041', name: 'Mini Cinnamon Roll', station: 'Bakery', portion: '1 each', nutrients: nutrients(270), legends: [] }] }] },
      ],
    },
  }
  const index = buildIndex({ menu, history: [], customFoods: [], today: TODAY })
  expect(index).toHaveLength(1)
  expect(index[0]).toMatchObject({ key: 'r:300041', source: 'menu', hall: 'Kins' })
})

test('history item with no recipe or custom food dedups on lowercased name + portion', () => {
  const index = buildIndex({
    menu: null,
    history: [
      logEntry({ id: 'a', name: 'Banana', portion: '1 medium' }),
      logEntry({ id: 'b', name: 'BANANA', portion: '1 medium' }),
      logEntry({ id: 'c', name: 'Banana', portion: '2 medium' }),
    ],
    customFoods: [], today: TODAY,
  })
  expect(index).toHaveLength(2)
})

test('search: every token must match (AND), across name/hall/station', () => {
  const index = buildIndex({
    menu: menuWith('R1', 'Grilled Chicken', 'Grill Station', 'J2'),
    history: [],
    customFoods: [], today: TODAY,
  })
  expect(searchItems(index, 'grill chicken', TODAY)).toHaveLength(1)
  expect(searchItems(index, 'grill missing', TODAY)).toHaveLength(0)
  expect(searchItems(index, 'j2 grilled', TODAY)).toHaveLength(1)
})

test('search: ranking prefers full-query prefix, then word-prefix, then substring', () => {
  const index = buildIndex({
    menu: null,
    history: [],
    customFoods: [
      customFood({ id: '1', name: 'Chicken Salad' }),
      customFood({ id: '2', name: 'Grilled Chicken' }),
      customFood({ id: '3', name: 'Old Fashioned Chicken' }),
    ],
    today: TODAY,
  })
  const results = searchItems(index, 'chicken', TODAY)
  expect(results.map((r) => r.name)).toEqual(['Chicken Salad', 'Grilled Chicken', 'Old Fashioned Chicken'])
})

test('search: ties break alphabetically by name', () => {
  const index = buildIndex({
    menu: null,
    history: [],
    customFoods: [customFood({ id: '1', name: 'Cake' }), customFood({ id: '2', name: 'Bread' })], today: TODAY,
  })
  // Neither "Cake" nor "Bread" starts with "e", and neither has a word starting with "e" —
  // both land in the same (lowest) rank, so the tiebreak is alphabetical.
  expect(searchItems(index, 'e', TODAY).map((r) => r.name)).toEqual(['Bread', 'Cake'])
})

test('search: default limit is 40, and a custom limit is respected', () => {
  const foods = Array.from({ length: 50 }, (_, i) => customFood({ id: `f${String(i)}`, name: `Fruit ${String(i)}` }))
  const index = buildIndex({ menu: null, history: [], customFoods: foods, today: TODAY })
  expect(searchItems(index, 'fruit', TODAY)).toHaveLength(40)
  expect(searchItems(index, 'fruit', TODAY, 5)).toHaveLength(5)
})

test('search: empty or whitespace-only query returns []', () => {
  const index = buildIndex({ menu: null, history: [], customFoods: [customFood()], today: TODAY })
  expect(searchItems(index, '', TODAY)).toEqual([])
  expect(searchItems(index, '   ', TODAY)).toEqual([])
})

const item = (recipeNumber: string, name: string) => ({ recipeNumber, name, station: 'Grill', portion: '1', nutrients: nutrients(1), legends: [] })

test('a recipe on several days keeps today, else the earliest date', () => {
  const menu: Menu = {
    cachedAt: '2026-01-01T00:00:00Z',
    dates: ['2026-01-01', '2026-01-02', '2026-01-03'],
    days: {
      '2026-01-03': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [item('A', 'Tacos'), item('B', 'Soup')] }] }],
      '2026-01-02': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [item('A', 'Tacos'), item('B', 'Soup')] }] }],
      '2026-01-01': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [item('A', 'Tacos')] }] }],
    },
  }
  const index = buildIndex({ menu, history: [], customFoods: [], today: '2026-01-01' })
  expect(index.find((i) => i.recipeNumber === 'A')?.servedOn).toBe('2026-01-01')
  expect(index.find((i) => i.recipeNumber === 'B')?.servedOn).toBe('2026-01-02')
  // Not served today at all: the earliest upcoming day.
  const later = buildIndex({ menu, history: [], customFoods: [], today: '2025-12-31' })
  expect(later.find((i) => i.recipeNumber === 'A')?.servedOn).toBe('2026-01-01')
})

test('search: logged and custom foods rank first, then today, then other days', () => {
  const menu: Menu = {
    cachedAt: '2026-01-01T00:00:00Z',
    dates: ['2026-01-01', '2026-01-02'],
    days: {
      '2026-01-01': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [item('T', 'Chicken Today')] }] }],
      '2026-01-02': [{ hall: 'J2', meals: [{ name: 'Lunch', items: [item('L', 'Chicken Later'), item('H', 'Chicken Had')] }] }],
    },
  }
  const index = buildIndex({
    menu,
    history: [logEntry({ recipeNumber: 'H', name: 'Chicken Had' })],
    customFoods: [customFood({ id: 'c', name: 'Chicken Mine' })],
    today: '2026-01-01',
  })
  expect(searchItems(index, 'chicken', '2026-01-01').map((r) => r.name)).toEqual(['Chicken Had', 'Chicken Mine', 'Chicken Today', 'Chicken Later'])
})

test('recentItems: distinct foods, newest first, deleted rows skipped, capped', () => {
  const history = [
    logEntry({ id: '1', date: '2026-01-01', name: 'Oats', updatedAt: '2026-01-01T08:00:00Z' }),
    logEntry({ id: '2', date: '2026-01-03', name: 'Tacos', updatedAt: '2026-01-03T12:00:00Z' }),
    logEntry({ id: '3', date: '2026-01-03', name: 'Soup', updatedAt: '2026-01-03T18:00:00Z' }),
    logEntry({ id: '4', date: '2026-01-02', name: 'Tacos', updatedAt: '2026-01-02T12:00:00Z' }),
    logEntry({ id: '5', date: '2026-01-04', name: 'Gone', deletedAt: '2026-01-04T00:00:00Z' }),
  ]
  expect(recentItems(history, 10).map((r) => r.name)).toEqual(['Soup', 'Tacos', 'Oats'])
  expect(recentItems(history, 2).map((r) => r.name)).toEqual(['Soup', 'Tacos'])
  expect(recentItems(history, 1)[0]).toMatchObject({ source: 'history', logged: true, servedOn: null })
})
