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
- Tab icons: `src/ui/icons/TabIcons.tsx`, one per tab (Menu, Tracker, Health, Progress, Profile). Blue line always; orange plate prints only on the active tab, and its label gets an orange underline. **All five are an object drawn inside the same hand-ruled rectangular frame** — the menu card, the calendar, the gauge plate, the vitals card, the ID card — so the bar reads as one set of drawings rather than four drawings and a pictogram. Health was a stock heart-plus-ECG glyph with no frame and with halves that reflected onto each other to within 0.2 user units; it is a vitals card now, a pulse under a header rule with the plate on the header band. Five tabs leave 64px each on a 320px phone, so the bar's buttons carry no side padding and set their label a notch down: at the token's 16px gutters "Progress" wrapped onto three lines and pushed the bar over the page. At 200% text the labels break with `hyphens: auto`, not `overflow-wrap: anywhere`, so "Pro-greso" still reads as a word.
- Arrows, close, plus, minus, swatches: `src/ui/icons/Marks.tsx`.
- Doodles: `src/ui/icons/Doodles.tsx`. Bowl (line boil) on the Tracker's empty state and Login; utensils on empty menu/search and on Health's What to eat; scale on no weigh-ins. A doodle's softer plates go through `--plate-k` like every other alpha plate (`.plate-soft`, `.plate-wash` in the stylesheet), never a bare SVG `opacity`: written as an attribute the utensils plate darkened to brown on the night stock instead of lifting, which is the exact failure the token exists for. An empty state wraps and its drawing may shrink — at 200% text the Spanish line could not fit beside a fixed 150px doodle and ran off the page, which widens the layout viewport and drags the fixed tab bar out with it.
- CSS-referenced ink (rules, pencil dividers, chevron, checkbox, search glass, grain): `src/ui/ink/*.svg`. Colors are baked in as hex because an image cannot read CSS tokens; keep them in step with the tokens above.
- **Drawing rules:** write path data by hand; coordinates carry decimals and no line is straight or closed perfectly; keep a blue key stroke and, where it earns it, an orange stroke offset 1 to 2px with multiply. No icon libraries, no `<rect>`/`<circle>` stand-ins for drawn things.

### Line boil
Three hand-inked frames of the same doodle, swapped at ~8fps with `step-end` visibility keyframes (`.boil-1/2/3`, 0.36s cycle). `prefers-reduced-motion` freezes frame 1. Only on doodles.

### Hand-drawn bars (`InkBar`)
Fixed hand-drawn outline; the fill's right edge carries a hand-picked wobble that moves with the amount; the part still left is hatched in blue. Over target: the fill runs full and dark cross-hatch overprints it, and the text says "over". `role="progressbar"` with value text.

The three macro rows share one subgrid so the bars align, but the bar's track is never allowed to starve: it has a 3rem floor, and under 16em of the row's own width (a container query, because media-query `em` cannot see the page's font-size) the row reflows to two lines, name and number above, bar full width below. A bar that has printed its aria but not its ink is a bug the e2e catches at 320px with 32px root text.

### Tracker hero
Label ("calories left today" / "target passed today" / "calories eaten today" with no targets), the stamped numeral (plus "over" when over), "**eaten** eaten of **target**" (no unit; the label already says calories), then the full-width calories InkBar in orange. Macro rows below share one subgrid so the three bars align.

### Buttons
- **Shape:** hand-drawn wobble radius (`255px 12px 225px 10px / 12px 225px 10px 255px`), 1.5px ink border, 44px tall.
- **Primary:** blue plate, paper text, orange offset plate.
- **Secondary:** raised paper, ink text. **Danger:** over-red text and border. **Link:** ink text with a 2px orange underline. **Stamp:** Bungee in ink with an orange off-register text-shadow (the "Today" jump, hung under the next arrow so the date nav never shifts).

### Sheets
A scrolling body with the primary plate (and Delete) printed in a footer below it, outside the scrollport, over a hand-drawn rule. Never sticky inside the scroller: with the on-screen keyboard up a sticky plate sits on top of the Meal select and, on a small phone, the whole servings stepper. Long dining-hall names in caps Bungee clamp to three lines so the controls stay above the fold; the full name is still the dialog's accessible name.

### Toast
One slip of blue stock, gutter to gutter and then shrunk to its text (never pinned to half the viewport). It is always in the DOM and prints only when it has something to say. A plain confirmation fades after 3s; a delete does not, because its Undo is the only way back and a clock on the sole path to a function is a WCAG failure. It stays until Undo, Dismiss, or the next toast, and the Undo button names what it would restore.

### Chips (hall / day / meal / chart view / range / sex / goal / theme / language)
Printed radio stamps: wobble border, bold Courier; selected is the blue plate with a 2px orange offset. **Every one-of-N pick in the app is a stamp**, including the chart view, which used to be a native `<select>` printed directly above the range stamps — two idioms for the same job, one on top of the other.

Two behaviours. A **browsing strip** (hall, day, meal) scrolls horizontally, full-bleed: its length is the feed's, not a set the reader has to see all of. A **settings group** (`.chips-wrap`: chart view, range, sex, goal, theme, language) wraps to a second row instead, and its stamps give up `nowrap`. The strip hides its scrollbar, so an option pushed off the edge — "All" at 200% text, "Según el teléfono" in Spanish — was a setting with no cue that it existed at all. The group is named by `aria-label` on the `<fieldset>`, never by a visually-hidden `<legend>`: Chromium exposes a legend both as the group's name and as a text node inside it, so browse mode reads the name twice.

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
Folded pages: a `<details>` per section with its `<h2>` inside the `<summary>`, so the heading is in the
accessibility tree whether or not the page is unfolded, and the screen is never one run of unlabelled fields. Only
Goals is unfolded on arrival. The fold marker is the hand-drawn chevron, turned 90 degrees when shut. The dining-hours
week prints as one two-column table per hall (day, hours), which still fits a 320px page.

### Language
Two languages, English and Spanish, chosen by a chip group in Profile > Appearance under the theme's: a language
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
- **Don't** translate UT's own words, or build a sentence by gluing translated fragments together: one key per whole sentence, with `{slots}` for the figures.
- **Don't** use em dashes in copy.
