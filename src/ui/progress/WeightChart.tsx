import type { WeightPoint } from '../../adaptive'
import { chartGeometry } from '../../chart'
import { round1 } from '../../nutrition'
import { ScaleDoodle } from '../icons/Doodles'

const W = 340
const H = 200
const PAD = 40
// Hand-picked wobble, cycled per point: blob size and the trend's perpendicular nudge, so nothing looks machine-stamped.
const DOT_R = [3.4, 3.9, 3.2, 3.7, 3.5] as const
const NUDGE = [0.9, -0.7, 1.2, -1, 0.5, -1.3, 0.8] as const
const f = (n: number): string => String(Math.round(n * 10) / 10)
const pick = (xs: readonly number[], i: number): number => xs[i % xs.length] ?? 0
const parse = (pts: string): [number, number][] =>
  pts === '' ? [] : pts.split(' ').map((p) => { const [x, y] = p.split(','); return [Number(x), Number(y)] })

// A thumb-pressed ink blob: four lumpy quadratic curves around the point, turned a little per index.
function blob(cx: number, cy: number, i: number): string {
  const r = pick(DOT_R, i)
  const a = i * 1.7
  const pt = (k: number, s: number): string => `${f(cx + Math.cos(a + k) * r * s)} ${f(cy + Math.sin(a + k) * r * s)}`
  return `M${pt(0, 1)}Q${pt(0.8, 1.35)} ${pt(1.6, 0.95)}Q${pt(2.4, 1.25)} ${pt(3.2, 1.05)}Q${pt(4, 1.3)} ${pt(4.8, 0.9)}Q${pt(5.6, 1.4)} ${pt(0, 1)}Z`
}

// The trend drawn freehand: each segment is a cubic whose control points sit a hand-picked nudge off the chord.
function wobblyLine(pts: readonly [number, number][]): string {
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

// Hand-rolled SVG printed like a riso page: blue weigh-in dots, the EWMA trend overprinted in orange a hair
// off register, axes and gridlines drawn with a wobble. Screen readers get <title> + a hidden table.
export function WeightChart({ raw, trend }: { raw: readonly WeightPoint[]; trend: readonly WeightPoint[] }) {
  if (raw.length === 0) return <div class="empty"><ScaleDoodle /><p>No weigh-ins in this range yet.</p></div>
  const geo = chartGeometry(raw, trend, W, H, PAD)
  const sorted = [...raw].sort((a, b) => a.date.localeCompare(b.date))
  const trendByDate = new Map(trend.map((p) => [p.date, p.weightLb]))
  const latest = trend[trend.length - 1]
  return (
    <figure class="weight-chart">
      <svg viewBox={`0 0 ${String(W)} ${String(H)}`} role="img" aria-labelledby="weight-chart-title">
        <title id="weight-chart-title">
          {`Weight chart: ${String(raw.length)} weigh-ins${latest ? `, trend ${String(round1(latest.weightLb))} lb` : ''}`}
        </title>
        {geo.yTicks.map((t) => (
          <g key={t.label} class="tick">
            <path d={`M${String(PAD)} ${f(t.y + 0.4)}C${String(PAD + 90)} ${f(t.y - 0.9)} ${String(W - PAD - 100)} ${f(t.y + 1)} ${String(W - PAD)} ${f(t.y - 0.3)}`} />
            <text x={PAD - 8} y={t.y} text-anchor="end" dominant-baseline="middle">{t.label}</text>
          </g>
        ))}
        <path class="axis" d={`M${String(PAD - 3)} ${String(PAD - 8)}C${String(PAD - 1)} 70 ${String(PAD - 4)} 120 ${String(PAD - 2)} ${String(H - PAD + 3)}C120 ${String(H - PAD + 1)} 220 ${String(H - PAD + 4)} ${String(W - PAD + 6)} ${String(H - PAD + 2)}`} />
        {geo.xLabels.map((l) => (
          <text key={l.label} class="x-label" x={l.x} y={H - PAD + 16} text-anchor="middle">{l.label}</text>
        ))}
        {parse(geo.points).map(([cx, cy], i) => <path key={`${String(cx)},${String(cy)}`} class="dot" d={blob(cx, cy, i)} />)}
        <path class="trend" transform="translate(1.5 -1)" d={wobblyLine(parse(geo.trend))} />
      </svg>
      <p class="chart-key" aria-hidden="true">
        <span><svg viewBox="0 0 14 14"><path class="dot" d={blob(7, 7, 2)} /></svg>weigh-in</span>
        <span><svg class="key-line" viewBox="0 0 26 14"><path class="trend" d="M2.4 8.6C8 6.4 15 8.8 23.6 5.8" /></svg>trend (smoothed)</span>
      </p>
      <table class="visually-hidden">
        <caption>Weigh-ins</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Weight (lb)</th><th scope="col">Trend (lb)</th></tr></thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.date}>
              <th scope="row">{p.date}</th>
              <td>{round1(p.weightLb)}</td>
              <td>{round1(trendByDate.get(p.date) ?? p.weightLb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
