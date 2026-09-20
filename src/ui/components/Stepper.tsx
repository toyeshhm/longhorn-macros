import { useId } from 'preact/hooks'
import { parseServings, stepServings } from '../../servings'
import { useT } from '../i18n'
import { MinusMark, PlusMark } from '../icons/Marks'

// Controlled by the raw text so an in-progress entry ("1 1/") isn't overwritten; parent reads parseServings(text).
export function Stepper({ text, onText }: { text: string; onText: (text: string) => void }) {
  const t = useT()
  const id = useId()
  const errorId = useId()
  const value = parseServings(text)
  const step = (dir: 1 | -1): void => { onText(String(stepServings(value ?? 1, dir))) }
  return (
    <div class="stepper">
      <label for={id}>{t.t('common.servings')}</label>
      <div class="stepper-row">
        <button type="button" class="icon-btn" aria-label={t.t('stepper.decrease')} onClick={() => { step(-1) }}><MinusMark /></button>
        <input id={id} inputMode="decimal" enterKeyHint="done" autocomplete="off" value={text}
          aria-invalid={value === null} aria-describedby={value === null ? errorId : undefined}
          onInput={(ev) => { onText(ev.currentTarget.value) }} />
        <button type="button" class="icon-btn" aria-label={t.t('stepper.increase')} onClick={() => { step(1) }}><PlusMark /></button>
      </div>
      {/* role=alert announces once when the text first becomes invalid; the message itself never changes, so it can't spam. */}
      {value === null && <p id={errorId} role="alert" class="error">{t.t('stepper.invalid')}</p>}
    </div>
  )
}
