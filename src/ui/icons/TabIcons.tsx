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

// Health: a hand-inked heart with a pulse run across it. The plate is a second, smaller heart, off register.
function Health() {
  return (
    <>
      <path class="plate" d="M15.6 22.6C12.6 20.1 9.1 17.5 8.1 14.6 7.3 12.1 8.9 9.7 11.2 9.8 12.9 9.9 14.4 10.9 15.3 12.4 16.2 10.9 17.6 9.8 19.3 9.9 21.7 10 23.3 12.4 22.4 15 21.4 18 17.9 20.3 15.6 22.6Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M15.2 25.4C11.2 21.9 6.4 18.4 5.1 14.2 3.9 10.6 6.3 7.1 9.5 7.2 11.9 7.3 13.9 8.7 15.1 10.7 16.4 8.6 18.5 7.1 20.9 7.2 24.2 7.3 26.5 10.7 25.2 14.4 23.8 18.6 19.2 21.9 15.2 25.4Z" />
      <path class="line" {...LINE} stroke-width="1.5" d="M7.4 15.4c2.3.3 3.6-.1 4.4-1.5 1 2.7 1.6 4.4 2.6 6.6 1.2-4.5 2-7.8 3.3-11.6.9 2.9 1.5 4.7 2.3 6.7 1.3-.2 2.5-.3 3.8-.2" />
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
