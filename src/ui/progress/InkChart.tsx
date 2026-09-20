import { chartDates, chartGeometry, type ChartSeries, type Mark } from '../../progress'

const W = 340
const H = 220
// Hand-picked wobble, cycled per point: blob size and the line's perpendicular nudge, so nothing looks machine-stamped.
const DOT_R = [3.4, 3.9, 3.2, 3.7, 3.5] as const
const NUDGE = [0.9, -0.7, 1.2, -1, 0.5, -1.3, 0.8] as const
const f = (n: number): string => String(Math.round(n * 10) / 10)
const pick = (xs: readonly number[], i: number): number => xs[i % xs.length] ?? 0

// A thumb-pressed ink blob: four lumpy quadratic curves around the point, turned a little per index.
export function blob(cx: number, cy: number, i: number): string {
  const r = pick(DOT_R, i)
  const a = i * 1.7
  const pt = (k: number, s: number): string => `${f(cx + Math.cos(a + k) * r * s)} ${f(cy + Math.sin(a + k) * r * s)}`
  return `M${pt(0, 1)}Q${pt(0.8, 1.35)} ${pt(1.6, 0.95)}Q${pt(2.4, 1.25)} ${pt(3.2, 1.05)}Q${pt(4, 1.3)} ${pt(4.8, 0.9)}Q${pt(5.6, 1.4)} ${pt(0, 1)}Z`
}

// A line drawn freehand: each segment is a cubic whose control points sit a hand-picked nudge off the chord.
function wobblyLine(pts: readonly (readonly [number, number])[]): string {
  const [head, ...rest] = pts
  if (!head) return ''
  let prev = head
  let d = `M${f(head[0])} ${f(head[1])}`
  rest.forEach((p, i) => {
    const [dx, dy] = [p[0] - prev[0], p[1] - prev[1]]
    const len = Math.hypot(dx, dy) || 1
    const [nx, ny] = [(-dy / len) * pick(NUDGE, i), (dx / len) * pick(NUDGE, i)]
    d += `C${f(prev[0] + dx / 3 + nx)} ${f(prev[1] + dy / 3 + ny)} ${f(prev[0] + (2 * dx) / 3 - nx)} ${f(prev[1] + (2 * dy) / 3 - ny)} ${f(p[0])} ${f(p[1])}`
    prev = p
  })
  return d
}

// The chart's type is sized in user units, so unlike the page it cannot inherit the reader's text size. Read it
// once per render and hand it to the geometry, which drops date labels and gridlines until what is left fits.
function chartFont(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.95
}

function KeyMark({ mark }: { mark: Mark }) {
  if (mark === 'dots') return <svg viewBox="0 0 14 14" aria-hidden="true"><path class="dots" d={blob(7, 7, 2)} /></svg>
  return <svg class="key-line" viewBox="0 0 26 14" aria-hidden="true"><path class={mark} d="M2.4 8.6C8 6.4 15 8.8 23.6 5.8" /></svg>
}

/**
 * One hand-rolled chart printed like a riso page: blue weigh-in blobs, an orange smoothed line overprinted a hair
 * off register, a dashed blue line for anything predicted, wobbly gridlines and a hand-drawn L axis.
 *
 * An SVG is not readable by a screen reader, so every chart carries the same data as a visually-hidden table:
 * one row per date, one column per series. The key under the chart names every mark in words, because a reader
 * who cannot tell the inks apart still has to be able to tell the lines apart.
 */
export function InkChart({ title, series, yPad, format }: {
  title: string
  series: readonly ChartSeries[]
  yPad: number
  format: (value: number) => string
}) {
  const font = chartFont()
  const geo = chartGeometry({ series, width: W, height: H, font, yPad, format })
  const { x0, y0, x1, y1 } = geo.frame
  const at = new Map(series.map((s) => [s.id, new Map(s.points.map((p) => [p.date, p.value]))]))
  return (
    <figure class="ink-chart">
      <svg viewBox={`0 0 ${String(W)} ${String(H)}`} font-size={f(font)} role="img" aria-labelledby="ink-chart-title">
        <title id="ink-chart-title">{title}</title>
        {geo.yTicks.map((t) => (
          <g key={t.label} class="tick">
            <path d={`M${f(x0)} ${f(t.y + 0.4)}C${f(x0 + (x1 - x0) * 0.3)} ${f(t.y - 0.9)} ${f(x0 + (x1 - x0) * 0.7)} ${f(t.y + 1)} ${f(x1)} ${f(t.y - 0.3)}`} />
            <text x={f(x0 - 6)} y={f(t.y)} text-anchor="end" dominant-baseline="middle">{t.label}</text>
          </g>
        ))}
        <path class="axis" d={`M${f(x0 - 3)} ${f(y0)}C${f(x0 - 1)} ${f(y0 + (y1 - y0) * 0.35)} ${f(x0 - 4)} ${f(y0 + (y1 - y0) * 0.72)} ${f(x0 - 2)} ${f(y1 + 3)}C${f(x0 + (x1 - x0) * 0.3)} ${f(y1 + 1)} ${f(x0 + (x1 - x0) * 0.7)} ${f(y1 + 4)} ${f(x1 + 4)} ${f(y1 + 2)}`} />
        {geo.xLabels.map((l) => <text key={l.label} class="x-label" x={l.x} y={l.y} text-anchor={l.anchor}>{l.label}</text>)}
        {geo.plots.map((p) => (p.mark === 'dots'
          ? <g key={p.id}>{p.xy.map(([cx, cy], i) => <path key={`${f(cx)},${f(cy)}`} class="dots" d={blob(cx, cy, i)} />)}</g>
          : <path key={p.id} class={p.mark} transform={p.mark === 'trend' ? 'translate(1.5 -1)' : undefined} d={wobblyLine(p.xy)} />))}
      </svg>
      <p class="chart-key" aria-hidden="true">
        {geo.plots.map((p) => <span key={p.id}><KeyMark mark={p.mark} />{p.label}</span>)}
      </p>
      <table class="visually-hidden">
        <caption>{title}</caption>
        <thead><tr><th scope="col">Date</th>{series.map((s) => <th key={s.id} scope="col">{s.label}</th>)}</tr></thead>
        <tbody>
          {chartDates(series).map((date) => (
            <tr key={date}>
              <th scope="row">{date}</th>
              {series.map((s) => {
                const value = at.get(s.id)?.get(date)
                return <td key={s.id}>{value === undefined ? 'no reading' : format(value)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
