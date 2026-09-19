import type { JSX } from 'preact'
import type { Tab } from '../components/TabBar'

// Hand-inked tab icons: blue linework plus an orange plate that prints only on the active tab.
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

function Today() {
  return (
    <>
      <path class="plate" d="M7.4 14.2C12 13.4 18 13.8 23 13.6 23.4 17.6 22.8 21.2 23.2 24.2 18 24.8 12 24.2 7.2 24.6 7 21 7.8 17.4 7.4 14.2Z" />
      <path class="line" {...LINE} stroke-width="1.8" d="M4.4 7.4C11 6.6 19.4 7 26 6.8 26.4 13 25.8 20.4 26.4 26.4 19 27 11 26.2 4.2 26.8 4.6 20 3.8 13.8 4.6 6.2" />
      <path class="line" {...LINE} stroke-width="1.5" d="M4.6 11.8C12 11.2 19.6 11.6 26 11.4M10 3.4l.2 6.2M20.2 3.2l-.2 6.4" />
      <path class="line" {...LINE} stroke-width="1.8" d="M10.4 18.8c1.4 1.2 2.4 2.4 3.4 3.8 2-3.4 4.2-6 7.2-8.4" />
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

function Goals() {
  return (
    <>
      <path class="plate" d="M9.6 5.6C14 4.6 17 7.4 21 6.2 23 5.8 24.4 6.2 25.4 6.6 24 9 24.8 12 26 14.6 22 15.6 18.6 13.8 14.8 14.8 12.6 15.2 11 15.4 9.8 15 9.8 12 9.4 8.6 9.6 5.6Z" />
      <path class="line" {...LINE} stroke-width="2" d="M7.6 27.2C8 19 7.4 11 8 3" />
      <path class="line" {...LINE} stroke-width="1.6" d="M8.2 4.2C12.6 2.8 16 5.8 20 4.6 22.2 4 24 4.2 25.4 4.8 23.8 7.6 24.4 10.8 25.8 13.4 21.6 14.6 18 12.6 14 13.6 11.6 14.2 9.8 14.4 8.2 13.8" />
      <path class="line" {...LINE} stroke-width="1.6" d="M4 27.4c3.2-.6 6.8-.4 9.4.2" />
    </>
  )
}

const ICONS: Readonly<Record<Tab, () => JSX.Element>> = { Menu, Today, Progress, Goals }

export function TabIcon({ tab }: { tab: Tab }) {
  const Icon = ICONS[tab]
  return <svg class="tab-icon" viewBox="0 0 30 30" aria-hidden="true"><Icon /></svg>
}
