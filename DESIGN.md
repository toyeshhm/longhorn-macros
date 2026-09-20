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

There are **six presses** of the same zine, never an inversion of one another: day, night, cherry, newsprint,
blueprint and meadow (§2). `data-theme` on the root names the one that is running, and `src/ui/theme.ts` writes
that press's whole token set onto the root element from the reader's choice (a press, or Match phone, which runs
the press they named for each of the phone's two settings; default Match phone on day and night, kept per device
in `localStorage`). Every component rule is written once against tokens; a press is a list of inks and re-states
nothing.

**Key Characteristics:**
- Two inks plus paper on every press; two extra macro inks used only for carbs (teal) and fat (mustard). Protein prints in the first drum as a solid fill, calories in the second.
- Misregistration is the signature: the second drum offset 1.5 to 3px from the first, scaled per press by `--reg-x` / `--reg-y` so six runs off one machine do not all slip the same way.
- Hand-drawn SVG for every mark; no icon library, no stock primitives.
- Motion is rare: the "line boil" on doodles, the sheet slide, the toast. Reduced motion stops all of them, plus the tab plate fade.
- Every kcal and mg figure goes through `n()` in `src/ui/format.ts` (thousands separators), and every printed servings count through `formatServings()` in `src/servings.ts` (quarters, thirds and halves print as fractions, everything else to 2dp), so a value never prints two ways and a typed "1 1/3" never comes back as 1.3333333333333333.
- Nothing the design says is "said in words" is announced from a region that appears with its text: every live region (toast, sync banners, the Goals save line, the search count, the adaptive card's slot) is mounted empty from the first paint, and only its text changes.

## 2. Colors

A two-ink riso palette, with two extra macro inks that only ever mean one nutrient each. The roles below are
named on the **day press**, which is the run the app ships on; §"The Presses" lists what each of the other five
inks them in, and every role is the same on all six.

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

### The Presses

Six of them. A press is **one two-ink run on one stock**, and each is a different run, not a hue-rotate of the
day press: different paper, different drums, different grain, and where it earns it a different stock texture.
They live in one table in `src/theme.ts`, which is the only place any ink in the app is written down.

| Press | Stock | First drum (linework, protein) | Second drum (overprint, calories) | Carbs | Fat | Grain |
| --- | --- | --- | --- | --- | --- | --- |
| **Day** | warm cream `#F7F3EA` | federal blue `#2B4C9B` | burnt orange `#BF5700` | teal `#00838A` | mustard `#E0A800` | dark specks, 0.4 |
| **Night** | ink navy `#141A33` | lifted blue `#8AA6EE` | lifted orange `#FF9147` | `#46CFC6` | `#F5CE5A` | pale specks, 0.1 |
| **Cherry** | bright white `#FCFBFD` | graphite key `#3F3644` | fluorescent pink `#DB0068` | `#00767E` | `#C89200` | fine tight specks, 0.3 |
| **Newsprint** | tan `#E6DCC4` | steel graphite `#3E4A52` | muted red `#A52E1E` | `#10585A` | `#9A7415` | coarse dark specks, 0.55 |
| **Blueprint** | deep navy `#0B2039` | cyan `#5FC9EA` | drafting red `#E2693C` | mint `#63E0B4` | amber `#EBB94F` | a ruled drafting grid, 0.12 |
| **Meadow** | pale sage `#E7EDE0` | deep green `#1F5B3A` | ochre `#A0651B` | `#17697E` | `#D9A800` | soft large specks, 0.35 |

Three of those inks are the way they are because the first cut of the six presses got them wrong, and the
failures are worth keeping written down:

- **Cherry was day with the second drum swapped.** Its first drum, its Ink and its grain were byte-identical to
  day's, so the linework, the hatch, the type, the tab icons, the bar outlines and the speckle tile were the
  day press's plates with a pink over them — one design with the hue slider moved, which is the exact thing the
  press system exists to avoid. The classic riso pairing is fluorescent pink over a **graphite key**, not over
  federal blue, so cherry is re-inked in graphite with its own type and its own finer, tighter stock texture.
- **Newsprint's first drum was the same grey as its Soft Ink** (`#4A453C` against `#4C4535`, 1.00:1). The
  protein plate, the hand rules, the bar hatch and the secondary body copy all printed in one ink, and the
  protein row read as an unfilled box beside an inked carbs chip. The drum is cool steel now, so it is a drum.
- **Blueprint's second drum was the chalk the type was set in** (`#F7EFDC` against `#E4EDF4`, 1.03:1). Every
  off-register plate — the signature of the run — printed inside the letterform it was supposed to sit beside.
  It is a drafting red now, which leaves the chalk to the type and keeps amber and mint distinct.

`tests/theme.test.ts` holds both of those shut: no macro ink may be mixed within 24 RGB units of any of the
press's three text inks, and the second drum composited at the stylesheet's own plate alpha must clear 2:1
against Ink. Contrast alone cannot carry the first rule — day's protein plate is federal blue against a darker
federal blue type, 1.15:1 against Soft Ink, and that pair is the design.

**Ink roles are the same on every press.** Calories are the second drum, protein the first, carbs teal, fat
mustard. The first drum is all linework, every hand stroke and the solid protein plate; the second is the
overprint, every offset plate and the calories ink. **`--blue` and `--orange` are plate names, not colour
names** — on cherry the second drum is pink and on blueprint it is chalk. The tokens keep those names because
every component rule in the stylesheet is written once against the plate, and renaming sixty call sites buys
nothing a comment does not.

Fat is the one ink allowed under 3:1 on its stock, because it is the one ink that always carries a first-drum
outline; the outline is what has to clear 3:1, and the test checks it there.

### What a new press has to do

**Define the whole token set, and pass the contrast check.** Both are enforced, not asked for:

1. `Press` in `src/theme.ts` has no optional fields, so a press that leaves anything out is a compile error.
2. `tests/theme.test.ts` measures every text token against every one of its three stocks with the grain
   composited, and every macro ink and the focus ring against its paper. Under 4.5:1 for text or 3:1 for a
   boundary and `make check` fails. It also holds the three relationships a press can get wrong *between* its
   own inks rather than against its stock: no macro ink within 24 RGB units of a text ink, the second drum at
   plate alpha clearing 2:1 against Ink, and no two presses sharing a stock, a stock texture or a slip.
3. `e2e/press.spec.ts` measures the same thing on **rendered pixels** — the grain layer really painted over the
   text, the second drum really multiplied or screened onto the stock — on body text and on the calories fill,
   for every press. The tokens alone read about 17% high on a light stock, which is what the grain costs.
4. `public/theme-boot.js` needs the press's stock and scheme, and `tests/theme.test.ts` fails the moment its
   table drifts from the one in `src/theme.ts`.

Measured, for the record: body text runs 5.4:1 (meadow) to 8.2:1 (blueprint) and the calories fill 4.1:1
(meadow) to 14.6:1 (blueprint), on rendered pixels.

### What changes with the press, and what does not

- **When the press is chosen.** `public/theme-boot.js` runs blocking in `<head>`, before the bundle that carries
  the stylesheet: the stock is on the root element at first paint, so a Night reader never gets a screenful of
  cream while 300KB of JavaScript parses. It carries one line per press — stock and scheme — and nothing else,
  because nothing but the stock is painted before the bundle mounts the app. It also carries the one-shot upgrade
  off the two-theme build's `lm-theme` key, and it looks its stock table up on a null-prototype object — as a
  plain literal, a stored `constructor` or `__proto__` came back truthy, `.slice` threw, and the uncaught error
  killed the rest of the script and cost the whole pre-paint press, which is the one thing it exists to protect.
  `src/ui/theme.ts` owns the press from then on and writes the rest of the token set onto the root.
- **The installed app's splash.** An installed PWA's standalone splash is painted from the *manifest's* colours,
  which the OS reads long before the document exists, so `<meta name="theme-color">` cannot reach it: one
  manifest meant a full screen of day cream ahead of a navy app at every cold launch on five of the six presses.
  `vite.config.ts` emits one manifest per press off the same table and `src/ui/theme.ts` points the document's
  `<link rel="manifest">` at the running press's copy.
- **`--blend`.** The second drum multiplies onto light stock and **screens** onto dark: ink on dark paper lightens
  what it lands on. Derived from the press's `scheme`; no component re-states its blend mode.
- **`--grain-ink` / `--grain-stock`, and the tile itself.** Dark specks on dark stock are mud, so a dark press's
  speck colour is pale — and pale specks on near-black stock are a far bigger excursion than dark specks on
  cream, so night runs at **0.1** against day's 0.4. Measured over their own stocks those match (1.18:1 vs
  1.14:1 speckle contrast); the 0.28 it started at read as sensor noise over every flat navy area. Newsprint
  runs the other way: 0.55 at a coarser frequency on a bigger tile, because that is what newsprint is.
  Blueprint's tile is not turbulence at all, it is a ruled 44px drafting grid. **The tile size and frequency are
  the press's too, not just the opacity** — day, night, cherry and meadow shipped as the identical turbulence at
  220/0.9 with four different opacities, which is one texture at four densities rather than four stocks;
  `tests/theme.test.ts` now fails if two presses rasterise the same tile. Which of the two grain layers a press
  prints on is derived from `grid`, and is the whole of §4's "The Grain Layer".
