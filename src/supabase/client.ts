import { createClient } from '@supabase/supabase-js'

const url: unknown = import.meta.env.VITE_SUPABASE_URL
const key: unknown = import.meta.env.VITE_SUPABASE_ANON_KEY
if (typeof url !== 'string' || url === '' || typeof key !== 'string' || key === '') {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lm-auth' },
})
