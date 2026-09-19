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
}

const DEFAULT_LIMIT = 40

function keyFor(recipeNumber: string | null, customFoodId: string | null, name: string, portion: string): string {
  if (recipeNumber !== null) return `r:${recipeNumber}`
  if (customFoodId !== null) return `c:${customFoodId}`
  return `n:${name.toLowerCase()}|${portion}`
}

function fromMenuItem(item: MenuItem, hall: string): SearchItem {
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
  }
}

function fromCustomFood(food: CustomFood): SearchItem {
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
  }
}

export function buildIndex(src: { menu: Menu | null; history: readonly LogEntry[]; customFoods: readonly CustomFood[] }): SearchItem[] {
  const byKey = new Map<string, SearchItem>()

  for (const entry of src.history) {
    if (entry.deletedAt !== null) continue
    const item = fromLogEntry(entry)
    byKey.set(item.key, item)
  }

  if (src.menu !== null) {
    for (const halls of Object.values(src.menu.days)) {
      for (const hallMenu of halls) {
        for (const meal of hallMenu.meals) {
          for (const menuItem of meal.items) {
            const item = fromMenuItem(menuItem, hallMenu.hall)
            byKey.set(item.key, item)
          }
        }
      }
    }
  }

  for (const food of src.customFoods) {
    if (food.deletedAt !== null) continue
    const item = fromCustomFood(food)
    byKey.set(item.key, item)
  }

  return [...byKey.values()]
}

export function searchItems(index: readonly SearchItem[], query: string, limit = DEFAULT_LIMIT): SearchItem[] {
  const trimmed = query.trim().toLowerCase()
  if (trimmed === '') return []
  const tokens = trimmed.split(/\s+/)
  let firstToken = ''
  for (const token of tokens) { firstToken = token; break }

  const scored: { item: SearchItem; score: number }[] = []
  for (const item of index) {
    const haystack = `${item.name} ${item.hall ?? ''} ${item.station ?? ''}`.toLowerCase()
    if (!tokens.every((token) => haystack.includes(token))) continue
    const lowerName = item.name.toLowerCase()
    const nameWords = lowerName.split(/\s+/)
    const score = lowerName.startsWith(trimmed) ? 0 : nameWords.some((word) => word.startsWith(firstToken)) ? 1 : 2
    scored.push({ item, score })
  }

  scored.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
  return scored.slice(0, limit).map((s) => s.item)
}
