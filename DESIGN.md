---
name: Longhorn Macros
description: UT dining menu to calorie and macro log, read like a kitchen scale.
colors:
  burnt-orange: "oklch(0.578 0.155 49)"
  burnt-orange-ink: "oklch(0.53 0.15 49)"
  burnt-orange-pressed: "oklch(0.52 0.15 49)"
  on-burnt-orange: "oklch(1 0 0)"
  tray-white: "oklch(0.985 0.002 49)"
  surface: "oklch(1 0 0)"
  surface-recessed: "oklch(0.955 0.004 49)"
  ink: "oklch(0.22 0.012 49)"
  ink-quiet: "oklch(0.48 0.012 49)"
  hairline: "oklch(0.905 0.005 49)"
  control-stroke: "oklch(0.66 0.01 49)"
  over-red: "oklch(0.5 0.18 27)"
  over-red-wash: "oklch(0.955 0.025 27)"
  dark-burnt-orange: "oklch(0.72 0.15 52)"
  dark-burnt-orange-ink: "oklch(0.74 0.14 52)"
  dark-on-burnt-orange: "oklch(0.18 0.02 49)"
  dark-bg: "oklch(0.17 0.006 49)"
  dark-surface: "oklch(0.215 0.007 49)"
  dark-surface-recessed: "oklch(0.255 0.008 49)"
  dark-raised: "oklch(0.36 0.009 49)"
  dark-ink: "oklch(0.95 0.004 49)"
  dark-ink-quiet: "oklch(0.74 0.01 49)"
  dark-hairline: "oklch(0.29 0.008 49)"
  dark-control-stroke: "oklch(0.53 0.01 49)"
  dark-over-red: "oklch(0.76 0.14 25)"
  dark-over-red-wash: "oklch(0.26 0.05 25)"
typography:
  hero:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.025em"
    fontFeature: "tnum"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  sheet: "20px"
spacing:
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s5: "24px"
  s6: "32px"
  s7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.burnt-orange}"
    textColor: "{colors.on-burnt-orange}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.burnt-orange-pressed}"
    textColor: "{colors.on-burnt-orange}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-recessed}"
  button-link:
    textColor: "{colors.burnt-orange-ink}"
    typography: "{typography.label}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.over-red}"
    rounded: "{rounded.md}"
  segmented-track:
    backgroundColor: "{colors.surface-recessed}"
    rounded: "{rounded.lg}"
    padding: "3px"
  segmented-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "11px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "48px"
  sheet:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sheet}"
    padding: "8px 16px 16px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.tray-white}"
    rounded: "{rounded.lg}"
    height: "48px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-quiet}"
    height: "56px"
  tab-bar-current:
    textColor: "{colors.burnt-orange-ink}"
---

# Design System: Longhorn Macros

## 1. Overview

**Creative North Star: "The Kitchen Scale"**

A good kitchen scale has one big readout, a few quiet buttons, and nothing else. It is read in a glance, trusted without thinking, and never congratulates anyone. Longhorn Macros is built to that standard. The scene it serves: a student in the J2 lunch line under flat fluorescent light, tray in one hand, thumb on the phone, needing "how much is left today" before the line moves; and again at 11 pm in a dim dorm room, reviewing the day. Light theme is tuned for the bright hall (near-white, high ink contrast); dark theme is a designed peer for the dim room, not an inversion.

Numbers are the hero. Every figure is tabular so columns line up and digits don't jitter as totals change. The calorie readout on Today is the one large element in the app; everything else steps down to a tight product scale. Structure comes from hairlines and spacing, not boxes: lists are ruled, sections are separated by a 1px line and 24 to 32px of air. Burnt orange is the UT nod, used on the primary action, the current tab and progress fills, and nowhere decorative.

This system explicitly rejects MyFitnessPal clutter (ads, dense menus, every screen shouting), the generic SaaS dashboard (card grids, gradient accents, hero-metric blocks), the official UT website (institutional portal, heavy branding), and gamification (streaks, badges, confetti, guilt copy).

**Key Characteristics:**
- One hero instrument per screen; everything else is quiet.
- Restrained color: tinted neutrals, burnt orange at or under 10% of any screen, red only for "over".
- One type family (the platform UI face), hierarchy from weight and size, tabular figures everywhere.
- Ruled lists and hairlines instead of cards; one bordered panel (Your targets) where a grouped readout earns it.
- 44px minimum tap targets, 48px for primary actions and inputs, 16px inputs so iOS never zooms.

## 2. Colors: The Tray Palette

Neutrals carry a whisper (chroma 0.002 to 0.012) of the burnt-orange hue 49 so grays feel related to the accent without reading as cream; burnt orange and one red are the only saturated colors.

