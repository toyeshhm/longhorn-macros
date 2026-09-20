import type { HallId, Menu, MenuItem } from './feed'

export const HALLS: readonly { id: HallId; label: string; full: string }[] = [
  { id: 'J2', label: 'J2', full: 'J2 Dining' },
  { id: 'JCL', label: 'JCL', full: 'Jester City Limits (JCL)' },
  { id: 'Kins', label: 'Kins', full: 'Kins Dining' },
]

export function groupByStation(items: readonly MenuItem[]): { station: string; items: MenuItem[] }[] {
  const groups: { station: string; items: MenuItem[] }[] = []
  const byStation = new Map<string, MenuItem[]>()
  for (const item of items) {
    let bucket = byStation.get(item.station)
    if (bucket === undefined) {
      bucket = []
      byStation.set(item.station, bucket)
      groups.push({ station: item.station, items: bucket })
    }
    bucket.push(item)
  }
  return groups
}

// Diet and allergen labels are only carried on the menu feed, never on a logged row: anything logged before this
// week's feed, or added by hand, simply has no UT label, and the screens that read this say so rather than guess.
export function legendsByRecipe(menu: Menu | null): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>()
  for (const halls of Object.values(menu?.days ?? {})) {
    for (const hall of halls) for (const meal of hall.meals) for (const item of meal.items) map.set(item.recipeNumber, item.legends)
  }
  return map
}

export function currentMeal(available: readonly string[], now: Date): string | null {
  const first = available[0]
  if (first === undefined) return null
  const minutes = now.getHours() * 60 + now.getMinutes()
  const preferred = minutes < 630 ? 'Breakfast' : minutes < 960 ? 'Lunch' : 'Dinner'
  const match = available.find((name) => name.toLowerCase() === preferred.toLowerCase())
  if (match !== undefined) return match
  if (preferred === 'Breakfast') {
    const brunch = available.find((name) => name.toLowerCase() === 'brunch')
    if (brunch !== undefined) return brunch
  }
  return first
}
