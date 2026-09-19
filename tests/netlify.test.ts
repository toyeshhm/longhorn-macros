import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FEED_URL } from '../src/menu/feed'

// ponytail: string checks on a 20-line file; no Netlify runtime or TOML parser is installed.
// Swap for `netlify serve` + fetch if the Netlify CLI ever becomes a dev dependency.
const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')

describe('netlify.toml (spec: Deploy)', () => {
  it('builds with npm run build and publishes dist', () => {
    expect(toml).toMatch(/\[build\]\s+command = "npm run build"\s+publish = "dist"/)
  })

  it('has an SPA fallback that rewrites (200), not redirects, every path to index.html', () => {
    expect(toml).toMatch(/\[\[redirects\]\]\s+from = "\/\*"\s+to = "\/index\.html"\s+status = 200/)
  })

  it('serves sw.js with Cache-Control: no-cache', () => {
    expect(toml).toMatch(/for = "\/sw\.js"\s+\[headers\.values\]\s+Cache-Control = "no-cache"/)
  })

  it('CSP connect-src allows the UT feed and Supabase', () => {
    const csp = /Content-Security-Policy = "([^"]+)"/.exec(toml)?.[1] ?? ''
    const connect = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src ')) ?? ''
    expect(connect.split(' ')).toEqual(
      expect.arrayContaining([new URL(FEED_URL).origin, 'https://*.supabase.co']),
    )
  })
})
