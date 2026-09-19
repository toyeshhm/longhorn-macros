// Hand-drawn doodles for empty states and the login masthead. The bowl "line boils": three separately
// inked frames of the same drawing swap at ~8 fps (CSS steps in styles.css), frozen on frame 1 for reduced motion.
const LINE = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const
const SQUASH = { transform: 'matrix(1 0 0 1.45 0 -26)', 'vector-effect': 'non-scaling-stroke' } as const

const BOWL_FRAMES = [
  {
    steam: 'M44 32C40.6 27.4 46.8 24.2 43.4 19.6 41.6 17.2 44 15.4 45.2 14.2M60.4 30.4C57.2 25.2 63.6 22.6 60 17.4M76.4 32.6C73.2 28 79.2 24.8 76.2 20.4 75 18.6 76.6 16.8 77.8 16',
    rim: 'M8.6 56.8C12 74.2 34 84.6 58.4 83.4 82.6 82.2 104.2 72.4 111.4 54.6 109 53 106 52.4 103.4 53.4',
    inner: 'M16 60.6C22.4 72.4 38.6 78.2 58.2 78.4 78.4 78.2 96 70.6 104.4 57.2',
    rice: 'M7.8 56.4C11 49 15 51.4 18.2 47C21.4 42.8 25.2 48.4 29 43.2C33 38.8 36.4 45.2 41 40.8C45.2 37 49.2 43.4 53.2 38.8C58 35.6 61 42.4 66.2 38C71 34.8 74.2 41.2 79 38.2C84 35 87.4 42.2 92.2 40C97 38 99.4 45.4 104.2 44.2C108.4 44 110.6 50.2 113.4 52.6',
    grains: 'M46 49.5l3.2 1.4M69 47.4l2.4 2.6M90.4 49l2.6.8',
  },
  {
    steam: 'M45 32.4C41 27 47.6 24.6 43.8 19.2 42.4 17 44.6 15.6 46 14.8M61 30C57.6 25.6 64.4 22.2 60.4 17.8M76 32.2C73.8 27.4 80 25.2 76.8 20 75.4 18.4 77.4 16.4 78.4 15.8',
    rim: 'M9.4 57.6C12.6 73.4 35 85.2 58 83.8 83.4 82.8 103.4 71.6 110.8 55.4 108.6 53.6 105.4 53 102.8 54.2',
    inner: 'M15.4 61.2C22.8 71.8 39.2 78.8 57.6 78.8 79 78.6 95.4 70 105 57.8',
    rice: 'M8.4 57C11.6 48.6 15.6 52 18.8 47.6C21.8 43.4 24.6 47.6 28.6 43.8C33.4 39.4 36 44.6 40.6 41.4C45.6 37.6 48.6 42.8 53.8 39.4C57.6 36.2 61.6 41.8 65.6 38.6C71.4 35.4 73.8 40.6 79.6 38.8C83.6 35.6 88 41.6 91.6 40.6C97.6 38.6 99 44.8 104.8 44.8C108 44.6 111.2 49.6 112.8 53.2',
    grains: 'M46.4 50l3 1.2M69.4 47.8l2.2 2.4M90 49.4l2.8.6',
  },
  {
    steam: 'M43.6 31.8C40.2 28 46.2 24 42.8 20 41.2 17.8 43.2 15.8 44.6 14.6M59.8 30.8C57.8 25.8 63 22.8 59.4 17.2M77 33C73 28.2 78.8 24.4 75.6 20.8 74.6 18.8 76 17.4 77.4 16.4',
    rim: 'M8.2 56.2C11.6 74.8 33.4 84 58.8 82.8 82 81.8 104.8 73 111.8 55.2 109.4 52.6 106.4 52 103.8 52.8',
    inner: 'M16.6 60.2C22 72.8 38 77.8 58.6 78 77.8 78 96.6 71.2 103.8 56.8',
    rice: 'M7.4 55.8C10.6 49.4 14.6 50.8 17.8 46.6C21 42.4 25.6 49 29.4 42.8C32.6 38.4 36.8 45.6 41.4 40.4C44.8 36.6 49.8 43.8 52.8 38.4C58.4 35.2 60.6 42.8 66.6 37.6C70.6 34.4 74.6 41.6 78.6 37.8C84.4 34.6 86.8 42.6 92.6 39.6C96.4 37.6 99.8 46 103.8 43.8C108.8 43.6 110.2 50.6 113.8 52.2',
    grains: 'M45.6 49.2l3.4 1.6M68.6 47l2.6 2.8M90.8 48.6l2.4 1',
  },
] as const

