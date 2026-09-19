import type { WeightPoint } from '../../adaptive'
import { chartGeometry } from '../../chart'
import { round1 } from '../../nutrition'

const W = 340
const H = 200
const PAD = 40

// Hand-rolled SVG: raw weigh-ins as dots, EWMA trend as a line. Screen readers get <title> + a hidden table.
export function WeightChart({ raw, trend }: { raw: readonly WeightPoint[]; trend: readonly WeightPoint[] }) {
  if (raw.length === 0) return <p class="empty">No weigh-ins in this range yet.</p>
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
            <line x1={PAD} x2={W - PAD} y1={t.y} y2={t.y} />
            <text x={PAD - 8} y={t.y} text-anchor="end" dominant-baseline="middle">{t.label}</text>
          </g>
        ))}
        {geo.xLabels.map((l) => (
          <text key={l.label} class="x-label" x={l.x} y={H - PAD + 16} text-anchor="middle">{l.label}</text>
        ))}
        <polyline class="trend" points={geo.trend} />
        {geo.points.split(' ').map((pt) => {
          const [cx, cy] = pt.split(',')
          return <circle key={pt} class="dot" cx={cx} cy={cy} r={3.5} />
        })}
      </svg>
      <figcaption class="chart-key" aria-hidden="true">
        <span><i class="key-dot" />Weigh-in</span>
        <span><i class="key-line" />Trend</span>
      </figcaption>
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
