// The hand-inked marks that CSS references as images: rules, the chevron, the checkbox, the search glass, the
// date picker's calendar, and the paper grain.
//
// These used to be files, and the night press needed a second copy of all nine because an image referenced from
// CSS cannot read a custom property — it is a separate document with no access to the page's tokens. Six presses
// that way is fifty-four files of the same path data, drifting apart one hand-edit at a time. Inlining them as
// Preact components does not work either: six of the nine are painted by the browser (a select's chevron, a
// checkbox, `::-webkit-calendar-picker-indicator`, the fixed grain layer) where there is no element to put an
// <svg> in.
//
// So the path data is written once, here, and the press's own inks are substituted into it at runtime. The app
// is a single-page bundle — nothing but the stock is painted before it parses — so a mark that arrives with the
// bundle arrives with the screen it is drawn on.
import type { Press } from './theme'

/** Hand-written path data. No line is straight, nothing closes perfectly, every coordinate carries decimals. */
const RULE = 'M.8 3C70 2.4 140 4 220 3 270 2.6 300 4 318.8 3.2'
const RULE_THICK = 'M.6 3.4C60 2.2 150 4.4 230 2.8 270 2.2 300 3.6 319.2 2.6'
const RULE_PENCIL = 'M1.2 2.2C40 1.6 62 2.6 96 2 132 1.4 170 2.8 204 2.2 246 1.6 284 2.6 318.6 1.8'
const BOX = 'M4.2 4.6C10.6 3.6 17.6 4 23.8 3.8 24.4 10.6 23.8 17.4 24.2 23.8 17.2 24.4 10.4 23.8 4 24.2 3.4 17.8 4 10.8 3.6 4.2'
const BOX_PLATE = 'M6.6 7.4C11.4 6.6 16.6 7 21.6 6.6 22 11.6 21.6 16.6 22 21.2 16.8 21.8 11.6 21.2 6.4 21.6 6 16.6 6.8 12 6.6 7.4Z'
const TICK = 'M7.8 14.4C9.8 16 11.2 17.6 12.6 19.8 15.6 14.2 18.8 9.8 23.4 5.2'

function svg(body: string, attrs: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`)}")`
}

