import type { CustomFood, LogEntry } from './db/types'
import type { Menu, MenuItem } from './menu/feed'
import type { Nutrients } from './nutrition'

export interface SearchItem {
  key: string
  name: string
  source: 'menu' | 'history' | 'custom'
  hall: string | null
  station: string | null
  portion: string
  nutrients: Nutrients
  recipeNumber: string | null
  customFoodId: string | null
  servedOn: string | null // menu date the item is listed for (today preferred); null for history and custom foods
  logged: boolean // the user has logged this food before
}

const DEFAULT_LIMIT = 40

function keyFor(recipeNumber: string | null, customFoodId: string | null, name: string, portion: string): string {
  if (recipeNumber !== null) return `r:${recipeNumber}`
  if (customFoodId !== null) return `c:${customFoodId}`
  return `n:${name.toLowerCase()}|${portion}`
}

export function fromMenuItem(item: MenuItem, hall: string, date: string): SearchItem {
  return {
    key: `r:${item.recipeNumber}`,
    name: item.name,
    source: 'menu',
    hall,
    station: item.station,
    portion: item.portion,
    nutrients: item.nutrients,
    recipeNumber: item.recipeNumber,
    customFoodId: null,
    servedOn: date,
    logged: false,
  }
}

export function fromCustomFood(food: CustomFood): SearchItem {
  return {
    key: `c:${food.id}`,
    name: food.name,
    source: 'custom',
    hall: null,
    station: null,
    portion: food.portion,
    nutrients: food.perServing,
    recipeNumber: null,
    customFoodId: food.id,
    servedOn: null,
    logged: false,
  }
}

function fromLogEntry(entry: LogEntry): SearchItem {
  return {
    key: keyFor(entry.recipeNumber, entry.customFoodId, entry.name, entry.portion),
    name: entry.name,
    source: 'history',
    hall: entry.hall,
    station: entry.station,
    portion: entry.portion,
    nutrients: entry.perServing,
    recipeNumber: entry.recipeNumber,
    customFoodId: entry.customFoodId,
    servedOn: null,
    logged: true,
  }
}

// Precedence per key: custom food > menu > history, but a key the user has logged keeps `logged`.
// Across days the menu entry for `today` wins, otherwise the earliest date; within a date the last hall wins.
export function buildIndex(src: { menu: Menu | null; history: readonly LogEntry[]; customFoods: readonly CustomFood[]; today: string }): SearchItem[] {
  const byKey = new Map<string, SearchItem>()
  const put = (item: SearchItem): void => {
    byKey.set(item.key, byKey.get(item.key)?.logged === true ? { ...item, logged: true } : item)
  }

  for (const entry of src.history) if (entry.deletedAt === null) put(fromLogEntry(entry))

  const days = Object.entries(src.menu?.days ?? {})
    .sort(([a], [b]) => Number(a === src.today) - Number(b === src.today) || b.localeCompare(a))
  for (const [date, halls] of days) {
    for (const hallMenu of halls) {
      for (const meal of hallMenu.meals) {
        for (const menuItem of meal.items) put(fromMenuItem(menuItem, hallMenu.hall, date))
      }
    }
  }

  for (const food of src.customFoods) if (food.deletedAt === null) put(fromCustomFood(food))

  return [...byKey.values()]
}

// Most recently logged distinct foods, newest first.
export function recentItems(history: readonly LogEntry[], limit: number): SearchItem[] {
  const byKey = new Map<string, SearchItem>()
  const live = history.filter((e) => e.deletedAt === null)
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
  for (const entry of live) {
    const item = fromLogEntry(entry)
    if (!byKey.has(item.key)) byKey.set(item.key, item)
  }
  return [...byKey.values()].slice(0, limit)
}

// Foods the user knows (logged or custom) first, then today's menu, then other days.
function tier(item: SearchItem, today: string): number {
  if (item.logged || item.source === 'custom') return 0
  return item.servedOn === today ? 1 : 2
}

export function searchItems(index: readonly SearchItem[], query: string, today: string, limit = DEFAULT_LIMIT): SearchItem[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === '') return []
  const tokens = trimmed.split(/\s+/)
  let firstToken = ''
  for (const token of tokens) { firstToken = token; break }

  const scored: { item: SearchItem; tier: number; score: number }[] = []
  for (const item of index) {
    const haystack = `${item.name} ${item.hall ?? ''} ${item.station ?? ''}`.toLowerCase()
    if (!tokens.every((token) => haystack.includes(token))) continue
    const lowerName = item.name.toLowerCase()
    const nameWords = lowerName.split(/\s+/)
    const score = lowerName.startsWith(trimmed) ? 0 : nameWords.some((word) => word.startsWith(firstToken)) ? 1 : 2
    scored.push({ item, tier: tier(item, today), score })
  }

  scored.sort((a, b) => a.tier - b.tier || a.score - b.score || a.item.name.localeCompare(b.item.name))
  return scored.slice(0, limit).map((s) => s.item)
}
