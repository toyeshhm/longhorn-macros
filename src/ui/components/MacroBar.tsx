import { useT } from '../i18n'
import { Swatch, type Ink } from '../icons/Marks'
import { InkBar } from './InkBar'

// Progress bar for one macro vs its target, printed in that macro's ink. With no (or zero) target it shows the eaten amount only.
export function MacroBar({ ink, label, eaten, target, unit }: { ink: Ink; label: string; eaten: number; target: number | null; unit: string }) {
  const t = useT()
  const over = target !== null && eaten > target
  const amount = `${t.d(eaten)} ${unit}`
  const text = target === null ? amount : `${amount} / ${t.d(target)} ${unit}`
  return (
    <div class={`macro${over ? ' over' : ''}`}>
      <span class="macro-name"><Swatch ink={ink} />{label}</span>
      {target !== null && target > 0 ? <InkBar ink={ink} eaten={eaten} target={target} label={label} valueText={text} /> : <span />}
      <span class="macro-num"><strong>{amount}</strong>{target !== null && ` / ${t.d(target)} ${unit}`}{over && <span class="over-tag"> {t.t('today.overWord')}</span>}</span>
    </div>
  )
}
