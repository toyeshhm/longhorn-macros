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
