// vitest.config loads .env.test (written by `make db-env`) into import.meta.env.
function need(key: string): string {
  const v: unknown = import.meta.env[key]
  if (typeof v !== 'string' || v === '') throw new Error(`.env.test missing ${key}; run make db-env`)
  return v
}

export const SUPABASE_URL = need('VITE_SUPABASE_URL')
export const ANON_KEY = need('VITE_SUPABASE_ANON_KEY')
