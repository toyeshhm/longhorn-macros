---
name: Longhorn Macros
description: A dining-hall macro log printed like a two-ink riso zine.
colors:
  paper: "#F7F3EA"
  paper-raised: "#FBF9F3"
  paper-shade: "#EDE7DA"
  riso-blue: "#2B4C9B"
  ink: "#1E3470"
  ink-deep: "#0F1A40"
  ink-soft: "#4E5780"
  burnt-orange: "#BF5700"
  riso-teal: "#00838A"
  riso-mustard: "#E0A800"
  over: "#9A3412"
colorsNight:
  paper: "#141A33"
  paper-raised: "#1E2647"
  paper-shade: "#0D1226"
  riso-blue: "#8AA6EE"
  ink: "#EFE8D8"
  ink-deep: "#FFFDF6"
  ink-soft: "#9AA3C6"
  burnt-orange: "#FF9147"
  riso-teal: "#46CFC6"
  riso-mustard: "#F5CE5A"
  over: "#FF8878"
typography:
  display:
    fontFamily: "Bungee, Arial Black, Impact, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 400
    lineHeight: 0.95
  headline:
    fontFamily: "Bungee, Arial Black, Impact, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "Bungee, Arial Black, Impact, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  wobble: "255px 12px 225px 10px / 12px 225px 10px 255px"
  wobble-sm: "6px 3px 7px 4px / 4px 7px 3px 6px"
spacing:
  gutter: "16px"
  tap: "44px"
  tabbar: "64px"
components:
  button-primary:
    backgroundColor: "{colors.riso-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.wobble}"
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.wobble}"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.riso-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.wobble}"
    height: "44px"
  input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-deep}"
    rounded: "{rounded.wobble-sm}"
    height: "44px"
  toast:
    backgroundColor: "{colors.riso-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.wobble-sm}"
---

# Design System: Longhorn Macros

## 1. Overview

**Creative North Star: "The Copy-Shop Zine"**

Every screen is a page of a two-ink risograph zine run off at the copy shop: federal blue does the linework and type, burnt orange is the second drum, laid on top with multiply and landing a pixel or two off register. The paper has grain. Numbers are stamped in Bungee; everything else is set in Courier Prime. Every icon, rule, bar, checkbox, arrow and doodle is drawn by hand as SVG path data, with the wobble left in.

Under the texture it is still a tool used standing in the J2 line with one thumb. The hero answers "how much is left today" at a glance; food rows put the name first and the portion second; state (over target, stale menu, sync failed) is always said in words, never only by ink. The system rejects the generic dark UI with a neon orange accent (rejected by the owner), MyFitnessPal clutter, SaaS card grids and the UT portal look.

There are two presses of the same zine, never an inversion: the **day press** on warm stock and the **night press**
on ink-navy stock. `:root[data-theme]` picks one, set by `src/ui/theme.ts` from the reader's choice (Light / Night /
Match phone, default Match phone, kept per device in `localStorage`). Every component rule is written once against
tokens; the night block re-inks the tokens and re-states nothing.

