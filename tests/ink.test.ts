import { expect, test } from 'vitest'
import { markVars } from '../src/ink'
import { PRESS_IDS, PRESSES } from '../src/theme'

/** The SVG inside a `url("data:image/svg+xml,…")` token, decoded. */
function decode(token: string | undefined): string {
  expect(token).toMatch(/^url\("data:image\/svg\+xml,.*"\)$/)
  return decodeURIComponent((token ?? '').slice('url("data:image/svg+xml,'.length, -2))
}

test('every press draws the whole set of marks from the one copy of the path data', () => {
  const names = Object.keys(markVars(PRESSES.day))
  expect(names).toContain('--mark-grain')
  for (const id of PRESS_IDS) {
    const press = PRESSES[id]
    const own = new Set(Object.values(press).filter((v) => typeof v === 'string' && v.startsWith('#')))
    const marks = markVars(press)
    expect(Object.keys(marks), id).toEqual(names)
    for (const name of names) {
      const svg = decode(marks[name])
      expect(svg, `${id} ${name}`).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /)
      expect(svg, `${id} ${name}`).toContain('</svg>')
      // Every ink in the mark is this press's own. A hex from another press is the drift the nine duplicate
      // `*-night.svg` files used to make one hand-edit at a time.
      for (const hex of svg.match(/#[0-9A-Fa-f]{6}/g) ?? []) {
        expect(own, `${id} ${name} prints a foreign ink ${hex}`).toContain(hex)
      }
    }
  }
})

test('a mark is inked by its own press, and the second drum blends the way the stock does', () => {
  const day = markVars(PRESSES.day)
  const night = markVars(PRESSES.night)
  expect(decode(day['--mark-rule'])).toContain(`stroke="${PRESSES.day.blue}"`)
  expect(decode(night['--mark-rule'])).toContain(`stroke="${PRESSES.night.blue}"`)
  expect(decode(day['--mark-chevron'])).toContain('mix-blend-mode:multiply')
  expect(decode(night['--mark-chevron'])).toContain('mix-blend-mode:screen')
  // The checkbox's tick and box print in the press's own ink over the press's own raised stock.
  expect(decode(day['--mark-box'])).toContain(`fill="${PRESSES.day.paperRaised}"`)
  // An alpha plate is lifted on dark stock, exactly as --plate-k lifts the ones the stylesheet paints.
  expect(decode(day['--mark-calendar'])).toContain('fill-opacity="0.55"')
  expect(decode(night['--mark-calendar'])).toContain('fill-opacity="0.94"')
})

test('newsprint runs coarser rules and a coarser, bigger grain tile than a smooth stock', () => {
  const smooth = decode(markVars(PRESSES.day)['--mark-rule'])
  const coarse = decode(markVars(PRESSES.newsprint)['--mark-rule'])
  expect(smooth).toContain('stroke-width="1.3"')
  expect(coarse).toContain(`stroke-width="${String(Math.round(1.3 * PRESSES.newsprint.ruleWeight * 100) / 100)}"`)
  const grain = decode(markVars(PRESSES.newsprint)['--mark-grain'])
  expect(grain).toContain(`width="${String(PRESSES.newsprint.grainTile)}"`)
  expect(grain).toContain(`baseFrequency="${String(PRESSES.newsprint.grainFreq)}"`)
  // The specks are the press's own, as feColorMatrix wants them: 0 to 1 rather than a hex.
  expect(grain).toContain('feColorMatrix values="0 0 0 0 0.35')
})

test('blueprint stock is ruled, not speckled: its grain tile is a drafting grid', () => {
  const grid = decode(markVars(PRESSES.blueprint)['--mark-grain'])
  expect(grid).not.toContain('feTurbulence')
  expect(grid).toContain(`stroke="${PRESSES.blueprint.speck}"`)
  expect(grid).toContain(`width="${String(PRESSES.blueprint.grainTile)}"`)
  for (const id of PRESS_IDS.filter((p) => p !== 'blueprint')) {
    expect(decode(markVars(PRESSES[id])['--mark-grain']), id).toContain('feTurbulence')
  }
})
