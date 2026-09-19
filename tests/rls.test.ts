import { beforeAll, expect, test } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fromRemote, toRemote } from '../src/db/codec'
import type { TableName, Tables } from '../src/db/types'
import { newUserClient } from './helpers/supabase'

const per = { calories: 100, protein: 5, carbs: 10, fat: 2, fiber: 1, sugar: 1, sodium: 50 }
const now = '2026-09-18T12:00:00.000Z'
const meta = (): { id: string; updatedAt: string; deletedAt: null } => ({ id: crypto.randomUUID(), updatedAt: now, deletedAt: null })

let a: { client: SupabaseClient; userId: string }
let b: { client: SupabaseClient; userId: string }
let rows: { [K in TableName]: Tables[K] }

beforeAll(async () => {
  [a, b] = await Promise.all([newUserClient(), newUserClient()])
  rows = {
    food_log: {
      ...meta(), date: '2026-09-18', meal: 'dinner', hall: 'Kins', station: null, name: 'Pasta', recipeNumber: '42',
      customFoodId: null, portion: '1 cup', servings: 2, perServing: per,
    },
    custom_foods: { ...meta(), name: 'Protein bar', portion: '1 bar', perServing: per },
    weights: { ...meta(), date: '2026-09-18', weightLb: 181.2 },
    profile: {
      ...meta(), id: a.userId, sex: 'female', birthYear: 2005, heightIn: 64.5, activity: 'light', goal: 'maintain',
      rateLbPerWeek: 0, override: { protein: 120 }, adaptiveEnabled: false, tdeeEstimate: 2100.5,
      tdeeUpdatedOn: '2026-09-17', tdeePrevious: 2050,
    },
  }
}, 30_000)

const TABLES: readonly TableName[] = ['food_log', 'custom_foods', 'weights', 'profile']
const ownerCol = (t: TableName): string => (t === 'profile' ? 'id' : 'user_id')

test('owner upserts and reads back each table through the codec', async () => {
  for (const t of TABLES) {
    const up = await a.client.from(t).upsert(toRemote(t, rows[t]))
    expect(up.error, t).toBeNull()
    const sel = await a.client.from(t).select('*').eq('id', rows[t].id)
    expect(sel.error, t).toBeNull()
    expect(sel.data?.map((r) => fromRemote(t, r)), t).toEqual([rows[t]])
  }
})

test('user B sees none of A\'s rows', async () => {
  for (const t of TABLES) {
    const sel = await b.client.from(t).select('*')
    expect(sel.error, t).toBeNull()
    expect(sel.data, t).toEqual([])
  }
})

test('user B cannot write a row owned by A', async () => {
  for (const t of TABLES) {
    const rec = { ...toRemote(t, { ...rows[t], id: t === 'profile' ? a.userId : crypto.randomUUID() }), [ownerCol(t)]: a.userId }
    const up = await b.client.from(t).upsert(rec)
    expect(up.error?.code, t).toBe('42501')
  }
})

test('delete is not granted', async () => {
  for (const t of TABLES) {
    const del = await a.client.from(t).delete().eq('id', rows[t].id).select()
    expect(del.error?.code, t).toBe('42501')
    const sel = await a.client.from(t).select('id').eq('id', rows[t].id)
    expect(sel.data, t).toHaveLength(1)
  }
})

test('check constraints reject out-of-range servings and weight', async () => {
  const log = await a.client.from('food_log').upsert(toRemote('food_log', { ...rows.food_log, id: crypto.randomUUID(), servings: 0 }))
  expect(log.error?.code).toBe('23514')
  const w = await a.client.from('weights').upsert(toRemote('weights', { ...rows.weights, id: crypto.randomUUID(), date: '2026-09-19', weightLb: 5 }))
  expect(w.error?.code).toBe('23514')
})