- **`--rule-weight`.** Multiplies every hand-ruled stroke the stylesheet draws — the bar outline and hatch, the
  fat ink's outline, the chart's axis, ticks, trend and predicted line — and every stroke in the CSS-referenced
  marks of `src/ink.ts`. Newsprint is 1.35; a smooth stock is 1. **Ceiling:** the component SVGs
  (`TabIcons.tsx`, `Marks.tsx`, `Badges.tsx`, `Doodles.tsx`) draw their weights as literal `stroke-width`
  attributes and do not pick it up, so newsprint's coarser press shows on the rules and the bars but not on the
  tab icons or the badge stamps. Moving them onto the token means `stroke-width="calc(1.8 * var(--rule-weight))"`
  on about thirty attributes, and `var()` inside an SVG presentation attribute has a history of not resolving in
  Safari — on an iPhone PWA the failure mode is every hand-drawn icon silently falling back to a 1px hairline.
  Not worth a cosmetic multiplier; if it is ever wanted, read the weight in Preact and pass it as a prop.
- **`--reg-x` / `--reg-y`.** How far this run slipped. Every off-register plate in the stylesheet is written
  `calc(2.5px * var(--reg-x))` rather than a literal pair, so each press misregisters by its own distance in its
  own direction. They all shipped identical — ten hard-coded px pairs, the same slip up-and-right on all six —
  which made the one mark the design calls its signature the one thing that did not change with the press.