### Primary
- **Burnt Orange** (`oklch(0.578 0.155 49)`, #BF5700): fills only. Primary buttons, progress-bar fills, the current-tab indicator, checkbox and focus ring. White on it is 4.59:1.
- **Burnt Orange Ink** (`oklch(0.53 0.15 49)`, #AD4A00): burnt orange when it has to be text on the light background (link buttons, current-tab label). 5.35:1 on Tray White; #BF5700 itself is only 4.39:1 there, so it never sets text.
- **Dark Burnt Orange** (`oklch(0.72 0.15 52)`) with **Dark On Burnt Orange** text (`oklch(0.18 0.02 49)`, 7.26:1): the same roles in dark mode, lifted in lightness so it glows slightly rather than muddying.

### Neutral
- **Tray White** (`oklch(0.985 0.002 49)`): page background. Deliberately near-achromatic; not cream.
- **Surface** (`oklch(1 0 0)`): sheets, inputs, the targets panel.
- **Surface Recessed** (`oklch(0.955 0.004 49)`): the second neutral layer. Segmented-control tracks, info banners, notices, badges.
- **Ink** (`oklch(0.22 0.012 49)`): all primary text and numbers. 16.6:1.
- **Ink Quiet** (`oklch(0.48 0.012 49)`): labels, units, meta lines, station headers, placeholders. 6.3:1 on Tray White, 5.75:1 on Surface Recessed.
- **Hairline** (`oklch(0.905 0.005 49)`): list rules, section dividers, empty bar tracks.
- **Control Stroke** (`oklch(0.66 0.01 49)`): input and secondary-button borders, 3.1:1 against Surface so controls are identifiable (WCAG 1.4.11).
- Dark counterparts: bg `oklch(0.17 0.006 49)`, surface `0.215`, recessed `0.255`, raised (selected segment) `0.36`, ink `0.95`, ink quiet `0.74` (8.3:1), hairline `0.29`, control stroke `0.53`.

### State
- **Over Red** (`oklch(0.5 0.18 27)`; dark `oklch(0.76 0.14 25)`): the only alarm color. "kcal over" label, over-target bar fill, over macro values, rejected-sync banner text, destructive buttons, field errors. Always paired with words ("over", "rejected"), never color alone.
- **Over Red Wash** (`oklch(0.955 0.025 27)`; dark `oklch(0.26 0.05 25)`): background for the rejected-sync banner and destructive-button hover.

### Named Rules
**The One Voice Rule.** Burnt orange covers 10% or less of any screen. It marks the next action, the current place, and progress. It never decorates a heading, border or background.

**The Honest Over Rule.** Going over a target turns the unit label and bar red; the big number stays ink. Over is information, not a scolding.

## 3. Typography

**Display Font:** none. **Body Font:** system-ui (SF Pro on iPhone and Mac, Segoe UI on Windows, Roboto on Android). No web font is shipped: the CSP is `'self'` only, and the platform face is the best-hinted tabular sans on every device the app runs on.

**Character:** One family, weight contrast doing the work of a pairing. 400 for reading, 500 for labels, 600 to 700 for titles and figures. `font-variant-numeric: tabular-nums` is set on `:root`, so every number in the app is tabular by default.

### Hierarchy
- **Hero** (650, 3.5rem, line-height 1, -0.025em): the calories-left readout on Today. Exactly one per app.
- **Headline** (700, 1.5rem, 1.2, -0.01em): screen titles (Menu, Progress, Goals) and the Today date title.
- **Title** (650, 1.25rem, 1.25): sheet titles, stat values, target values, the weight trend figure.
- **Body** (400, 1rem, 1.45): food names, form values, prose. Section headings (Log, Weight, Last 7 days, Your targets) use body size at 600.
- **Label** (500, 0.875rem): field labels, meta lines, station headers, segmented options, tab labels.
- **Caption** (500, 0.75rem): stat and target labels, chart key, badges.

Scale ratio is about 1.2 per step (0.75, 0.875, 1, 1.25, 1.5), then a deliberate jump to 3.5 for the hero.

### Named Rules
**The Tabular Rule.** Every number is tabular. Never turn tabular figures off to make a number "look nicer".

**The Sentence-Case Rule.** No all-caps eyebrows. Station headers and group labels are sentence case at label size in Ink Quiet.

## 4. Elevation

Flat by default. Depth comes from tone (Tray White page, Surface Recessed tracks, Surface sheets) and hairlines. Shadows appear only on things that float above the page: the bottom sheet, the toast, and the selected segment.

### Shadow Vocabulary
- **Float** (`0 1px 2px oklch(0.22 0.012 49 / 0.08), 0 4px 16px oklch(0.22 0.012 49 / 0.06)`; dark uses black at 0.4 / 0.35): sheet and toast.
- **Segment lift** (`0 0 0 1px hairline, 0 1px 2px oklch(0 0 0 / 0.08)`): the selected option in a segmented control.

### Z-index scale
`--z-sticky: 10` (station headers, sheet header), `--z-nav: 20` (tab bar, status-bar strip), `--z-toast: 30`. Sheets use the native `<dialog>` top layer and need no z-index.

### Motion
Ease-out-quart (`cubic-bezier(0.25, 1, 0.5, 1)`) only. 150ms for hover and selection color changes, 220ms for bar widths and toast entrance, 260ms for the sheet rising 40px while fading in. No bounce, no page-load choreography. Under `prefers-reduced-motion: reduce` transitions collapse to near-instant, the sheet only crossfades (120ms) and the toast appears without movement.

## 5. Components

### Buttons
- **Shape:** 10px radius (`rounded.md`); 44px min height, 48px for primary.
- **Primary:** Burnt Orange fill, white 600 text. One per view: Add to lunch, Save food, Save weight, Save goals, Sign in, Save changes. Hover darkens to `oklch(0.52 0.15 49)`.
- **Secondary:** Surface with Control Stroke border, Ink 500 text (Create account, Log out, day arrows). Hover fills Surface Recessed.
- **Link:** no chrome, Burnt Orange Ink 600 text, underline on hover (Add custom food, Repeat a past meal, Browse the menu).
- **Danger:** secondary shape with Over Red text (Delete entry).
- **Labels:** always verb plus object ("Add to lunch", "Save goals", "Delete entry", "Undo change").

### Segmented control
- **Style:** Surface Recessed track, 14px radius, 3px padding; options are 44px tall label-size text in Ink Quiet.
- **Selected:** raised Surface (dark: `0.36` raised), Ink text at 600, segment lift shadow. Selection is shown by surface and weight, not by orange.
- **Behavior:** native radio inputs underneath; scrolls horizontally when options overflow (the day row).

### Lists
- **Food row:** full-width button, 56px min height, name at body 500 with kcal right-aligned at label 600, meta line (protein, diet tags separated by middots, source badge) below in Ink Quiet. Rows are separated by hairlines; pressed state fills Surface Recessed.
- **Station header:** sticky, sentence case, label 600 in Ink Quiet on Tray White with a hairline under it.
- **Meal group header (Today):** the same treatment with the group's kcal right-aligned.

### Inputs / Fields
- **Style:** 48px tall, Surface fill, 1px Control Stroke, 10px radius, 16px text. Labels sit above in label size, Ink Quiet 500.
- **Focus:** border turns Burnt Orange plus a 2px Burnt Orange focus ring.
- **Error:** border and message in Over Red; message is linked with `aria-describedby`.
- **Select / search:** native controls with a neutral chevron or magnifier drawn as an inline SVG data URI.

### Sheet
Native `<dialog>` bottom sheet, Surface, 20px top radius, scrim at 45% ink. Sticky header with the title and a 44px close button; the primary action sticks to the bottom. Food sheet: stepper and meal select side by side, then the nutrition table with calories as its emphasized first row.

### Today readout (signature)
Hero number is calories left (or over), with "kcal left" in Ink Quiet beside it; a 10px bar in Burnt Orange (Over Red when over); then "536 kcal eaten of 2530". Macros follow as label/value rows over 6px bars. Micronutrients sit in a single ruled line.

### Navigation
Fixed four-item tab bar, 56px plus safe-area inset, Surface with a top hairline. Labels only, label size 500 in Ink Quiet; current tab is Burnt Orange Ink at 650 with a 28 by 3px Burnt Orange indicator at the top edge.

### Banners, notices, toast
- **Sync / stale banner:** Surface Recessed strip with an 8px Ink Quiet dot; rounded 10px when inside a screen.
- **Rejected banner:** Over Red Wash with Over Red text and dot.
- **Notice:** Surface Recessed, 10px radius, label size (no-targets, first-run, adaptive update card).
- **Toast:** Ink pill (14px radius) above the tab bar, Tray White text, inline underlined Undo; rises 12px on entry.

### Chart
Hand-drawn SVG. Trend is a 2.5px Burnt Orange line with round joins; weigh-ins are hollow 3.5px circles stroked Ink Quiet; gridlines are hairlines; axis labels are caption-size Ink Quiet. A visible key (Weigh-in, Trend) sits under the chart and the latest trend value is shown in the section header.

## 6. Do's and Don'ts

### Do:
- **Do** keep burnt orange to 10% or less of a screen: one primary button, the current tab, progress fills.
- **Do** use `--accent-ink` (#AD4A00) whenever burnt orange is text on the light theme; #BF5700 is for fills.
- **Do** set every number in tabular figures and pair every color state with words ("over", "rejected", "waiting to sync").
- **Do** separate content with hairlines and 24 to 32px of space before reaching for a container.
- **Do** keep tap targets at 44px or more and inputs at 16px or more.
- **Do** write buttons as verb plus object, and use commas, colons or periods instead of em dashes.

### Don't:
- **Don't** add MyFitnessPal clutter: ads, dense menus, every screen shouting.
- **Don't** build a generic SaaS dashboard: card grids, gradient accents, hero-metric blocks, identical stat cards.
- **Don't** echo the official UT website: institutional portal look, heavy branding, orange headers or orange page backgrounds.
- **Don't** gamify: no streaks, badges, confetti, or guilt copy. Over target is stated, not dramatized.
- **Don't** use side-stripe borders, gradient text, glassmorphism, or uppercase tracked eyebrows.
- **Don't** load fonts or assets from another origin; the CSP is `'self'`.
- **Don't** introduce a second accent hue or tint the page background toward cream.
