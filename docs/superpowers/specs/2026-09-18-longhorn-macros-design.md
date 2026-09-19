# Longhorn Macros — Design

Date: 2026-09-18 · Status: approved in brainstorming, pending spec review

A single-user, installable PWA for logging UT Austin dining-hall food and
tracking calories + macros against goal-driven targets that self-correct from
weight trend.

## Decisions (and what was ruled out)

| Decision | Chosen | Ruled out / why |
|---|---|---|
| Storage | Supabase (cloud sync phone ↔ laptop) | Local-only: no backup, no cross-device |
| Food data | Live UT FoodPro JSON feed, fetched in-browser | Hand-pasted data: stale; server scraper: unnecessary, feed is CORS `*` |
| Finding food | Browse (hall → meal → station) + global search | Search-only / browse-only |
| Dashboard | Calories + protein/carbs/fat with targets; fiber/sugar/sodium shown untargeted | Targets for micros (noise) |
| Goals | Formula calculator + weight log + adaptive TDEE | Calculator-only (can't tell if targets fit) |
| Auth | Email + password | Magic link (iOS home-screen PWA opens link in Safari, session doesn't reach the app); Google OAuth (flaky redirects in standalone PWA) |
| Stack | Vite + TypeScript + Preact + vite-plugin-pwa on Netlify | Vanilla JS (no real types, messy at this scope); Next.js/Vercel (no server needed) |
| Connectivity | Local-first: IndexedDB + outbox sync | Direct Supabase writes (fail on bad dining-hall signal) |

## UT menu feed

`GET https://hf-foodpro.austin.utexas.edu/foodpro/data_all_endpoint.php?menu=1`
— public, `Access-Control-Allow-Origin: *`, ~1.9 MB JSON.

- `menuWindow.dates`: 7 dates, `MM/DD/YYYY`.
- `days[date].locations[]`: `{locationNum, locationName, meals[]}`. Halls: `12` J2 Dining, `12(a)` JCL Dining, `03` Kins Dining.
- `meals[]`: `{mealName, recipes[]}`. A recipe row with `number: ""` and name `-- Station --` is a **station header**; subsequent rows belong to it.
- `data_object.recipes_data[number]`: `{name, portionSize, portionUnit, legends[], nutrients[]}`; nutrients by `name`: `Cals` (kcal), `Prot`, `Carb`, `Fat-T`, `Fiber`, `Sugar` (g), `Sod` (mg). Values are strings like `"86.000"`.
- `data_object.global_data.legendInfo` maps legend codes to labels (allergens, Vegan, Halal…).
- `last_cached` timestamp.

The parser validates this shape at the boundary and throws a descriptive error
on mismatch. The last good parsed menu is persisted in IndexedDB and served
when the network fails or parsing fails, with a banner showing its age.

## Architecture

```
Phone (PWA)                                     Cloud
┌──────────────────────────────┐
│ Preact UI                    │
│   ↕ reads/writes             │
│ IndexedDB  ── outbox ──sync──┼──► Supabase Postgres (RLS: user_id = auth.uid())
│   (mirror of user tables,    │◄── pull (updated_at > cursor)
│    cached menu)              │
│ fetch ───────────────────────┼──► UT FoodPro feed
│ Service worker (app shell)   │
└──────────────────────────────┘
Netlify serves static build.
```

### Modules (pure logic has no DOM/Preact imports)

- `menu/` — feed types, `parseFeed(json) → Menu`, station grouping, current-meal selection by clock.
- `nutrition/` — `Nutrients` type, scaling, summing, rounding.
- `goals/` — BMR/TDEE, target computation, overrides.
- `adaptive/` — weight trend (EWMA), eligibility, TDEE re-estimate, clamping.
- `search/` — unified index over menu week + log history + custom foods, dedup, ranking.
- `sync/` — IndexedDB store, outbox, push/pull, backoff, conflict rule.
- `supabase/` — client construction, auth.
- `ui/` — Preact screens and components.

## Data model (Supabase)

All tables: `user_id uuid not null default auth.uid() references auth.users`,
`updated_at timestamptz not null`, `deleted_at timestamptz null`, RLS enabled
with select/insert/update policies `user_id = auth.uid()`; no delete policy
(deletes are soft, so they sync). IDs are client-generated `uuid`.

- `profile` (pk `user_id`): `sex` (`male|female`), `birth_year`, `height_in`,
  `activity` (`sedentary|light|moderate|active|very_active`), `goal`
  (`cut|maintain|bulk`), `rate_lb_per_week`, `override` jsonb (nullable
  partial `{calories, protein, carbs, fat}`), `adaptive_enabled` bool,
  `tdee_estimate` numeric null, `tdee_updated_on` date null,
  `tdee_previous` numeric null (for Undo).
- `food_log`: `id`, `date` (local calendar date), `meal`
  (`breakfast|lunch|dinner|snack`), `hall` text null, `station` text null,
  `name`, `recipe_number` text null, `custom_food_id` uuid null, `portion`
  text, `servings` numeric > 0, `per_serving` jsonb `Nutrients`.
- `custom_foods`: `id`, `name`, `portion`, `per_serving` jsonb `Nutrients`.
- `weights` (unique `user_id, date`): `id`, `date`, `weight_lb` numeric.

`Nutrients = {calories, protein, carbs, fat, fiber, sugar, sodium}` (kcal, g, mg).
Log rows snapshot `per_serving` so history is immune to menu changes.

## Sync

- Every mutation writes to IndexedDB and appends `{table, row}` to the outbox in
  one transaction; UI reads only from IndexedDB.
- Push: drain outbox via `upsert` (idempotent on client ids). On network error:
  exponential backoff (2s → 5 min cap), retry on `online`/focus. On a
  4xx/RLS rejection: mark the item failed, surface it, don't retry forever.
- Pull: on start, focus, and after push — rows with `updated_at > cursor` per
  table; merge last-write-wins on `updated_at`.
- Header shows "N changes waiting to sync" / failed-item notice.

## Screens

Bottom tab bar, four tabs.

1. **Menu** (default): hall chips (J2 / JCL / Kins, remembers last), meal
   chips defaulting to the meal currently served, day picker within the
   feed's 7-day window. Items grouped by station: name, kcal, protein.
   Search bar on top searches everything (menu week, log history, custom
   foods). "Custom food" entry. Tap item → bottom sheet: portion text,
   servings stepper (±0.5, free-entry decimal, min 0.25), all nutrients
   scaled live, meal selector, **Add** (to the date being viewed in Today,
   default today).
2. **Today**: date nav ‹ › + "Today". Calories eaten / target / remaining
   (or over). P/C/F bars vs targets. Entries grouped by meal with subtotals;
   tap → edit servings / delete. "Repeat a past meal" shortcut (pick a date +
   meal, copy entries to the viewed day). Fiber / sugar / sodium totals row.
3. **Progress**: weight entry (defaults to today), chart of weigh-ins with
   EWMA trend line, 7-day average kcal & protein, days logged, adaptive TDEE
   status ("Needs ~X more days of data" or current estimate).
4. **Goals**: profile form, goal + pace, computed targets, per-field manual
   override, adaptive toggle, log out.

Visual design is done in a dedicated pass with the `impeccable` skill.

## Goal math

- **BMR** Mifflin-St Jeor: `10·kg + 6.25·cm − 5·age + (male ? 5 : −161)`;
  `kg = lb · 0.45359237`, `cm = in · 2.54`, `age = currentYear − birth_year`.
- **TDEE (formula)** = BMR × {sedentary 1.2, light 1.375, moderate 1.55,
  active 1.725, very_active 1.9}.
- **Maintenance used** = `tdee_estimate` if adaptive has produced one, else
  formula TDEE.
- **Pace**: cut ∈ {0.5, 1, 1.5, 2} lb/wk, bulk ∈ {0.25, 0.5, 1}; delta =
  rate × 500 kcal/day (− cut, + bulk, 0 maintain).
- **Calories** = round(maintenance + delta), floored at 1500 (male) /
  1200 (female).
- **Protein** = round(1.0 g × latest weight lb) for cut/bulk, 0.8 for maintain.
- **Fat** = round(0.25 × calories / 9). **Carbs** = max(0, round((calories −
  4·protein − 9·fat) / 4)).
- Latest weight = most recent `weights` row. Profile setup requires an initial weigh-in.
- Manual override replaces any individual field.

## Adaptive TDEE

- **Trend**: EWMA over daily weights, α = 0.1, days without a weigh-in skip.
- **Runs** at most once per 7 days, when opening the app.
- **Eligible** when, in the trailing 21 days: ≥ 14 days with ≥ 1 log entry,
  and ≥ 8 weigh-ins. Days without log entries are excluded, not counted as 0.
- **Estimate** = mean kcal over logged days − (Δtrend_lb × 3500 / span_days),
  where Δtrend is trend at window end minus start.
- **Blend** `new = 0.5 · estimate + 0.5 · previous` (previous = last estimate
  or formula TDEE); **clamp** |new − previous| ≤ 150.
- Stores `tdee_previous`, shows a dismissible card "Targets updated A → B —
  <plain-English reason>" with **Undo** (restores `tdee_previous`).
- Not eligible → shows the count of additional days needed; formula stays.

## Error handling

- Feed failure/shape change → banner + cached menu + age; app remains usable.
- Sync failures → queued, retried with backoff, visible count; rejections
  surfaced, never silently dropped.
- Auth expiry → re-login prompt; local data and outbox retained.
- All numeric inputs validated at the form boundary (finite, in range).
- One structured logger module; no empty catches.

## Testing & tooling

- TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; no `any`.
- ESLint flat config: `typescript-eslint` `strictTypeChecked` +
  `stylisticTypeChecked`, `no-empty` / no unhandled promises.
- `Makefile`: `lint` (eslint + `tsc --noEmit`), `test`, `check`, `e2e`.
- **Vitest**, 100% lines/branches/functions/statements on all non-`ui/`
  modules, enforced in config.
- **Integration, no mocks**: sync + RLS against a real local Supabase
  (`supabase start`, migrations applied); RLS test proves user B cannot read
  user A's rows; feed parser run against the live UT feed (asserts shape, not
  specific items). IndexedDB in tests via `fake-indexeddb` is **not** used —
  sync-store tests run in a real browser (Vitest browser mode / Playwright).
- **E2E** (Playwright, iPhone 13 viewport, against local Supabase):
  sign up → set profile/goal → add menu item → go offline → add another →
  back online → assert both rows in Supabase.
- `ui/` components excluded from unit coverage; covered by E2E.

## Deploy

- Supabase: new free-tier project; migrations in `supabase/migrations`.
  Email confirmation off (single user).
- Netlify: `netlify.toml` (build `npm run build`, publish `dist`, SPA
  fallback, `no-cache` on `sw.js`). Env: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. Requires Netlify CLI + one-time `netlify login`
  by the user.
- Install: Safari → Share → Add to Home Screen.

## Out of scope

Multiple users/sharing, barcode scanning, non-UT foods database, micronutrient
targets, push notifications, native app store builds.
