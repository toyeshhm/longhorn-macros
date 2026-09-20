# Product

## Register

product

## Users
One UT Austin student (the owner) on a meal plan. Used standing in a dining-hall line at J2, JCL, or Kins, phone in one hand, tray or bag in the other; bright fluorescent light at lunch, dim room at night when reviewing the day. Also opened on a laptop occasionally. The job: log what was just eaten in a few seconds and know how many calories and grams of protein are left today.

## Product Purpose
Longhorn Macros turns UT's live dining menu into a calorie and macro log with targets from a cut / maintain / bulk goal, and learns true maintenance calories from the weight trend. Success is logging a meal in under 10 seconds and trusting the numbers enough to adjust eating from them.

## Brand Personality
Handmade riso zine. The app should look printed and drawn by a person: two-ink risograph print (federal blue linework and type, burnt orange overprinted with multiply, slightly off register), paper grain, stamped Bungee numerals, copy-shop Courier Prime text, and hand-drawn icons, doodles and hand-animated "line boil" motion. Calm and legible underneath the texture: numbers are still the hero and read at a glance. Chosen by the owner from a nine-direction style board on 2026-09-19; the calories hero borrows the notebook layout (label, big number on a highlighter swipe, "eaten of target" line, hand-drawn bar).

## Anti-references
- Generic dark UI with a neon orange accent ("vibecoded"); rejected explicitly by the owner.
- MyFitnessPal: ads, clutter, dense menus, every screen shouting.
- Generic SaaS dashboards: card grids, gradient accents, template feel, hero-metric blocks.
- The official UT website: institutional portal look, heavy branding, bureaucratic layout.
- Pressure mechanics: streaks you can break, "don't lose your streak!" nudges, red marks for a missed day, confetti, guilt copy, anything that punishes a day off.

## Achievements (changed 2026-09-20)
Badges used to sit in the anti-references above, alongside streaks and confetti. The owner asked for them on
2026-09-20, so badges are **in** and the rest of that line stays out. What changed is the mechanic, not the spirit:

- Badges are **printed stamps for what has already happened**, earned from real logged data and never taken away.
- Celebratory, never shaming. A badge says what was done; nothing on the screen says what was missed.
- **No pressure mechanics.** No streak that can break, no countdown, no red mark on a day with nothing logged, no
  nagging. A day off costs nothing and is never drawn.
- **Nothing that rewards under-eating.** No "lowest calorie day", no badge for skipping a meal. A cut badge is for
  landing on the plan, not under it.
- Unearned badges print as faint unprinted stamps with honest progress ("4 of 7") — an empty sheet on a new
  account reads as a sheet waiting to be printed, not as a scoreboard of failures.

## Design Principles
- **Glanceable first.** Each screen answers one question at a glance (what's left today, what's being served, am I on pace) before offering detail.
- **One thumb, one pass.** Primary actions sit in thumb reach; adding food never needs more than tap, adjust, add.
- **Honest numbers.** Show the data plainly, say when it's stale or estimated, never round away the truth or dramatize over/under.
- **Quiet until it matters.** Color and emphasis are reserved for state that needs attention (over target, sync failed, menu stale).
- **Offline is normal.** Bad signal in the dining hall is expected, not an error screen.

## Accessibility & Inclusion
WCAG 2.2 AA: 4.5:1 text contrast in light and dark, 44px minimum tap targets, full keyboard and screen-reader operability (labels, roles, live regions for toasts), state never conveyed by color alone, `prefers-reduced-motion` respected, inputs at 16px+ so iOS never zooms.
