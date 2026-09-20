import type { HallId, MenuItem } from './feed'

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
