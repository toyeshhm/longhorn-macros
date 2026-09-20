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
  ink-soft: "#56608A"
  burnt-orange: "#BF5700"
  riso-teal: "#00838A"
  riso-mustard: "#E0A800"
  over: "#9A3412"
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

The theme is light only (`color-scheme: light`). A printed page does not invert; there is no dark mode.

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
- **Soft Ink** (#56608A): secondary text: servings/portion, meta rows, units, chart labels (5.5:1 on paper, headroom left for grain).

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

Flat print. There are no soft shadows. Depth is a second plate: primary buttons, selected chips, the toast and the targets slip carry a hard orange offset (`box-shadow: 3px 3px 0 #BF5700`, 2px for chips, 4px at 55% for the targets slip). Pressing a button moves it 1px onto its plate. Bottom sheets are a fresh sheet of the same grained stock (grain tile under a 60% paper veil, which equals the page layer's 40%) over a blue ink wash (`rgb(30 52 112 / .35)`).

**The Grain Layer.** One `body::after`, fixed, `pointer-events: none`, tiled `src/ui/ink/grain.svg` (feTurbulence rasterised once), 40% opacity, promoted with `will-change: transform`. The tile's specks are dark with alpha, so alpha-over reads as multiply; a full-screen `mix-blend-mode` was tried and doubled repaint cost (e2e went from 21s to 45s with logout timeouts), so don't add it back. Never per element.

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
Printed radio stamps: wobble border, bold Courier; selected is the blue plate with a 2px orange offset. Scroll horizontally, full-bleed.

### Inputs
Printed form boxes on raised paper, wobble-sm corners, 16px text, hand-drawn chevron on selects, hand-drawn box and tick for checkboxes. Invalid: 2px over-red border plus the message linked by `aria-describedby`. Focus everywhere: 2.5px orange outline; on the blue toast plate it switches to paper (orange on blue is 1.75:1). Date inputs use a hand-drawn calendar (`ink/calendar.svg`) in place of the browser picker glyph.

### Lists
Station and meal headers are Bungee with a hand-drawn blue rule, sticky on Menu. Rows are divided by a dashed pencil rule. Food name: Courier 700 in Deep Ink. Portion/servings: Courier 400 in Soft Ink, smaller.

### Chart
Blue weigh-in dots drawn as lumpy ink blobs (four quadratic curves, turned per index), EWMA trend as a freehand cubic line with hand-picked nudges, in orange multiply offset (1.5, -1), wobbly dashed gridlines and a hand-drawn L axis. A small key under the chart names both marks ("weigh-in", "trend (smoothed)").

## 6. Do's and Don'ts

- **Do** keep numbers the hero: one stamped numeral per screen at most.
- **Do** say state in words: "over", "Couldn't reach UT dining", "changes waiting to sync".
- **Do** check every new text color against paper at 4.5:1 with grain in mind.
- **Do** let a mark grow with the user's text: reserve room with `min-height`, not `height`, and reflow a row before a track can collapse.
- **Don't** put a clock on the only way to undo something, or `aria-label` on a paragraph (the role does not take a name; use a section).
- **Don't** add dark mode or auto-invert.
- **Don't** use orange for text below 18px bold.
- **Don't** use teal or mustard for anything but their macro, fill anything but protein with solid blue in a data mark, or show a macro ink without its name.
- **Don't** pull icons from a library or draw marks with perfect primitives.
- **Don't** add soft shadows, gradients, glass or side-stripe borders.
- **Don't** animate anything else on a loop; the boil is for doodles only.
- **Don't** use em dashes in copy.
