import type { Press } from '../../theme'

// Small hand-inked marks for buttons and legends. Each has a blue key stroke and, where it earns it,
// an orange stroke printed a hair off register. All decorative: the button carries the accessible name.
const LINE = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const

export function ArrowMark({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg class="mark" viewBox="0 0 26 26" aria-hidden="true">
      {dir === 'prev' ? (
        <>
          <path class="line" {...LINE} stroke-width="2.6" d="M16.2 4.6C13.1 8 10.4 10.7 7.6 12.9 10.3 15.1 13.3 18.2 16.8 21.6" />
          <path class="plate-line" {...LINE} stroke-width="1.6" d="M17.8 5.8C15 9 12.2 11.3 9.6 13.6 12.4 15.8 14.8 18.4 18.3 21" />
        </>
      ) : (
        <>
          <path class="line" {...LINE} stroke-width="2.6" d="M9.4 4.3C12.6 7.8 15.6 10.4 18.5 12.6 15.8 15.2 12.8 18.4 9.1 21.8" />
          <path class="plate-line" {...LINE} stroke-width="1.6" d="M11 5.4C13.8 8.8 16.9 11 19.7 13.4 17 15.9 14 18.6 10.8 21.2" />
        </>
      )}
    </svg>
  )
}

export function CloseMark() {
  return (
    <svg class="mark" viewBox="0 0 26 26" aria-hidden="true">
      <path class="plate-line" {...LINE} stroke-width="1.6" d="M7.6 6.4C11.4 10.6 15 14.2 20.2 19.6M19.4 6C15.6 10.4 12 14 6.8 19.8" />
      <path class="line" {...LINE} stroke-width="2.4" d="M6.2 5.2C10.4 9.6 14.2 13.6 19.4 19.2M18.8 5.6C14.6 9.8 10.8 13.8 5.6 19.4" />
    </svg>
  )
}

export function PlusMark() {
  return (
    <svg class="mark" viewBox="0 0 26 26" aria-hidden="true">
      <path class="line" {...LINE} stroke-width="2.4" d="M4.8 13.4C10 12.6 15.6 13.2 21.2 12.8M13.2 4.6C12.8 10.2 13.4 15.6 12.8 21.4" />
    </svg>
  )
}

export function MinusMark() {
  return (
    <svg class="mark" viewBox="0 0 26 26" aria-hidden="true">
      <path class="line" {...LINE} stroke-width="2.4" d="M4.6 13.6C10.2 12.8 15.4 13.4 21.4 12.6" />
    </svg>
  )
}

// The tick the selected press stamp carries. The stamp already changes plate when it is picked; a shape says the
// same thing again for a reader who cannot separate two inks, which is what "never by colour alone" asks for.
export function TickMark() {
  return (
    <svg class="mark tick-mark" viewBox="0 0 26 26" aria-hidden="true">
      <path class="line" {...LINE} stroke-width="2.8" d="M5.4 13.8C7.6 15.6 9.2 17.4 10.8 20 14.2 13.6 17.8 8.6 22.4 4.4" />
    </svg>
  )
}

// A press, printed: its own stock with its two drums laid down off register, in its own blend. The inks are
// written as attributes rather than as tokens because the swatch has to print a press that is not the one the
// page is currently running — a var() here would print six copies of the active press.
export function PressSwatch({ press }: { press: Press }) {
  const blend = press.scheme === 'dark' ? 'screen' : 'multiply'
  return (
    <svg class="press-swatch" viewBox="0 0 34 24" aria-hidden="true">
      <path d="M2.4 2.8C11 1.8 22 2.4 31.4 2 32 8.4 31.4 15.4 31.8 21.6 21.8 22.4 11.4 21.6 2.2 22.2 1.6 15.6 2.2 8.6 2.4 2.8Z"
        fill={press.paper} stroke={press.ink} stroke-width="1.3" stroke-linejoin="round" />
      <path d="M6.2 7.4C10.4 6.4 14.6 7 18.4 6.6 18.8 10.2 18.4 13.8 18.6 17.2 14.2 17.8 10 17.2 6 17.6 5.6 14 6.2 10.4 6.2 7.4Z"
        fill={press.blue} style={{ mixBlendMode: blend }} />
      <path d="M14.6 9.6C18.6 8.6 23 9.2 27.2 8.8 27.6 12.2 27.2 15.6 27.4 18.8 23.2 19.4 18.8 18.8 14.4 19.2 14 15.8 14.6 12.4 14.6 9.6Z"
        fill={press.orange} style={{ mixBlendMode: blend }} />
    </svg>
  )
}

// Calories is one of the four inks, so it carries a swatch like the other three: the Macro Ink Rule names the
// nutrient table among the places calories prints orange, and the one enlarged row was the one with no ink.
export type Ink = 'calories' | 'protein' | 'carbs' | 'fat'

// A thumb-smudge of ink next to a nutrient's name. Color is never the only cue: the name always sits beside it.
export function Swatch({ ink }: { ink: Ink }) {
  return (
    <svg class={`swatch ink-${ink}`} viewBox="0 0 16 12" aria-hidden="true">
      <path class="ink-fill" d="M2.2 2.6C6 1.4 10.8 2 14 1.8 14.6 4.8 14.2 8 14.4 10.2 10.4 10.8 5.8 10.4 1.8 10.6 1.4 7.8 2 5 2.2 2.6Z" />
    </svg>
  )
}