- **The hand-inked art.** See below: one copy of the path data, re-inked per press.
- **`--orange-rgb` / `--paper-rgb`.** The off-register text-shadows and the sheet's paper veil are written as
  `rgb(var(--…) / a)` so they follow the press at whatever alpha the component asked for.
- **`--plate-k`.** An alpha plate mixes toward the stock, so the same orange that *lifts* on cream *darkens* on
  navy and prints brown — the opposite of what `--blend: screen` states. Every offset plate's alpha is written
  `calc(a * var(--plate-k))`, 1 on light stock and 1.7 on dark, so a plate stays lifted on both.
- **`--veil`.** The sheet's paper veil, `1 - grainStrength`, so its grain equals the page layer's on any press.

### The marks are drawn once, not once per press

A CSS-referenced SVG cannot read a custom property: it is a separate document with no access to the page's
tokens. The night press solved that with nine duplicate `*-night.svg` files. Six presses that way is
**fifty-four files of the same path data**, drifting apart one hand-edit at a time, so that is not what happens.

The path data lives once in `src/ink.ts` and the press's own inks are substituted into it, producing a
`url("data:image/svg+xml,…")` per mark that `src/ui/theme.ts` writes onto the root with the rest of the token
set. `src/ui/ink/` is gone. Six presses cost nine template strings, and `tests/ink.test.ts` fails if any mark
prints a hex that is not one of the running press's own.

Inlining them as Preact components was the first idea and it does not work for six of the nine: a `<select>`'s
chevron, a checkbox, `::-webkit-calendar-picker-indicator` and the fixed grain layer are painted by the browser,
with no element to put an `<svg>` in. A mark that arrives with the bundle arrives with the screen it is drawn on,
because this is a single-page app and nothing but the stock is painted before the bundle parses.

### Named Rules
**The Macro Ink Rule.** Calories are orange, protein blue, carbs teal, fat mustard, everywhere they appear: bars, swatches in the nutrient table, the targets panel, the protein figure on menu rows and stats. The name always sits beside the ink.

That last sentence is load-bearing, not a nicety: **the ink never carries the macro alone, because on four of the six presses two of the four macro inks do collapse under simulated dichromacy.** Measured on the rendered bar fills (grain and blend mode included), Viénot/Brettel/Mollon: cherry's calories and carbs sit at ΔE 7.2 under protanopia, newsprint's protein and carbs at ΔE 8.8, night's calories and fat at ΔE 9.9 under deuteranopia, blueprint's calories and carbs at ΔE 10.3. Day and meadow stay above ΔE 25 in both simulations. Four inks that are all distinct on all six presses under both simulations is not reachable while each press also keeps its own two drums, its own stock and 3:1 against that stock — so the name is the channel and the ink is the decoration, and every sweep of Tracker, Health and the nutrient table confirms the label is inline with its swatch. The upgrade, if this is ever not enough: `Swatch` in `src/ui/icons/Marks.tsx` is hand-drawn, so a different hand-inked mark per macro is four path strings and makes the four readable with no colour at all.

**The Two Drum Rule.** Anything decorative is the first drum or the second. The macro inks are data, not decoration. The first drum as protein data is always a solid plate; as decoration it is always a line or hatch.

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

Flat print. There are no soft shadows. Depth is a second plate: primary buttons, selected chips, the toast and the targets slip carry a hard second-drum offset (`box-shadow: calc(3px * var(--reg-x)) calc(3px * var(--reg-y)) 0 var(--orange)`, 2px for chips, 4px at 55% for the targets slip — the press's own slip, never a literal pair). Pressing a button moves it 1px onto its plate. A control that is unavailable says so with an unprinted plate and a dashed edge (`--paper-shade`, `--ink-soft`, the vocabulary the unearned badge cards already use), never with alpha: a blanket `opacity: .55` faded the label with the plate and put Add under 4.5:1 on every press for as long as the servings box was empty. Bottom sheets are a fresh sheet of the same grained stock (grain tile under a `--veil` paper veil, which is 1 minus the page layer's grain, so the two always match) over a blue ink wash (`rgb(30 52 112 / .35)`).