export function BowlDoodle({ class: cls }: { class: string }) {
  return (
    <svg class={`doodle ${cls}`} viewBox="0 12 120 92" aria-hidden="true">
      <path class="plate" {...SQUASH} opacity=".82" d="M12 60C20 62 40 63 62 62 84 61 100 59 109 57 104 71 88 81 62 82 38 83 19 74 12 60Z" />
      <path class="plate" d="M33.5 44.2c2.6-3.1 7.3-2.4 8.1.6.4 2.9-4.6 4.2-7.6 2.1ZM57 40.6c2.9-2.4 6.8-1.2 7 1.6-.2 2.9-4.9 3.3-7 1.1ZM80.4 42c3-2 6.4-.4 6.2 2.3-.5 2.6-5 2.6-6.4.3Z" />
      {BOWL_FRAMES.map((fr, i) => (
        <g key={i} class={`boil boil-${String(i + 1)}`} {...LINE}>
          <path class="line-blue" stroke-width="1.3" d={fr.steam} />
          <path class="line" {...SQUASH} stroke-width="2.4" d={fr.rim} />
          <path class="line" {...SQUASH} stroke-width="1.5" d={fr.inner} />
          <path class="line" stroke-width="1.8" d={fr.rice} />
          <path class="line" stroke-width="1.4" d={fr.grains} />
        </g>
      ))}
      <path class="line-blue" {...SQUASH} {...LINE} stroke-width="1.1"
        d="M28.6 70.4l3.4 5.4M35.8 73l2.6 5.6M43.2 75.2l2.4 5M50.6 76.4l1.8 5.2M58.4 77l1.4 5.6M66 76.8l.8 5.4M73.4 75.6l.2 5.2M80.8 73.8l-.6 5M87.8 71l-1.2 4.8" />
      <path class="line-blue" {...LINE} stroke-width="1.2" stroke-dasharray="9 3 14 2 20 4" d="M6 100.4C30 98.6 70 99.8 116.4 98.2" />
    </svg>
  )
}

// Fork and spoon laid on a tray line: "nothing posted here".
export function UtensilsDoodle() {
  return (
    <svg class="doodle doodle-sm" viewBox="0 0 112 56" aria-hidden="true">
      <path class="plate" d="M33 27.6C33 21.4 44 18.6 56.4 18.8 69 19 79.4 22 79.2 28 79 33.8 68 36.6 56 36.4 43.4 36.2 33.2 33.4 33 27.6Z" opacity=".35" />
      <path class="line" {...LINE} stroke-width="1.8" d="M24.2 28.8C23.4 18.4 40 12.6 57.6 12.8 76.6 13 90.4 19 89.8 28.4 89.2 38.6 74 44.2 56.4 44 38.2 43.8 24.6 38.6 25.8 27.2" />
      <path class="line-blue" {...LINE} stroke-width="1.1" d="M34.6 24.4C39 19.8 48 18 57.4 18.2 70 18.6 79.6 22.4 79.8 27.6M78.4 32.2C74 36.4 65 38.4 56 38.2" />
      <path class="line" {...LINE} stroke-width="1.6" d="M10.6 8.8l.4 12.2M7.4 9.4c-.2 5 .2 9.6 3.4 11.8 3.2-2 3.6-6.8 3.4-11.6M11 21.4c-.4 8.6.2 16.8-.4 26.2" />
      <path class="line" {...LINE} stroke-width="1.6" d="M101.6 47.4c.4-9.4-.2-18 .2-26.6M101.8 20.8C98.2 17.6 98.4 11 102.6 8.2c1.6 3.8 1.4 8.8-.8 12.6" />
      <path class="plate-line" {...LINE} stroke-width="1.4" d="M52 5.2c1.4 1.6 2.2 3 3.6 4.2M60.4 3.8l-.6 4.4M67.6 5.4c-1.2 1.2-2 2.6-3 3.8" />
    </svg>
  )
}

// Bathroom scale with a wobbly dial: "no weigh-ins yet".
export function ScaleDoodle() {
  return (
    <svg class="doodle doodle-sm" viewBox="0 0 112 56" aria-hidden="true">
      <path class="plate" d="M42.4 17.6C46 13.2 51 11.4 56.2 11.6 61.8 11.8 66.4 14.4 69 18.8 60.4 19.8 51 19.6 42.4 17.6Z" />
      <path class="line" {...LINE} stroke-width="1.9" d="M30.4 8.2C46 6.6 66.4 6.8 82.2 8 84 20 83.4 36 82.6 48.8 66 50.2 46.6 50 30.8 49.2 29.2 36 29.4 20.4 30.8 7" />
      <path class="line" {...LINE} stroke-width="1.4" d="M41.6 19.4C43.4 13.4 49.4 10.2 56 10.4 62.8 10.6 68.4 14 70.2 19.8 61 21 50.4 20.8 41.6 19.4ZM56.2 19.6l3.8-7.2" />
      <path class="line-blue" {...LINE} stroke-width="1.2" d="M37.4 40.6c3.8-.4 7.4-.2 10.8.4M64.2 40.8c3.6-.6 7.2-.4 10.6.2" />
      <path class="line-blue" {...LINE} stroke-width="1.2" stroke-dasharray="7 3 11 2" d="M8 52.6C36 51.2 76 52.8 104.4 51.4" />
    </svg>
  )
}
