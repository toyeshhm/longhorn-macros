import { Fragment, type ComponentChildren } from 'preact'
import type { Key } from '../../i18n'
import { useT } from '../i18n'

/**
 * A translated line whose `{holes}` are filled with nodes rather than text, for the two places that set a figure
 * in its own element inside a sentence. Word order moves with the language — English says "1,200 eaten of 2,000"
 * and Spanish "1.200 consumidas de 2.000" — so the sentence cannot be split into a fixed prefix and suffix.
 */
export function Rich({ line, slots }: { line: Key; slots: Readonly<Record<string, ComponentChildren>> }) {
  const t = useT()
  return <>{t.rich(line).map((p, i) => <Fragment key={i}>{typeof p === 'string' ? p : slots[p.slot]}</Fragment>)}</>
}