**The Grain Layer.** Two layers, and a press prints on exactly one of them. The tile itself is `--mark-grain`, built per press by `grain()` in `src/ink.ts` and handed to CSS as a `data:` URI (feTurbulence rasterised once, or a ruled grid on a drafting stock) — there is no `src/ui/ink/` any more, see §2.

- A **speckle** press inks `body::after`: fixed, `pointer-events: none`, `--grain-ink` opacity (0.4 day, 0.1 night), promoted with `will-change: transform`, over the type and over the tab bar like ink on the finished page.
- A **ruled** press (blueprint) inks `body::before` instead: absolute inside the body, under the type, `--grain-stock` opacity. A random speckle hides that the fixed layer does not move; a 44px ladder of rules does not. Welded to the viewport it stayed put while every line of type slid through it, which reads as a screen overlay laid on the app rather than as the sheet it is printed on — and it printed the grid over the fixed tab bar and its labels.

The tile's specks are dark with alpha, so alpha-over reads as multiply; a full-screen `mix-blend-mode` was tried and doubled repaint cost (e2e went from 21s to 45s with logout timeouts), so don't add it back. Never per element.

## 5. Components

### Hand-drawn marks
- Tab icons: `src/ui/icons/TabIcons.tsx`, one per tab (Menu, Tracker, Health, Progress, Profile). Blue line always; orange plate prints only on the active tab, and its label gets an orange underline. **All five are an object drawn inside the same hand-ruled rectangular frame** — the menu card, the calendar, the gauge plate, the vitals card, the ID card — so the bar reads as one set of drawings rather than four drawings and a pictogram. Health was a stock heart-plus-ECG glyph with no frame and with halves that reflected onto each other to within 0.2 user units; it is a vitals card now, a pulse under a header rule with the plate on the header band. Five tabs leave 64px each on a 320px phone, so the bar's buttons carry no side padding and set their label a notch down: at the token's 16px gutters "Progress" wrapped onto three lines and pushed the bar over the page. At 200% text the labels break with `hyphens: auto`, not `overflow-wrap: anywhere`, so "Pro-greso" still reads as a word.
- Arrows, close, plus, minus, swatches: `src/ui/icons/Marks.tsx`. Badge stamps: `src/ui/icons/Badges.tsx`, one hand-drawn mark per badge, never reused between two of them.
- Doodles: `src/ui/icons/Doodles.tsx`. Bowl (line boil) on the Tracker's empty state and Login; utensils on empty menu/search and on Health's What to eat; scale on no weigh-ins. A doodle's softer plates go through `--plate-k` like every other alpha plate (`.plate-soft`, `.plate-wash` in the stylesheet), never a bare SVG `opacity`: written as an attribute the utensils plate darkened to brown on the night stock instead of lifting, which is the exact failure the token exists for. An empty state wraps and its drawing may shrink — at 200% text the Spanish line could not fit beside a fixed 150px doodle and ran off the page, which widens the layout viewport and drags the fixed tab bar out with it.
- CSS-referenced ink (rules, pencil dividers, chevron, checkbox, search glass, date calendar, grain): `src/ink.ts`. One copy of the path data, inked from the running press and handed to CSS as a `data:` URI — see §2, "The marks are drawn once, not once per press". A new mark is written there, once, and it is right on all six presses for free.
- **Drawing rules:** write path data by hand; coordinates carry decimals and no line is straight or closed perfectly; keep a blue key stroke and, where it earns it, an orange stroke offset 1 to 2px with multiply. No icon libraries, no `<rect>`/`<circle>` stand-ins for drawn things.

### Line boil
Three hand-inked frames of the same doodle, swapped at ~8fps with `step-end` visibility keyframes (`.boil-1/2/3`, 0.36s cycle). `prefers-reduced-motion` freezes frame 1. Only on doodles.

### Hand-drawn bars (`InkBar`)
Fixed hand-drawn outline; the fill's right edge carries a hand-picked wobble that moves with the amount; the part still left is hatched in blue. Over target: the fill runs full and the cross-hatch is **knocked out of the plate** — stroked in `--paper`, so its gaps print the stock — and the text says "over". Overprinted in an ink instead it was invisible on 14 of the 24 press/bar pairs, worst at 1.13:1 for a chalk hatch on blueprint's chalk calories fill, because the one ink dark enough to read on a light press's fill is the lightest ink on a dark one. Knocked out, the mark's contrast is the fill-against-stock ratio the token test already holds at 3:1 for every macro ink on every press, so there is no new token to keep honest. `role="progressbar"` with value text.

