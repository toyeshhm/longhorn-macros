import type { Ink } from '../icons/Marks'

// Hand-drawn progress bar. The outline is inked once by hand; the fill's right edge carries a fixed,
// hand-picked wobble that travels with the fill amount, and the part still left is hatched in blue.
// Over target: the whole bar prints in the macro's ink and the cross-hatch is knocked out of that plate rather
// than overprinted on it — it is drawn last and stroked in the stock, so its gaps are unprinted paper. Stroked
// in an ink it vanished on the presses where the fill and the darkest ink sit at the same value (text says
// "over" too, which is what actually carries the state).
const W = 320
const END = 313 // inner right edge of the outline
const f = (n: number): string => String(Math.round(n * 10) / 10)

function fillPath(x: number): string {
  return `M4.6 5.4C${f(x * 0.26)} 4.2 ${f(x * 0.65)} 5.6 ${f(x)} 4.4 ${f(x + 2.8)} 6.2 ${f(x)} 8.4 ${f(x + 3.2)} 10.4 `
    + `${f(x + 0.6)} 12.4 ${f(x + 3.6)} 14.6 ${f(x + 0.8)} 16.8 ${f(x + 2)} 18 ${f(x - 0.8)} 18.6 ${f(x * 0.65)} 18.2 `
    + `${f(x * 0.3)} 17.8 5 18.8 4 14.6 4.8 10.4 3.8 7.6 4.6 5.4Z`
}

function hatch(from: number, to: number, step: number): string {
  let d = ''
  for (let x = from; x + 5 < to; x += step) d += `M${f(x)} 17.6l${x % 2 > 1 ? '5.6' : '6'}-13.4`
  return d
}

export function InkBar({ ink, eaten, target, label, valueText }: {
  ink: Ink | 'calories'; eaten: number; target: number; label: string; valueText: string
}) {
  const over = eaten > target
  const pct = Math.min(1, eaten / target)
  const x = 6 + pct * (END - 8)
  return (
    <svg class={`ink-bar ink-${ink}`} viewBox={`0 0 ${String(W)} 22`} preserveAspectRatio="none"
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={target}
      aria-valuenow={Math.min(eaten, target)} aria-valuetext={valueText}>
      {eaten > 0 && <path class={`bar-fill${over ? ' over' : ''}`} transform="translate(1.6 -1.2)" d={fillPath(x)} />}
      <path class="bar-outline" d="M3.2 3.6C80 2.6 200 4.2 317 3 318.2 8.6 317.6 13.8 317.4 19 210 19.8 90 18.6 3.8 19.6 2.4 14.6 3.2 9 2.6 5.2" />
      {over
        ? <path class="bar-hatch" d={hatch(8, END, 7)} />
        : <path class="bar-hatch" d={hatch(Math.max(8, x + 10), END, 8.4)} />}
    </svg>
  )
}
