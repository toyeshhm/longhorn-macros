import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// `make db-env` writes .env.test from the running local stack.
const env = new Map(
  readFileSync(new URL('../../.env.test', import.meta.url), 'utf8')
    .split('\n')
    .map((line) => line.split(/=(.*)/s))
    .flatMap(([k, v]) => (k && v !== undefined ? [[k.trim(), v.trim()] as const] : [])),
)

function need(key: string): string {
  const v = env.get(key)
  if (v === undefined || v === '') throw new Error(`.env.test missing ${key}; run make db-env`)
  return v
}

export const SUPABASE_URL = need('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = need('VITE_SUPABASE_ANON_KEY')

export async function newUserClient(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signUp({ email: `t-${crypto.randomUUID()}@example.test`, password: crypto.randomUUID() })
  if (error) throw error
  if (!data.user || !data.session) throw new Error('signUp returned no session; is enable_confirmations off?')
  return { client, userId: data.user.id }
}