The three macro rows share one subgrid so the bars align, but the bar's track is never allowed to starve: it has a 3rem floor, and under 16em of the row's own width (a container query, because media-query `em` cannot see the page's font-size) the row reflows to two lines, name and number above, bar full width below. A bar that has printed its aria but not its ink is a bug the e2e catches at 320px with 32px root text.

### Tracker hero
Label ("calories left today" / "target passed today" / "calories eaten today" with no targets), the stamped numeral (plus "over" when over), "**eaten** eaten of **target**" (no unit; the label already says calories), then the full-width calories InkBar in orange. Macro rows below share one subgrid so the three bars align.

### Buttons
- **Shape:** hand-drawn wobble radius (`255px 12px 225px 10px / 12px 225px 10px 255px`), 1.5px ink border, 44px tall.
- **Primary:** blue plate, paper text, orange offset plate.
- **Secondary:** raised paper, ink text. **Danger:** over-red text and border. **Link:** ink text with a 2px orange underline. **Stamp:** Bungee in ink with an orange off-register text-shadow (the "Today" jump, hung under the next arrow so the date nav never shifts).

### Sheets
A scrolling body with the primary plate (and Delete) printed in a footer below it, outside the scrollport, over a hand-drawn rule. Never sticky inside the scroller: with the on-screen keyboard up a sticky plate sits on top of the Meal select and, on a small phone, the whole servings stepper. Long dining-hall names in caps Bungee clamp to three lines so the controls stay above the fold; the full name is still the dialog's accessible name.

**A food sheet is a nutrition label, and it has to read like one the moment it opens.** Calories and the three macros in their inks are printed above the fold on a 390×844 phone and on a 320×568 one — measured with `getBoundingClientRect` against the scrollport's bottom edge (`e2e/today.spec.ts`), never judged by eye. Three things buy that height. Hall, source and portion set as one wrapping run of meta (`.sheet-meta`), not three stacked paragraphs each costing a sheet gap; a hairline divides them on the page while the paragraphs still separate the runs for a screen reader. Servings and Meal share one line (`.sheet-controls`), and Meal drops under the stepper at 320px or once the reader's text grows rather than squeezing the select to its chevron. The table itself is tight — 3px rows, pencil hairlines, figures right-aligned in tabular numerals, one thick rule under Calories, which is the only enlarged figure.

**Per serving is the second read.** At one serving it is the same seven numbers as the total, so only one column prints and the header row goes with it; the caption already says how many servings the column counts. Past one serving the second column appears, smaller and in Soft Ink, so it costs width and not height.

### Toast
One slip of blue stock, gutter to gutter and then shrunk to its text (never pinned to half the viewport). It is always in the DOM and prints only when it has something to say. A plain confirmation fades after 3s; a delete does not, because its Undo is the only way back and a clock on the sole path to a function is a WCAG failure. It stays until Undo, Dismiss, or the next toast, and the Undo button names what it would restore.

### Chips (hall / day / meal / chart view / range / sex / goal / press / language)
Printed radio stamps: wobble border, bold Courier; selected is the blue plate with a 2px orange offset. **Every one-of-N pick in the app is a stamp**, including the chart view, which used to be a native `<select>` printed directly above the range stamps — two idioms for the same job, one on top of the other.

Two behaviours. A **browsing strip** (hall, day, meal) scrolls horizontally, full-bleed: its length is the feed's, not a set the reader has to see all of. A **settings group** (`.chips-wrap`: chart view, range, sex, goal, press, language) wraps to a second row instead, and its stamps give up `nowrap`.

The two are also **printed at different sizes**, and only the strips are small: three of them stack on the Menu over the thing the screen is for, where a settings group is read once on its own page. A press stamp carries a drawing as well as a word — see Appearance below. A strip's stamp is 32px of ink at 0.85rem, and **the target is still 44x44** — carried by the radio itself (`block-size: 44px`, centred on the stamp, and `inset-inline: -1.5px` for the stamp's own border, since `inset` lands on the padding box and a 44px stamp was otherwise a 41px target). It is the input and not a pseudo-element because a transparent box laid over the control gets clicks reported as intercepted. The strip's 6px padding is exactly the 6px the target overhangs each way, so the scroller contains it instead of clipping it, and 6px between strips leaves two rows' targets touching rather than overlapping. Stated as a size, not as negative insets: insets made the overhang lopsided by the border's width and hung the last pixel of the meal strip under the sticky station header, which paints over it. The strip hides its scrollbar, so an option pushed off the edge — "All" at 200% text, "Según el teléfono" in Spanish — was a setting with no cue that it existed at all. The group is named by `aria-label` on the `<fieldset>`, never by a visually-hidden `<legend>`: Chromium exposes a legend both as the group's name and as a text node inside it, so browse mode reads the name twice.

Day chips stack (`.chip-stack`): the numeric date over a smaller caps weekday ("9/19" / "SAT"). Never a relative word
— "Today" is wrong on a phone left open past midnight and a bare weekday does not say which week. The chip's
accessible name starts with what the chip prints and then spells it out ("9/19 Sat, Saturday, September 19"),
carried by `aria-label` on the input. It must start with the visible text: a name that only spelled the date out
failed WCAG 2.5.3, and "tap 9/19" and "tap Sat" both missed for anyone driving the app by voice. A chip with no `sub` keeps its bare text node: wrapping that label in a span
puts the invisible input over the click target.

