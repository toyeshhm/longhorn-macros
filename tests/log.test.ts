import { expect, test, vi } from 'vitest'
import { log } from '../src/log'
test('emits one JSON line per event with level, event, fields', () => {
  const lines: string[] = []
  const spy = vi.spyOn(console, 'info').mockImplementation((line: string) => { lines.push(line) })
  log.info('sync.push', { rows: 3 })
  spy.mockRestore()
  const parsed: unknown = JSON.parse(lines[0] ?? '')
  expect(parsed).toMatchObject({ level: 'info', event: 'sync.push', rows: 3 })
})
test('warn and error route to matching console methods', () => {
  const seen: string[] = []
  const w = vi.spyOn(console, 'warn').mockImplementation(() => { seen.push('warn') })
  const e = vi.spyOn(console, 'error').mockImplementation(() => { seen.push('error') })
  log.warn('a'); log.error('b', { msg: 'x' })
  w.mockRestore(); e.mockRestore()
  expect(seen).toEqual(['warn', 'error'])
})
