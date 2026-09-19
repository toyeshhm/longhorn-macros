import type { WeightPoint } from '../../adaptive'
import { chartGeometry } from '../../chart'
import { round1 } from '../../nutrition'
import { ScaleDoodle } from '../icons/Doodles'

const W = 340
const H = 200
const PAD = 40
// Hand-inked dot sizes, cycled so the weigh-ins don't look stamped by a machine.
const DOT_R = [3.4, 3.9, 3.2, 3.7, 3.5] as const
const f = (n: number): string => String(Math.round(n * 10) / 10)

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
        {geo.points.split(' ').map((pt, i) => {
          const [cx, cy] = pt.split(',')
          return <circle key={pt} class="dot" cx={cx} cy={cy} r={DOT_R[i % DOT_R.length]} />
        })}
        <polyline class="trend" transform="translate(1.5 -1)" points={geo.trend} />
      </svg>
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