### Menu head
Everything above the first food is on a budget, because the food is what the screen is for. It was 500px of a
390x844 phone — 59% of the viewport, four food rows — and it is 376px (44.6%, five rows) across every hall, day
and meal the feed offers. `e2e/menu.spec.ts` holds it: the fixed part (search row, UT-names note, three strips)
is asserted at 350px, and the hours line is measured out of that number because its length is the hall's.

Two changes bought it, and both are cuts rather than compressions. The search field and the **`+ Custom food`
stamp share one line** (`.menu-find`): both are how you reach a food that is not in front of you, and apart they
were two blocks of chrome between the search and the filters belonging to neither. The field's basis is `10rem`
and not `12rem` because the Spanish stamp is "Alimento propio" — at 12rem the row wrapped on a 390px phone in
Spanish and cost exactly what putting them on one line saved. At 320px, and at the reader's larger text, it wraps
on purpose. Then the three strips print small (see Chips), the hours line is set to match them at 0.8rem instead
of 0.9, and the first station's header drops its 18px top margin, which only ever existed to separate it from the
station above it.

Hall, day and meal stay **three strips, not two**. Putting hall and meal on one row is the obvious saving and it
does not survive the measurement: hall plus meal is ~416px of stamps against 358px of page, so "Dinner" sits off
the right edge of a strip whose scrollbar is hidden — the exact failure `.chips-wrap` exists to prevent. A row
saves 50px and hides a meal; the stamps themselves gave up 30px and hide nothing.

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

### Health
A page you read, not a dashboard. Five sections (Today, Last 7 days, Macro balance, Diet quality, What to eat),
each a Bungee `h2` over a hand-drawn rule, and no stamped numeral anywhere: the Tracker owns the day's hero and a
screen gets one at most. Every sentence on the screen comes from `src/health.ts`, which is pure and fully covered;
the screen decides nothing except which line to print when the feed has nothing to suggest. Each section is named
by `aria-labelledby` pointing at its own `<h2>`, never by a duplicate `aria-label`: region navigation used to read
the name and then read the same words again as the heading, and one region was named "Goal adherence" while the
heading on screen said "Last 7 days".

Rows in Macro balance and Diet quality are one run of inline text (name in ink, figure in Soft Ink) over a dashed
pencil rule, not two flex columns: at 320px a column layout wrapped the number into a narrow box with a hanging
indent, and these read as sentences anyway. The macro swatch sits beside the macro's name as it does everywhere
else; fiber, sodium and sugar print no ink, because they are not macros and the macro inks mean one nutrient each.

What to eat reuses the Menu's food row and the food sheet, so adding from Health is the same three taps as adding
from the Menu. Each pick carries its hall, station, service and when it is served, in words ("Dinner · now",
"Dinner · from 4:30pm"), and the macro that earned it prints in its own ink beside its name. Opening the sheet
also pulls the viewed day back to today, because a suggestion is about the gap that is still open today.

The copy is flat on purpose: no streaks, no badges, no grades, no "you failed". The week is reported with its
numbers and the count of days behind them ("Short on 5 of 6 logged days, averaging 118 g against 170 g"), a
partial week always says how partial it is ("3 of 7 days logged" — printed in Diet quality too, whose per-day and
per-1,000-kcal figures rest on the same days), and a day with nothing logged is absent from every average rather
than counted as a zero. An empty account gets one line per block saying what that block will read once there is
something to read, never a column of zeros.

**The week is the seven complete days behind today.** Today is still being eaten; counted as a finished day it
reported a large fabricated deficit and three "Short" verdicts for most of every day. Today has its own section.
A diet signal (low fiber, high sodium) prints on however many days there are, but only gets to re-rank the food
suggestions once it rests on at least three: one light day was enough to read "low fiber" and turn the whole list
into fruit.

**What the suggestions are allowed to credit.** Only the macros that are actually the gap: a macro counts only
while it is proportionally shorter than protein is, so while protein is the widest open gap carbohydrate and fat
earn nothing, and once protein is met the rule reverses and they are credited normally. Without it a fresh day
credits all three equally, and because fat targets are small next to protein targets, fat won the "why" line on
most real dishes — the app's stated reason for suggesting a chicken breast was its fat — and two apples and two
oranges outranked every protein source on a day with 150 g of protein still owed. The list is deduplicated on the
*dish*, never on UT's recipe number: UT publishes one dish under a different number per station and per hall, so
keying on the number filled two of six slots with the same food. When the hours feed cannot be read every hall
reads as "unknown", which the suggestions take as serving now, so the section prints the Menu's own "Hours
unavailable" rather than quietly recommending food from a hall that is shut.

