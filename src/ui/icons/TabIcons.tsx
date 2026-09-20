import type { JSX } from 'preact'
import type { Tab } from '../components/TabBar'

// Hand-inked tab icons: ink linework plus an orange plate that prints only on the active tab.
// Path data is drawn by hand (no icon set); the wobble is the point, don't "clean it up".
const LINE = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const

function Menu() {
  return (
    <>
      <path class="plate" d="M5.8 17.2C9 16.8 12 17 14.6 17.4 14.4 19.4 14.8 21.4 14.4 23.2 11.4 23.4 8.4 23 5.6 23.4 5.8 21.2 5.4 19.2 5.8 17.2Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M3.4 9.2C10 8.4 19 8.6 26.8 9 27.2 14 26.6 19.6 27 24.4 19 25.2 10.4 24.6 3.8 25 3.2 19.4 3.8 14 3 8.6" />
      <path class="line" {...LINE} stroke-width="1.3" d="M3.6 15.6C11 15 19 15.4 26.6 15.8M15.2 9.2c.2 5.2-.2 10.4.4 15.4M9.2 9.4l-.2 6" />
    </>
  )
}

function Tracker() {
  return (
    <>
      <path class="plate" d="M7.4 14.2C12 13.4 18 13.8 23 13.6 23.4 17.6 22.8 21.2 23.2 24.2 18 24.8 12 24.2 7.2 24.6 7 21 7.8 17.4 7.4 14.2Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M4.4 7.4C11 6.6 19.4 7 26 6.8 26.4 13 25.8 20.4 26.4 26.4 19 27 11 26.2 4.2 26.8 4.6 20 3.8 13.8 4.6 6.2" />
      <path class="line" {...LINE} stroke-width="1.5" d="M4.6 11.8C12 11.2 19.6 11.6 26 11.4M10 3.4l.2 6.2M20.2 3.2l-.2 6.4" />
      <path class="line" {...LINE} stroke-width="1.8" d="M10.4 18.8c1.4 1.2 2.4 2.4 3.4 3.8 2-3.4 4.2-6 7.2-8.4" />
    </>
  )
}

// Health: a vitals card, drawn as an object inside the same hand-ruled frame the other four tabs carry (the menu
// card, the calendar, the gauge plate, the ID card) — a pulse run under a header rule, the plate on the header
// band. What was here before was the stock heart-plus-ECG glyph: no frame, so the bar read as four drawn objects
// and one pictogram, and it was the only mark whose halves reflected onto each other to within 0.2 user units.
function Health() {
  return (
    <>
      <path class="plate" d="M5.6 6.8C9.4 6.4 13.6 6.8 16.8 6.6 16.6 8.4 17.2 9.6 16.6 10.9 13 11.1 9 10.6 5.4 11 5.7 9.2 5.2 8.1 5.6 6.8Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M3.4 6.8C10.2 5.6 19.8 6.2 26.8 5.4 27.4 12.4 26.6 19.8 27.2 26.4 19.6 27.2 10.4 26.4 3.8 26.8 3.2 20 4 12.8 3 6.2" />
      <path class="line" {...LINE} stroke-width="1.3" d="M3.6 11.4C11.4 10.6 19.6 11.2 26.8 11.6M9.6 5.8l-.4 5.3" />
      <path class="line" {...LINE} stroke-width="1.6" d="M5.4 18.4c2.5.4 3.7-.3 4.5-2 1.1 3.4 1.8 5.5 3.1 8.1 1.4-5.5 2.4-9.3 3.9-13.4 1 3.6 1.8 5.8 2.7 8.1 1.7-.3 3.1-.5 4.7-.1" />
    </>
  )
}

function Progress() {
  return (
    <>
      <path class="plate" d="M9.6 12.6C11 9.6 13.2 8.4 15.4 8.4 17.6 8.4 19.8 9.8 20.8 12.4 17 12.8 13.4 12.8 9.6 12.6Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M5 5.6C11.4 4.2 19 4.6 25.2 5.4 26.6 12 26.2 19.6 25 25.2 18.6 26.4 11 26 4.8 25 3.8 18.6 4 11.4 5.4 4.4" />
      <path class="line" {...LINE} stroke-width="1.4" d="M8.8 13.2C9.8 9.4 12.4 7.6 15.2 7.6 18.4 7.8 21 9.8 21.8 13.2M15.4 12.8l2.6-4" />
      <path class="line" {...LINE} stroke-width="1.4" d="M10.6 21.6h2.6M17 21.4l2.8.2" />
    </>
  )
}

function Profile() {
  return (
    <>
      <path class="plate" d="M11.4 9.2C13.4 7.6 16.6 7.8 18 9.8 19.2 11.6 18.6 14.4 16.6 15.4 14.4 16.6 11.8 15.6 11 13.4 10.4 11.8 10.6 10.2 11.4 9.2Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M3.6 6.2C10.4 5.2 19.6 5.6 26.6 5.4 27 12 26.4 19.4 26.8 25.6 19.4 26.4 10.6 25.8 3.8 26.2 3.2 19.6 3.8 12.6 3.2 5.8" />
      <path class="line" {...LINE} stroke-width="1.5" d="M11.6 11.4C11.8 9.4 13.4 8.2 15.2 8.4 17.1 8.5 18.4 10 18.3 11.9 18.2 13.8 16.6 15 14.8 14.9 12.9 14.8 11.5 13.4 11.6 11.4Z" />
      <path class="line" {...LINE} stroke-width="1.6" d="M9.6 21.8C10.4 18.6 12.6 17 15.2 17.1 17.8 17.2 19.8 18.9 20.6 22" />
      <path class="line" {...LINE} stroke-width="1.2" d="M7.4 23.8c4.6-.6 10.4-.4 15.4.2" />
    </>
  )
}

const ICONS: Readonly<Record<Tab, () => JSX.Element>> = { Menu, Tracker, Health, Progress, Profile }

export function TabIcon({ tab }: { tab: Tab }) {
  const Icon = ICONS[tab]
  return <svg class="tab-icon" viewBox="0 0 30 30" aria-hidden="true"><Icon /></svg>
}
