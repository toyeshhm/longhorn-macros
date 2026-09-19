import { round1 } from '../../nutrition'

// One quantity vs its target, read as what's left ("127 g left of 172 g"). With no (or zero) target it shows the eaten amount only.
export function MacroBar({ label, eaten, target, unit }: { label: string; eaten: number; target: number | null; unit: string }) {
  const over = target !== null && eaten > target
  const text = target === null ? `${String(round1(eaten))} ${unit}`
    : over ? `${String(round1(eaten - target))} ${unit} over ${String(round1(target))} ${unit}`
      : `${String(round1(target - eaten))} ${unit} left of ${String(round1(target))} ${unit}`
  return (
    <div class={`macro${over ? ' over' : ''}`}>
      <div class="macro-head"><span>{label}</span><span>{text}</span></div>
      {target !== null && target > 0 && (
        <div class="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={target}
          aria-valuenow={Math.min(eaten, target)} aria-valuetext={`${String(round1(eaten))} ${unit} eaten of ${String(round1(target))} ${unit}`}>
          <div class="bar-fill" style={{ width: `${String(Math.min(100, (eaten / target) * 100))}%` }} />
        </div>
      )}
    </div>
  )
}