### Profile sections
A row of printed section stamps over the page they open: Achievements, Goals, Account, Appearance, Dining hours,
Data. The stamps are the same printed radio marks as every other one-of-N pick in the app (Courier 700, wobble
border, blue plate with the orange offset when selected) rather than a second navigation bar, and the row is a
real `role="tablist"`: one tab stop, arrow keys along it with a wrap, Home and End at its ends, `aria-selected`
on the stamp and the panel named by it. Each panel keeps a visually-hidden `<h2>` so heading navigation still
walks the tab's pages; the stamp above says the same word on screen.

Which page opens: **Achievements**, unless this device was left on another one (`lm-profile-section` in
`localStorage`, per device like the press and the language) — or unless there is no profile yet, because first
run is the one arrival the app sends here on purpose, and it sends the reader to Goals. That decision is taken
once per visit and then held, so saving the first profile does not move the page out from under the thumb.

At 320px the row scrolls sideways with its scrollbar left on and a gutter at the end, so a stamp past the edge is
visibly reachable; hiding the overflow is not an option. The dining-hours week still prints as one two-column
table per hall (day, hours), which fits a 320px page.

### Appearance
The press picker is the same printed radio stamps as every other one-of-N pick in the app, with one difference:
**each stamp prints the press it names** — that press's own stock with its own two drums laid down off register,
drawn by `PressSwatch` with the inks written as attributes rather than tokens, because a `var()` here would print
six copies of the press the page is already running. The picked stamp also carries a hand-inked tick, so "this
one" is said by a shape and not only by the plate; on the blue plate the tick inks in the stock, because in
`--ink` it was 1.6:1 and effectively unprinted.

Seven stamps (six presses and Match phone) wrap to as many rows as the page needs, at 320px and in both
languages. **Match phone prints two more groups under it** — which press for light, which for dark — and only
then: under a named press they would be two rows of stamps that change nothing the reader can see. Those two
carry a visible `h3` and the group points at it with `aria-labelledby`, rather than repeating the words as an
`aria-label`, for the same reason the Health sections do.

The language group sits under all of it, and every choice on the page is kept per device in `localStorage`.

### Achievements
Sixteen hand-inked **stamps** on a sheet, led by one plain line ("7 of 16 earned") and a note that says there is
no streak to break. Earned stamps print in full: both drums, the card on raised paper with the hard orange
offset plate, and the date they were earned underneath. Unearned ones are the same drawing left unprinted — key
stroke in Soft Ink, no second drum, a dashed box, and honest progress under it ("4 of 7"). State is never ink
alone: every card says its date or its count in words, so a new account reads as sixteen stamps waiting rather
than as a broken screen.

Each badge has its own mark in `src/ui/icons/Badges.tsx`, drawn under the same rules as every other mark: written
by hand, nothing reused between two badges, no clip art and no emoji.

The rules live in `src/achievements.ts`, pure and fully covered, and they follow PRODUCT.md's 2026-09-20 note:
computed only from logged rows, weigh-ins and the profile (a badge whose rule cannot be checked from those is not
there at all), never taken away, never a streak, and never paid for eating less — the cut badge is for landing on
the plan, with a floor under it.

### Language
Two languages, English and Spanish, chosen by a chip group in Profile > Appearance under the press's: a language
switch is not a special control, so it is the same printed radio stamp as hall, day, meal and press. Each option
names itself in itself (English, Español) and never translates, because the one reader who needs the list is the
one who cannot read the page it is printed on. The choice lives in `localStorage` per device, like the press, and
sets `<html lang>` so a screen reader changes voice with the app.

Every string comes from `src/i18n`: one dictionary per locale, `keyof typeof en` as the key type, so a missing or
misspelt key is a compile error and `tests/i18n.test.ts` holds the Spanish dictionary to exactly the English key
set. The modules that write prose — `health.ts`, `progress.ts`, `menu/hours.ts`, `dates.ts` — take the translator
as an argument and write no English of their own; `goals.ts` now returns the *field* that is wrong rather than a
sentence, because the form used to route each message to its input by reading the English text.

Numbers, dates and times move with the words, through `Intl` on the active locale rather than the device's:
Spanish prints 1.234 and 1,5 where English prints 1,234 and 1.5, writes 19/9 where English writes 9/19, and reads
a 24-hour clock ("abre mañana a las 9:00") where English reads UT's 12-hour one ("opens tomorrow 9:00am"). The
exceptions are deliberate: a year and the bounds in a validation message print as bare digits in both languages,
because a limit is not a quantity, and `<input type="date">` keeps the browser's own format, which is the
platform's to decide.

**UT's words are not translated, in any locale.** Food names, hall names, station names and the diet and allergen
legends print exactly as UT publishes them, in English. Said once, in Soft Ink under the Menu's search box, which
is where a Spanish reader first meets a screen of English dish names.

### Inputs
Printed form boxes on raised paper, wobble-sm corners, 16px text, hand-drawn chevron on selects, hand-drawn box and tick for checkboxes. Invalid: 2px over-red border plus the message linked by `aria-describedby`, on the one field the message is about — never pooled across the form, or a wrong current password paints the new-password box red too. Focus everywhere: 2.5px orange outline; on the blue toast plate it switches to paper (orange on blue is 1.75:1). Date inputs use a hand-drawn calendar (`ink/calendar.svg`) in place of the browser picker glyph.

