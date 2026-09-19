import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FEED_URL } from '../src/menu/feed'

interface Header { key: string; value: string }
interface VercelConfig {
  buildCommand: string
  outputDirectory: string
  rewrites: { source: string; destination: string }[]
  headers: { source: string; headers: Header[] }[]
}

function isVercelConfig(v: unknown): v is VercelConfig {
  return typeof v === 'object' && v !== null && 'rewrites' in v && 'headers' in v
}

const raw: unknown = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
if (!isVercelConfig(raw)) throw new Error('vercel.json missing rewrites/headers')
const config = raw
const headerFor = (source: string, key: string): string =>
  config.headers.find((h) => h.source === source)?.headers.find((h) => h.key === key)?.value ?? ''

describe('vercel.json (spec: Deploy)', () => {
  it('builds with npm run build and publishes dist', () => {
    expect(config.buildCommand).toBe('npm run build')
    expect(config.outputDirectory).toBe('dist')
  })

  it('rewrites every path to index.html for the SPA', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('serves sw.js with Cache-Control: no-cache', () => {
    expect(headerFor('/sw.js', 'Cache-Control')).toBe('no-cache')
  })

  it('CSP connect-src allows the UT feed and Supabase', () => {
    const connect = headerFor('/(.*)', 'Content-Security-Policy')
      .split(';').map((d) => d.trim()).find((d) => d.startsWith('connect-src ')) ?? ''
    expect(connect.split(' ')).toEqual(
      expect.arrayContaining([new URL(FEED_URL).origin, 'https://*.supabase.co']),
    )
  })
})