function n(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** A rule is one stroke across the page; newsprint runs them coarser than a smooth stock does. */
function rule(d: string, height: number, stroke: string, width: number, extra = ''): string {
  return svg(
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${n(width)}" stroke-linecap="round" vector-effect="non-scaling-stroke"${extra}/>`,
    `viewBox="0 0 320 ${String(height)}" preserveAspectRatio="none"`,
  )
}

/**
 * The page's stock, speckled. The specks carry alpha, so plain alpha-over reads as ink and no element needs a
 * blend mode (a full-screen mix-blend-mode doubled repaint cost). Blueprint stock is drafting paper, so its tile
 * is a ruled grid rather than turbulence.
 */
function grain(p: Press): string {
  const size = `width="${String(p.grainTile)}" height="${String(p.grainTile)}"`
  if (p.grid) {
    const half = p.grainTile / 2
    return svg(
      `<g fill="none" stroke="${p.speck}" stroke-linecap="round">`
      + `<path stroke-width="1.1" d="M.4 .6C${n(half)} 1 ${n(half)} .2 ${n(p.grainTile)} .8M.6 .4C1 ${n(half)} .2 ${n(half)} .8 ${n(p.grainTile)}"/>`
      + `<path stroke-width=".7" stroke-opacity=".5" d="M.5 ${n(half)}C${n(half)} ${n(half + 0.5)} ${n(half)} ${n(half - 0.4)} ${n(p.grainTile)} ${n(half + 0.3)}M${n(half)} .5C${n(half + 0.4)} ${n(half)} ${n(half - 0.5)} ${n(half)} ${n(half + 0.2)} ${n(p.grainTile)}"/></g>`,
      size,
    )
  }
  const [r, g, b] = [1, 3, 5].map((i) => n(Number.parseInt(p.speck.slice(i, i + 2), 16) / 255))
  return svg(
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="${n(p.grainFreq)}" numOctaves="2" stitchTiles="stitch"/>`
    + `<feColorMatrix values="0 0 0 0 ${String(r)}  0 0 0 0 ${String(g)}  0 0 0 0 ${String(b)}  0 0 0 -1.6 1.05"/></filter>`
    + `<rect ${size} filter="url(#g)"/>`, // encodeURIComponent escapes the # itself; pre-escaping it double-encodes
    size,
  )
}

/** Every `--mark-*` token for one press, drawn from the one copy of the path data above. */
export function markVars(p: Press): Readonly<Record<string, string>> {
  const w = p.ruleWeight
  const blend = p.scheme === 'dark' ? 'screen' : 'multiply'
  // An alpha plate mixes toward the stock, so on dark stock the same ink prints muddy unless it is lifted —
  // exactly what --plate-k does for the plates the stylesheet paints.
  const plate = p.scheme === 'dark' ? 0.94 : 0.55
  const drum = ` style="mix-blend-mode:${blend}"`
  return {
    '--mark-rule': rule(RULE, 6, p.blue, 1.3 * w),
    '--mark-rule-thick': rule(RULE_THICK, 6, p.ink, 2 * w),
    '--mark-rule-pencil': rule(RULE_PENCIL, 4, p.blue, 1 * w, ' stroke-opacity=".55" stroke-dasharray="18 3 34 2 9 3 46 2"'),
    '--mark-chevron': svg(
      `<path d="M4.4 7.2C7 9.6 8.6 11.4 10.2 13.4 12 11 13.8 9.2 15.8 6.8" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="M5.6 6.4C8 8.8 9.8 10.4 11.2 12.4" fill="none" stroke="${p.orange}" stroke-width="1.2" stroke-linecap="round"${drum}/>`,
      'viewBox="0 0 20 20"',
    ),
    '--mark-box': svg(
      `<path d="${BOX}" fill="${p.paperRaised}" stroke="${p.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
      'viewBox="0 0 28 28"',
    ),
    '--mark-box-checked': svg(
      `<path d="${BOX_PLATE}" fill="${p.orange}"${drum}/>`
      + `<path d="${BOX}" fill="none" stroke="${p.ink}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${TICK}" fill="none" stroke="${p.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
      'viewBox="0 0 28 28"',
    ),
    '--mark-search': svg(
      `<path d="M10.4 3.6C14.6 3.4 17.4 6.2 17.2 10.2 17 14 14.2 16.8 10.2 16.6 6.4 16.4 3.4 13.8 3.6 10 3.8 6.4 6.6 3.8 10.8 3.8" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>`
      + `<path d="M15.2 15.4C17 17.2 18.6 18.8 20.8 21" fill="none" stroke="${p.ink}" stroke-width="2.6" stroke-linecap="round"/>`
      + `<path d="M7.4 7.6C8.4 6.6 9.6 6.2 11 6.2" fill="none" stroke="${p.orange}" stroke-width="1.4" stroke-linecap="round"/>`,
      'viewBox="0 0 24 24"',
    ),
    '--mark-calendar': svg(
      `<path d="M7.4 14.2C12 13.4 18 13.8 23 13.6 23.4 17.6 22.8 21.2 23.2 24.2 18 24.8 12 24.2 7.2 24.6 7 21 7.8 17.4 7.4 14.2Z" fill="${p.orange}" fill-opacity="${n(plate)}"/>`
      + `<g fill="none" stroke="${p.ink}" stroke-linecap="round" stroke-linejoin="round">`
      + '<path stroke-width="1.8" d="M4.4 7.4C11 6.6 19.4 7 26 6.8 26.4 13 25.8 20.4 26.4 26.4 19 27 11 26.2 4.2 26.8 4.6 20 3.8 13.8 4.6 6.2"/>'
      + '<path stroke-width="1.5" d="M4.6 11.8C12 11.2 19.6 11.6 26 11.4M10 3.4l.2 6.2M20.2 3.2l-.2 6.4"/></g>',
      'viewBox="0 0 30 30"',
    ),
    '--mark-grain': grain(p),
  }
}