### Lists
Station and meal headers are Bungee with a hand-drawn blue rule, sticky on Menu. Rows are divided by a dashed pencil rule. Food name: Courier 700 in Deep Ink. Portion/servings: Courier 400 in Soft Ink, smaller.

### Progress
Change over time, so the chart comes first and the weigh-in form goes last. Under the chart are the four figures
the chart cannot state exactly (trend weight, the change and the days it happened over, average calories over the
days actually logged, days logged) and then the adaptive-TDEE line, which is the same maintenance the prediction
runs on. The stats grid carries no vertical rules between its cells: it reflows to one, two or three columns with
the reader's text size, and a rule drawn per cell lands inside a row as often as between two. It carries one rule,
at its foot: the Summary heading already draws one at its own bottom edge, and a second copy of the same mark 18px
under it printed as a mistake rather than as misregistration. Each tile is written value-then-label, in that order
in the DOM as well as on the page — it used to be written label-first and flipped back with `column-reverse`, so
what was read and what was painted disagreed.

Every number on the screen comes from `src/progress.ts`, which is pure and covered. The prediction always prints
what it assumed, because a line drawn from a maintenance estimate is only as good as that estimate — and it says
*which* maintenance, because an adaptive estimate learned from the reader's own weight and intake and a
Mifflin-St Jeor formula guess are not the same claim. The change is labelled "(smoothed)" because it is the
trend's change, not the scale's; the trend itself advances per elapsed day rather than per weigh-in, or weighing
in every four days gives the smoother a two-month time constant and a real 2.8 lb over three weeks prints as 0.7.

### Chart
One chart on Progress, switched between three views by a chip group (Weight, Daily calories, Predicted vs actual)
with the range chips under it. Blue dots drawn as lumpy ink blobs (four quadratic curves, turned per index),
smoothed lines as freehand cubics with hand-picked nudges in orange multiply offset (1.5, -1), wobbly dashed
gridlines and a hand-drawn L axis. Anything predicted rather than measured is a **dashed blue** line: blue as
decoration is linework, and the dash is what separates it from the orange trend for a reader who cannot separate
the two inks. A key under the chart names every mark in words.

Every chart carries the same numbers as a visually-hidden table, one row per date and one column per mark, because
an SVG is not readable by a screen reader and a picture is not an alternative to the data.

**The chart's type is sized in user units, so it cannot inherit the reader's text size the way the page does.**
The screen reads the root font size and hands it to `chartGeometry`, which lays the axis out for that size: the
left gutter is the widest y label (Courier is monospace, so a label's width is known without measuring it), and
the count of date labels and gridlines drops as the type grows. At 200% it prints two dates and two gridlines
rather than five of each on top of each other. The date labels are not centred in equal slots: the first is
start-anchored at the left edge of the plot and the last end-anchored at the right, so each of those takes a whole
label width *inside* the frame rather than half, and the budget charges them for it. Budgeting as though every
label were centred left the final gap at about a quarter of the others and the last two dates read as one run.

The prediction carries a point on every day between the weigh-in it starts from and the last day logged, holding
the previous value across days with nothing logged. The line is one cubic per pair of points, so a series that
simply skipped a gap drew a smooth twenty-day slope from one logged day to the next and sold twenty days of
evidence that did not exist — the opposite of what the note under it says.

## 6. Do's and Don'ts

- **Do** keep numbers the hero: one stamped numeral per screen at most.
- **Do** say state in words: "over", "Couldn't reach UT dining", "changes waiting to sync".
- **Do** check every new text color against paper at 4.5:1 **with the grain layer composited over it**, on **every** press — the tokens alone read about 17% high on a light stock.
- **Do** let a mark grow with the user's text: reserve room with `min-height`, not `height`, and reflow a row before a track can collapse.
- **Don't** put a clock on the only way to undo something, or `aria-label` on a paragraph (the role does not take a name; use a section).
- **Don't** auto-invert. Every press is its own set of tokens, inked on purpose; a filter over the day press is not one.
- **Don't** add a press without the whole token set and both contrast checks, or add a colour or a blend mode for one press only: all six, or none. A mark is added once, in `src/ink.ts`, never per press.
- **Don't** use orange for text below 18px bold.
- **Don't** use teal or mustard for anything but their macro, fill anything but protein with solid blue in a data mark, or show a macro ink without its name.
- **Don't** pull icons from a library or draw marks with perfect primitives.
- **Don't** add soft shadows, gradients, glass or side-stripe borders.
- **Don't** animate anything else on a loop; the boil is for doodles only.
- **Don't** translate UT's own words, or build a sentence by gluing translated fragments together: one key per whole sentence, with `{slots}` for the figures.
- **Don't** use em dashes in copy.
