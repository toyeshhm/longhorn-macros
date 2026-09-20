import type { ComponentChildren } from 'preact'
import type { BadgeId } from '../../achievements'

/**
 * One hand-inked stamp per badge, drawn the way every other mark in the app is: path data written by hand with
 * the wobble left in, an ink key stroke and an orange plate printed a hair off register. No shape is reused
 * between two badges and nothing here is a perfect primitive.
 *
 * Earned or not is printed by the card around it (`.badge-card.unearned` drops the orange plate and fades the
 * key stroke to an unprinted outline), never by the drawing: the same mark serves both states.
 * All decorative — the card carries the badge's name and its state in words.
 */
const LINE = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' } as const
const KEY = { ...LINE, class: 'line', 'stroke-width': 2 } as const
const PLATE = { ...LINE, class: 'plate-line', 'stroke-width': 1.3 } as const

const MARKS: Readonly<Record<BadgeId, () => ComponentChildren>> = {
  // A bowl with one fork laid over it: the very first thing logged.
  firstFood: () => (<>
    <path {...PLATE} d="M11.4 26.2C21.6 25.2 32.6 25.6 38 26.4" />
    <path {...KEY} d="M9.8 24.6C20.6 23.4 32.4 23.8 38.6 24.4 37.4 32.8 31.2 38.4 24.2 38.2 17 38 11 32.6 9.8 24.6Z" />
    <path {...KEY} d="M17.4 7.6c-.6 4.2.2 7.4 2.8 8.8M23 7.2c.4 4.4-.4 7.6-2.8 9M20.2 16.4c-.4 2.6-.2 4.8-.4 6.4" />
  </>),
  // Three plates in a row on the tray rule: breakfast, lunch and dinner on one day.
  threeMeals: () => (<>
    <path {...PLATE} d="M9.2 34.8C20.6 33.4 32.4 34 41 33.4" />
    <path {...KEY} d="M8.6 20.4c2.6-3.4 7.6-3 9.4.4 1.4 3.2-1.8 6.4-5.6 6-3.6-.4-5.6-3.6-3.8-6.4ZM19.4 18.4c2.8-3.4 8-3 9.8.4 1.6 3.4-1.6 6.8-5.4 6.4-3.8-.4-6-3.6-4.4-6.8ZM30.2 20.6c2.6-3.4 7.8-3 9.6.4 1.6 3.2-1.6 6.6-5.4 6.2-3.8-.4-5.8-3.6-4.2-6.6Z" />
    <path {...KEY} d="M7.6 33.2C19.4 31.8 31.8 32.6 40.4 32.2" />
  </>),
  // An index card with a pencil across it: a food typed in by hand.
  ownFood: () => (<>
    <path {...PLATE} d="M30.4 33.8l7.8-9.4 3 2.4-7.6 9.6-4 1.2Z" />
    <path {...KEY} d="M9.4 12.6C19 11.4 28.6 11.8 33.8 12.4 34.6 20.6 34.2 29.4 33.4 36.8 24.6 37.8 16.2 37.4 9.8 36.6 8.8 28.6 9 20.4 9.4 12.6Z" />
    <path {...KEY} d="M14.2 19.4c5 .6 9.8.2 14.4.4M14 25c4.6.4 9.2.2 13.4 0M14.2 30.4c3.4.4 6.8.2 10 .2" />
  </>),
  // A bathroom scale seen from above, dial and needle: the first weigh-in.
  firstWeighIn: () => (<>
    <path {...PLATE} d="M20 25.2c1.6-3 6.4-3.6 9-1" />
    <path {...KEY} d="M10.6 14.4C20 13.2 29.4 13.6 37.4 14.2 38.4 22.4 38 30.4 37.2 36.6 28 37.8 18.6 37.4 10.8 36.6 9.8 29 10 21.6 10.6 14.4Z" />
    <path {...KEY} d="M18.6 23.6c1.8-3.6 7.2-4.4 10.2-1.6 2.8 2.6 1.8 7.4-2 8.6-3.8 1-8.2-2.6-8.2-7ZM24 26.4l3.6-3.8" />
  </>),
  // An egg with a tick struck under it: the protein target reached on a day.
  proteinDay: () => (<>
    <path {...PLATE} d="M16 33.8c2.4 2.6 4 4.4 5.6 5.8" />
    <path {...KEY} d="M17.6 21.4c0-6.6 3-11.8 6.6-11.8 3.6 0 6.8 5.4 6.6 12-.2 5.6-3 9.2-6.8 9.2-3.8 0-6.4-3.8-6.4-9.4Z" />
    <path {...KEY} d="M14.4 32.6c2.6 2.8 4.4 5 6 6.4 4.2-4.8 8.6-9.6 13.6-14.4" />
  </>),
  // A sprig with two leaves: a fiber-rich day.
  fiberDay: () => (<>
    <path {...PLATE} d="M25.4 16c-.4 7.6-.6 15.2-.2 23" />
    <path {...KEY} d="M24.2 39.4c-.6-8.4-.2-16.8.6-24.6" />
    <path {...KEY} d="M24.4 24.8c-4.6-1.4-7.8-4.8-8.2-9.6 5-.2 8.8 3.2 9 9.4ZM24.8 31.6c4.6-1 8.4-4.4 9-9.2-5-.6-9 2.8-9.6 8.8Z" />
  </>),
  // The printer's registration mark: every ink landed where it should on one day.
  fullRegister: () => (<>
    <path {...PLATE} d="M26 13c6.4.6 11.4 6 11.2 12.4" />
    <path {...KEY} d="M24.2 11.4c7 0 12.8 5.6 12.8 12.6 0 7.2-5.8 12.8-12.8 12.6-7-.2-12.4-5.8-12.4-12.8 0-6.8 5.6-12.4 12.4-12.4Z" />
    <path {...KEY} d="M24 6.6c.4 11.6.2 23.4-.2 34.8M6.8 24.2c11.4.6 23 .4 34.4-.2" />
    <path class="plate" d="M22.2 22.4c2.6-1 4.6.4 4.2 2.2-.4 2-2.8 2.8-4.2 1.4-1-1-1.2-2.6 0-3.6Z" />
  </>),
  // A gauge with its needle resting in the band: a cutting day that landed on the plan.
  onPlanCut: () => (<>
    <path {...PLATE} d="M11 33.8C10.6 22.4 18 14.6 25.2 14.6" />
    <path {...KEY} d="M9.4 32.6C9 20.6 16.8 12.6 24.4 12.6 32.4 12.6 39.6 20.8 39 32.4" />
    <path {...KEY} d="M24 31.6c1.6-5 3.6-9.2 5.8-13.2" />
    <path {...KEY} d="M12.8 22.4l3 1.6M24.4 16.6l.2 3.4M35.4 22.6l-3 1.6" />
  </>),
  // Three halls on one street: J2, JCL and Kins.
  threeHalls: () => (<>
    <path {...PLATE} d="M6.6 38.8C18.6 37.6 31.2 38.2 42.4 37.8" />
    <path {...KEY} d="M7.6 36.8c-.4-5.2-.2-10 .2-14.6 3.6-.2 7-.2 10.4 0 .4 4.8.4 9.6.2 14.8M18.6 36.8c-.4-7-.2-13.6.2-20 4-.4 7.8-.4 11.6 0 .4 6.4.6 13 .2 20M31 36.8c-.2-5-.2-9.6.2-14 3.2-.4 6.4-.4 9.4 0 .4 4.4.4 9 .2 14.2" />
    <path {...KEY} d="M7.2 22.2l5.8-4.6 5.4 4.4M18.4 16.8l6.2-5 5.8 4.8M30.8 22.6l5-4 4.8 3.8" />
    <path {...KEY} d="M6 37.4C18.4 36.2 31 36.8 42.2 36.6" />
  </>),
  // A week's page, one tick per day logged.
  sevenDays: () => (<>
    <path {...PLATE} d="M11.4 15C20.8 14 30 14.4 38.6 15" />
    <path {...KEY} d="M9.6 13.4C19.4 12.2 29.2 12.6 38.4 13.2 39.2 21.6 38.8 30 38 37 28.4 38 18.6 37.6 9.8 36.8 8.8 29 9 21 9.6 13.4Z" />
    <path {...KEY} d="M16 13c-.2-2.6-.2-4.4 0-6.2M32.2 12.8c-.2-2.4-.2-4.2 0-5.8M10 20.4c9.6-.8 19.2-.4 28 .2" />
    <path {...KEY} d="M14.6 26l2.4 2.6M21 25.6l2.6 2.8M27.4 26.2l2.4 2.4M33.6 25.8l2.6 2.6M14.8 32.4l2.4 2.6M21.2 32l2.6 2.8M27.6 32.6l2.4 2.4" />
  </>),
  // Five tally strokes, struck through: five days the protein target was met.
  proteinFive: () => (<>
    <path {...PLATE} d="M11 33.4C18.6 29 27.4 24 36.2 19.2" />
    <path {...KEY} d="M12.6 15.4c-.6 6.4-.4 12.6.2 18.8M19 15c-.6 6.6-.4 12.8.2 19M25.4 15.4c-.6 6.4-.4 12.6.2 18.8M31.8 15c-.6 6.6-.4 12.8.2 19" />
    <path {...KEY} d="M9.4 31.6C17.4 27.2 26.6 21.8 35.8 17.2" />
  </>),
  // A menu of dishes, each with its own bowl: different foods tried.
  twentyFiveFoods: () => (<>
    <path {...PLATE} d="M22.6 19.6c5-.6 10-.4 14.6.2M22.4 29c5.2-.6 10.2-.4 15 .2" />
    <path {...KEY} d="M10.4 16.4c2-2.6 6-2.4 7.4.2 1.2 2.6-1.2 5-4.2 4.8-2.8-.2-4.4-2.8-3.2-5ZM10.6 25.6c2-2.6 6-2.4 7.4.2 1.2 2.6-1.2 5-4.2 4.8-2.8-.2-4.4-2.8-3.2-5ZM10.4 34.8c2-2.6 6-2.4 7.4.2 1.2 2.6-1.2 5-4.2 4.8-2.8-.2-4.4-2.8-3.2-5Z" />
    <path {...KEY} d="M21.6 18c5.4-.6 10.8-.4 15.8.2M21.4 27.4c5.6-.6 11-.4 16 .2M21.6 36.6c4.4-.6 8.8-.4 12.8.2" />
  </>),
  // Weigh-ins plotted against the trend line, the same orange trend the chart draws.
  tenWeighIns: () => (<>
    <path {...PLATE} d="M14.6 30.6C20.4 27.6 27 24.6 34.6 22" />
    <path {...KEY} d="M10.4 11.6c-.6 8.8-.4 17.6.2 25.8 8.6.8 17.4 1 26.8.2" />
    <path {...KEY} d="M15 29.4c1.8-1.2 3.6.2 3.2 1.8-.4 1.6-2.6 1.8-3.4.6-.6-.8-.4-1.8.2-2.4ZM23.4 25.8c1.8-1.2 3.6.2 3.2 1.8-.4 1.6-2.6 1.8-3.4.6-.6-.8-.4-1.8.2-2.4ZM32 21.8c1.8-1.2 3.6.2 3.2 1.8-.4 1.6-2.6 1.8-3.4.6-.6-.8-.4-1.8.2-2.4Z" />
  </>),
  // A dial being turned by two arrows: the target the app re-set from the weight trend.
  adaptive: () => (<>
    <path {...PLATE} d="M26 16.2c5 .8 8.6 5.2 8.2 10.2" />
    <path {...KEY} d="M24.2 14.6c5.4 0 9.8 4.4 9.6 9.8-.2 5.2-4.6 9.2-9.8 9-5.2-.2-9.2-4.6-9-9.6.2-5.2 4.4-9.2 9.2-9.2ZM24 24.2l5.2-4.6" />
    <path {...KEY} d="M12.4 18.6c1.6-4.2 4.6-7.4 8.6-8.8l-3.6-.4M35.8 29.4c-1.6 4.4-4.8 7.4-8.8 8.8l3.8.6" />
  </>),
  // A month on one page, hand-ruled: thirty days logged.
  thirtyDays: () => (<>
    <path {...PLATE} d="M11.4 15.2C20.8 14.2 30 14.6 38.6 15.2" />
    <path {...KEY} d="M9.6 13.4C19.4 12.2 29.2 12.6 38.4 13.2 39.2 21.6 38.8 30 38 37 28.4 38 18.6 37.6 9.8 36.8 8.8 29 9 21 9.6 13.4Z" />
    <path {...KEY} d="M10 20.6c9.4-.8 18.8-.4 28 0M10.2 26.8c9.4-.6 18.8-.4 27.8.2M10.4 33c9.2-.6 18.4-.4 27.4.2" />
    <path {...KEY} d="M19.2 14c.4 7.6.4 15.4 0 23M28.6 13.8c.4 7.8.4 15.6 0 23.2" />
  </>),
  // A printed seal with ribbons: a hundred different foods.
  hundredFoods: () => (<>
    <path {...PLATE} d="M26 11.4c6 1 10.2 6.2 9.6 12.2" />
    <path {...KEY} d="M24.2 9.6c6.6 0 12 5.4 11.8 12-.2 6.4-5.6 11.4-12 11.2-6.4-.2-11.4-5.6-11.2-12C13 14.6 18 9.6 24.2 9.6Z" />
    <path {...KEY} d="M24 14.2c4 0 7.2 3.4 7 7.4-.2 3.8-3.4 6.6-7.2 6.4-3.8-.2-6.6-3.4-6.4-7.2.2-3.8 3.2-6.6 6.6-6.6Z" />
    <path {...KEY} d="M18.6 31.6c-1.2 3.6-2 7.2-2.6 10.6l5.6-3.2 4.8 3.4c-.6-3.8-1.2-7.2-2-10.6" />
  </>),
}

export function BadgeMark({ id }: { id: BadgeId }) {
  return <svg class="badge-mark" viewBox="0 0 48 48" aria-hidden="true">{MARKS[id]()}</svg>
}