**Key Characteristics:**
- Two inks plus paper; two extra macro inks used only for carbs (teal) and fat (mustard). Protein prints in the blue drum as a solid fill, calories in the orange.
- Misregistration is the signature: orange plate offset 1.5 to 3px from the blue.
- Hand-drawn SVG for every mark; no icon library, no stock primitives.
- Motion is rare: the "line boil" on doodles, the sheet slide, the toast. Reduced motion stops all of them, plus the tab plate fade.
- Every kcal and mg figure goes through `n()` in `src/ui/format.ts` (thousands separators), and every printed servings count through `formatServings()` in `src/servings.ts` (quarters, thirds and halves print as fractions, everything else to 2dp), so a value never prints two ways and a typed "1 1/3" never comes back as 1.3333333333333333.
- Nothing the design says is "said in words" is announced from a region that appears with its text: every live region (toast, sync banners, the Goals save line, the search count, the adaptive card's slot) is mounted empty from the first paint, and only its text changes.

## 2. Colors

A two-ink riso palette on warm stock, with two extra macro inks that only ever mean one nutrient each.

### Primary
- **Federal Blue** (#2B4C9B): linework, bar outlines' hatch, chart dots, primary buttons, selected chips, toast. Also the protein ink, always as a solid fill (never as a line), so it stays distinct from blue hatch and type.
- **Ink** (#1E3470): all body type and hand-drawn strokes (10.6:1 on paper).
- **Deep Ink** (#0F1A40): food names, eaten amounts, values in tables (15.3:1).
- **Soft Ink** (#4E5780): secondary text: servings/portion, meta rows, units, chart labels (6.4:1 on paper, 5.3:1 once the grain layer is composited over it — the grain costs about 17% of a ratio, so measure rendered pixels, not tokens).

### Secondary
- **Burnt Orange** (#BF5700): the second drum. Big-number overprint, active-tab plate, primary-button offset plate, link underlines, the calories-eaten bar. Always multiplied; never used for body text (4.1:1).

### Tertiary (macro inks)
- **Protein: Federal Blue** (#2B4C9B), solid fill. Calories keep the orange.
- **Carbs: Riso Teal** (#00838A).
- **Fat: Riso Mustard** (#E0A800), always with a blue hand-drawn outline so it reads on paper.

### Neutral
- **Paper** (#F7F3EA): page and sheet stock, with the grain layer over it.
- **Paper Raised** (#FBF9F3): form boxes, buttons, the targets slip.
- **Paper Shade** (#EDE7DA): banners.
- **Over** (#9A3412): over-target amounts, errors, invalid fields (6.6:1). Always paired with words ("over", the error message).

### The Night Press

Same plates, different stock and inks. Dark navy stock (#141A33, raised #1E2647, shade #0D1226), cream linework and
type (#EFE8D8, deep #FFFDF6, soft #9AA3C6 at 6.9:1). Every ink is lifted so it still prints: blue #8AA6EE (7.2:1),
burnt orange #FF9147 (7.7:1), teal #46CFC6, mustard #F5CE5A, over #FF8878 (7.4:1). Nothing falls under 4.5:1 on any
of the three stocks, and the blue plate carries stock-coloured type (7.2:1) exactly as it does by day.

**Ink roles are unchanged by the press.** Calories orange, protein blue, carbs teal, fat mustard; blue is linework
and the protein plate; orange is the second drum. What changes:

- **When the press is chosen.** `public/theme-boot.js` runs blocking in `<head>`, before the bundle that carries
  the stylesheet: the press is on the root element at first paint, so a Night reader never gets a screenful of cream
  stock while 300KB of JavaScript parses. `src/ui/theme.ts` owns the choice from then on.
- **`--blend`.** The second drum multiplies onto light stock and **screens** onto dark: ink on dark paper lightens
  what it lands on. One token, swapped on the night root; no component re-states its blend mode.
- **`--grain-strength`.** Dark specks on dark stock are mud, so the night grain tile is pale (`grain-night.svg`) —
  and pale specks on near-black stock are a far bigger excursion than dark specks on cream, so the night press runs
  at **0.1** against the day press's 0.4. Measured over their own stocks those match (1.18:1 vs 1.14:1 speckle
  contrast); the 0.28 it started at read as sensor noise over every flat navy area.
- **The hand-inked art.** A CSS-referenced SVG cannot read a token, so every mark has a night twin next to it
  (`rule-night.svg`, `chevron-night.svg`, `box-checked-night.svg`, …) and a `--mark-*` token picks the press. Draw
  both, or draw neither: a day-only mark disappears on the night stock.
- **`--orange-rgb` / `--paper-rgb`.** The off-register text-shadows and the sheet's paper veil are written as
  `rgb(var(--…) / a)` so they follow the press at whatever alpha the component asked for.
- **`--plate-k`.** An alpha plate mixes toward the stock, so the same orange that *lifts* on cream *darkens* on navy
  and prints brown — the opposite of what `--blend: screen` states. Every offset plate's alpha is written
  `calc(a * var(--plate-k))`, 1 by day and 1.7 at night, so the plate stays the lifted orange on both stocks.
- **`--veil`.** The sheet's paper veil, `calc(1 - var(--grain-strength))`, so its grain equals the page layer's on
  either press instead of being pinned to the day press's 0.6.

### Named Rules
**The Macro Ink Rule.** Calories are orange, protein blue, carbs teal, fat mustard, everywhere they appear: bars, swatches in the nutrient table, the targets panel, the protein figure on menu rows and stats. The name always sits beside the ink.

**The Two Drum Rule.** Anything decorative is blue or orange. The macro inks are data, not decoration. Blue as protein data is always a solid plate; blue as decoration is always a line or hatch.

## 3. Typography

**Display Font:** Bungee (fallback Arial Black, Impact)
**Body Font:** Courier Prime 400/700 (fallback Courier New, ui-monospace)

Both self-hosted as latin-subset woff2 under `public/fonts/` (OFL, licence files alongside), `font-display: swap`, preloaded in `index.html`, and precached by the service worker.

**Character:** Bungee is the rubber stamp; Courier Prime is the typewritten copy. Bungee is caps-only, so it is kept to numerals and short headings; units next to a Bungee number are set in Courier (`734 kcal`, not `734 KCAL`).

### Hierarchy
- **Display** (Bungee, 4.5rem, 0.95): the calories-left numeral only. Blue 2px outline, orange multiply fill offset (2.5px, -2px), straight on the paper (the highlighter swipe behind it was dropped at owner review). The overprint is a `::before` with empty alt text (`content: attr(data-ink) / ''`) so screen readers hear the number once.
- **Headline** (Bungee, 1.75rem): screen mastheads, with a 2px/1.5px orange text-shadow as the off-register plate.
- **Title** (Bungee, 0.95 to 1.3rem): date line, station and meal headers, sheet titles, stat values.
- **Body** (Courier Prime 400, 1rem, 1.45): everything else. Inputs never below 16px.
- **Label** (Courier Prime 700, 0.875 to 0.9rem): field labels, macro names, hero label ("calories left today").

### Named Rules
**The Stamp Rule.** Bungee never sets a sentence, a button or a form label.

## 4. Elevation

Flat print. There are no soft shadows. Depth is a second plate: primary buttons, selected chips, the toast and the targets slip carry a hard orange offset (`box-shadow: 3px 3px 0 #BF5700`, 2px for chips, 4px at 55% for the targets slip). Pressing a button moves it 1px onto its plate. Bottom sheets are a fresh sheet of the same grained stock (grain tile under a `--veil` paper veil, which is 1 minus the page layer's grain, so the two always match) over a blue ink wash (`rgb(30 52 112 / .35)`).

**The Grain Layer.** One `body::after`, fixed, `pointer-events: none`, tiled `src/ui/ink/grain.svg` (feTurbulence rasterised once), `--grain-strength` opacity (0.4 day, 0.1 night), promoted with `will-change: transform`. The tile's specks are dark with alpha, so alpha-over reads as multiply; a full-screen `mix-blend-mode` was tried and doubled repaint cost (e2e went from 21s to 45s with logout timeouts), so don't add it back. Never per element.

## 5. Components

### Hand-drawn marks
- Tab icons: `src/ui/icons/TabIcons.tsx`. Blue line always; orange plate prints only on the active tab, and its label gets an orange underline.
- Arrows, close, plus, minus, swatches: `src/ui/icons/Marks.tsx`.
- Doodles: `src/ui/icons/Doodles.tsx`. Bowl (line boil) on Today's empty state and Login; utensils on empty menu/search; scale on no weigh-ins.
- CSS-referenced ink (rules, pencil dividers, chevron, checkbox, search glass, grain): `src/ui/ink/*.svg`. Colors are baked in as hex because an image cannot read CSS tokens; keep them in step with the tokens above.
- **Drawing rules:** write path data by hand; coordinates carry decimals and no line is straight or closed perfectly; keep a blue key stroke and, where it earns it, an orange stroke offset 1 to 2px with multiply. No icon libraries, no `<rect>`/`<circle>` stand-ins for drawn things.

### Line boil
Three hand-inked frames of the same doodle, swapped at ~8fps with `step-end` visibility keyframes (`.boil-1/2/3`, 0.36s cycle). `prefers-reduced-motion` freezes frame 1. Only on doodles.

### Hand-drawn bars (`InkBar`)
Fixed hand-drawn outline; the fill's right edge carries a hand-picked wobble that moves with the amount; the part still left is hatched in blue. Over target: the fill runs full and dark cross-hatch overprints it, and the text says "over". `role="progressbar"` with value text.

The three macro rows share one subgrid so the bars align, but the bar's track is never allowed to starve: it has a 3rem floor, and under 16em of the row's own width (a container query, because media-query `em` cannot see the page's font-size) the row reflows to two lines, name and number above, bar full width below. A bar that has printed its aria but not its ink is a bug the e2e catches at 320px with 32px root text.

### Today hero
Label ("calories left today" / "target passed today" / "calories eaten today" with no targets), the stamped numeral (plus "over" when over), "**eaten** eaten of **target**" (no unit; the label already says calories), then the full-width calories InkBar in orange. Macro rows below share one subgrid so the three bars align.

### Buttons
- **Shape:** hand-drawn wobble radius (`255px 12px 225px 10px / 12px 225px 10px 255px`), 1.5px ink border, 44px tall.
- **Primary:** blue plate, paper text, orange offset plate.
- **Secondary:** raised paper, ink text. **Danger:** over-red text and border. **Link:** ink text with a 2px orange underline. **Stamp:** Bungee in ink with an orange off-register text-shadow (the "Today" jump, hung under the next arrow so the date nav never shifts).

### Sheets
A scrolling body with the primary plate (and Delete) printed in a footer below it, outside the scrollport, over a hand-drawn rule. Never sticky inside the scroller: with the on-screen keyboard up a sticky plate sits on top of the Meal select and, on a small phone, the whole servings stepper. Long dining-hall names in caps Bungee clamp to three lines so the controls stay above the fold; the full name is still the dialog's accessible name.

### Toast
One slip of blue stock, gutter to gutter and then shrunk to its text (never pinned to half the viewport). It is always in the DOM and prints only when it has something to say. A plain confirmation fades after 3s; a delete does not, because its Undo is the only way back and a clock on the sole path to a function is a WCAG failure. It stays until Undo, Dismiss, or the next toast, and the Undo button names what it would restore.

### Chips (hall / day / meal / range / sex / goal)
Printed radio stamps: wobble border, bold Courier; selected is the blue plate with a 2px orange offset. Scroll horizontally, full-bleed. The group is named by `aria-label` on the `<fieldset>`, never by a visually-hidden `<legend>`: Chromium exposes a legend both as the group's name and as a text node inside it, so browse mode reads the name twice.

Day chips stack (`.chip-stack`): the numeric date over a smaller caps weekday ("9/19" / "SAT"). Never a relative word
— "Today" is wrong on a phone left open past midnight and a bare weekday does not say which week. The chip's
accessible name starts with what the chip prints and then spells it out ("9/19 Sat, Saturday, September 19"),
carried by `aria-label` on the input. It must start with the visible text: a name that only spelled the date out
failed WCAG 2.5.3, and "tap 9/19" and "tap Sat" both missed for anyone driving the app by voice. A chip with no `sub` keeps its bare text node: wrapping that label in a span
puts the invisible input over the click target.

### Hall hours line
Under the hall chips, for **the day the chips have selected** — never today's status over another day's menu. Today
gets the state in words first (`Open until 2:00pm · reopens 4:30pm`, `Closed · opens 4:30pm`, `Closed today · opens
Mon 10:30am`, `Hours unavailable`), then today's windows in Soft Ink. Any other day gets that day's own windows under
its weekday (`Tue 10:30am–10:00pm`) and no open/closed word, because there is no "now" on a Tuesday.

The second line prints only when it is not a restatement of the first: a hall closed all day, one the feed wrote
unreadably, and one already done for today all say it once. A hall shut for more than a day names the day it opens
again rather than a bare "Closed" — JCL is shut for about 57 hours every weekend, which is exactly when a student
needs telling. `now` re-derives every minute (`useNow`), so a phone left open in the queue does not keep printing a
status that expired. The line is also spoken from a visually-hidden `role="status"` that is mounted with the screen,
because the strip itself is created with the menu and a region born with its text is unreliably announced.

Parsing and wording live in `src/menu/hours.ts`; anything the feed writes in a way we cannot read is "unknown", never
a guess and never a crash. While the feed is still in flight the strip prints nothing at all — "Hours unavailable" is
reserved for a request that actually failed, the same distinction the Profile week table makes.

### Profile sections
Folded pages: a `<details>` per section with its `<h2>` inside the `<summary>`, so the heading is in the
accessibility tree whether or not the page is unfolded, and the screen is never one run of unlabelled fields. Only
Goals is unfolded on arrival. The fold marker is the hand-drawn chevron, turned 90 degrees when shut. The dining-hours
week prints as one two-column table per hall (day, hours), which still fits a 320px page.

### Inputs
Printed form boxes on raised paper, wobble-sm corners, 16px text, hand-drawn chevron on selects, hand-drawn box and tick for checkboxes. Invalid: 2px over-red border plus the message linked by `aria-describedby`, on the one field the message is about — never pooled across the form, or a wrong current password paints the new-password box red too. Focus everywhere: 2.5px orange outline; on the blue toast plate it switches to paper (orange on blue is 1.75:1). Date inputs use a hand-drawn calendar (`ink/calendar.svg`) in place of the browser picker glyph.

### Lists
Station and meal headers are Bungee with a hand-drawn blue rule, sticky on Menu. Rows are divided by a dashed pencil rule. Food name: Courier 700 in Deep Ink. Portion/servings: Courier 400 in Soft Ink, smaller.

### Chart
Blue weigh-in dots drawn as lumpy ink blobs (four quadratic curves, turned per index), EWMA trend as a freehand cubic line with hand-picked nudges, in orange multiply offset (1.5, -1), wobbly dashed gridlines and a hand-drawn L axis. A small key under the chart names both marks ("weigh-in", "trend (smoothed)").

## 6. Do's and Don'ts

- **Do** keep numbers the hero: one stamped numeral per screen at most.
- **Do** say state in words: "over", "Couldn't reach UT dining", "changes waiting to sync".
- **Do** check every new text color against paper at 4.5:1 **with the grain layer composited over it**, on **both** stocks — the tokens alone read about 17% high on the day press.
- **Do** let a mark grow with the user's text: reserve room with `min-height`, not `height`, and reflow a row before a track can collapse.
- **Don't** put a clock on the only way to undo something, or `aria-label` on a paragraph (the role does not take a name; use a section).
- **Don't** auto-invert. The night press is a second set of tokens, drawn on purpose; a filter over the day press is not it.
- **Don't** add a colour, a blend mode or a CSS-referenced mark for one press only: both, or neither.
- **Don't** use orange for text below 18px bold.
- **Don't** use teal or mustard for anything but their macro, fill anything but protein with solid blue in a data mark, or show a macro ink without its name.
- **Don't** pull icons from a library or draw marks with perfect primitives.
- **Don't** add soft shadows, gradients, glass or side-stripe borders.
- **Don't** animate anything else on a loop; the boil is for doodles only.
- **Don't** use em dashes in copy.
