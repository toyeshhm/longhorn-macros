# Longhorn Macros Implementation Plan — Part 2 (UI, PWA, E2E, design, deploy)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read Part 1 (`2026-09-18-longhorn-macros-part1.md`) first — its **Global Constraints** and all **Produces** interfaces apply here verbatim.

**Spec:** `docs/superpowers/specs/2026-09-18-longhorn-macros-design.md`

UI tasks (9–13) build functional, accessible screens with a minimal token-based stylesheet; Task 16 is the dedicated visual-design pass. `src/ui/**` is excluded from unit coverage and covered by the Task 15 E2E suite, so each UI task's "test" step is a Playwright check added to `e2e/`.

## Additional file map

```
src/supabase/client.ts        createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
src/main.tsx                  mount <App/>, register SW
src/ui/App.tsx                auth gate, tab bar, providers, sync banner
src/ui/context.ts             AppContext { store, engine, userId, viewDate, setViewDate }
src/ui/hooks.ts               useLive(query), useMenu(), useProfile(), useTargets()
src/ui/Login.tsx
src/ui/menu/MenuScreen.tsx, FoodSheet.tsx, CustomFoodForm.tsx
src/ui/today/TodayScreen.tsx, EntrySheet.tsx, RepeatMeal.tsx
src/ui/progress/ProgressScreen.tsx, WeightChart.tsx
src/ui/goals/GoalsScreen.tsx, AdaptiveCard.tsx
src/ui/components/{TabBar,Sheet,Stepper,MacroBar,Banner}.tsx
src/ui/styles.css
e2e/*.spec.ts, playwright.config.ts
public/logo.svg (+ generated icons)
```

---

### Task 9: Client, auth, app shell, live hooks

**Files:** `src/supabase/client.ts`, `src/main.tsx`, `src/ui/App.tsx`, `src/ui/context.ts`, `src/ui/hooks.ts`, `src/ui/Login.tsx`, `src/ui/components/{TabBar,Banner}.tsx`, `src/ui/styles.css`, `src/menu/cache.ts`, `tests/browser/menu-cache.test.ts`, `playwright.config.ts`, `e2e/auth.spec.ts`.

**Consumes:** `LocalStore`, `SyncEngine`, `fetchMenu`, `parseFeed`, `Menu`, `localDateKey`, `log`.
**Produces:**
```ts
// src/menu/cache.ts (covered: browser test)
export function loadMenu(store: LocalStore, fetchFn: typeof fetch): Promise<{ menu: Menu | null; stale: boolean; error: string | null; cachedAt: string | null }>
// fetch → on success setMeta('menu', JSON.stringify(raw)) and return fresh; on failure parse cached meta via parseFeed, stale=true, error=message; no cache → menu=null.
// src/ui/hooks.ts
export function useLive<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined   // re-runs on store.onChange
export function useMenu(): { menu: Menu | null; stale: boolean; error: string | null; cachedAt: string | null }
export function useProfile(): ProfileRow | null | undefined          // undefined = loading
export function useLatestWeight(): WeightEntry | null | undefined
export function useTargets(): Targets | null                          // null until profile + weight exist
```
Behavior:
- `client.ts`: throw `Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')` if env absent. `auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lm-auth' }`.
- `App`: `supabase.auth.getSession()` + `onAuthStateChange`. No session → `<Login/>`. Session → open `LocalStore` named `lm-<userId>`, construct `SyncEngine`, `engine.start()`, provide context. Tabs: Menu, Today, Progress, Goals (`<nav aria-label="Main">`, buttons with `aria-current="page"`). If profile missing → show Goals tab with a first-run notice.
- Sync banner: `pending()` polled on store change; shows "N changes waiting to sync" when queued > 0 and offline or retrying; failed > 0 → error banner "N changes were rejected" with a details disclosure listing `failed` reasons.
- Auth expiry (`SIGNED_OUT` while local data exists) → Login shown; LocalStore **not** deleted; outbox resumes after login.
- `Login`: email + password, "Sign in" and "Create account" (signUp) buttons, error text in `role="alert"`. `autocomplete="email"` / `current-password` / `new-password`.
- Styles: CSS custom properties on `:root` (`--accent:#BF5700`, surface/text tokens, dark via `prefers-color-scheme`), system font, inputs ≥16px, tap targets ≥44px, `env(safe-area-inset-*)`, tab bar fixed bottom.

- [ ] **Step 1:** browser test for `loadMenu`: (a) real fetch of live feed → `stale:false`, meta written; (b) second call with `fetchFn = () => fetch('http://127.0.0.1:9/')` (real failing network) → returns cached menu, `stale:true`, `error` set; (c) fresh store + failing fetch → `menu:null`. Run → FAIL; implement; PASS.
- [ ] **Step 2:** `playwright.config.ts`: `webServer: { command: 'npx vite --port 5199 --mode test', port: 5199, reuseExistingServer: true }`, `use: { ...devices['iPhone 13'], baseURL: 'http://localhost:5199' }`, chromium only (`browserName: 'chromium'` override), `testDir: 'e2e'`.
- [ ] **Step 3:** `e2e/auth.spec.ts`: create account with random email → tab bar visible → reload → still signed in → Goals → Log out → Login visible.
- [ ] **Step 4:** implement files; `make lint`, `make test`, `make e2e` green.
- [ ] **Step 5:** commit `feat: app shell, auth, live store hooks, menu cache`.

---

### Task 10: Menu screen, food sheet, custom food

**Files:** `src/ui/menu/MenuScreen.tsx`, `src/ui/menu/FoodSheet.tsx`, `src/ui/menu/CustomFoodForm.tsx`, `src/ui/components/{Sheet,Stepper}.tsx`, `src/servings.ts`, `tests/servings.test.ts`, `e2e/menu.spec.ts`.

**Consumes:** `useMenu`, `HALLS`, `groupByStation`, `currentMeal`, `buildIndex`, `searchItems`, `scaleNutrients`, `round1`, `MEALS`, `LocalStore.put`, context `viewDate`.
**Produces (`src/servings.ts`, pure, 100% covered):**
```ts
export function parseServings(input: string): number | null   // accepts "1", "1.5", ".5", "1/2", "1 1/2"; must be >0 and ≤50; else null
export function stepServings(current: number, dir: 1 | -1): number   // ±0.5, snaps to nearest 0.5 first when off-grid, min 0.25
export function defaultMealFor(now: Date): Meal                 // <10:30 breakfast, <16:00 lunch, <21:00 dinner, else snack
```
Behavior:
- Hall chips (radio group) — remembered via `setMeta('lastHall')`. Day selector over `menu.dates` (labels "Today", "Tomorrow", weekday). Meal chips from that hall/day's meals, default `currentMeal`. Station sections with sticky headers; rows show name, `kcal`, `Pg` protein (`round1`), and a legend hint for Vegan/Vegetarian/Halal only (allergens in the sheet).
- Search input (`type="search"`, `enterkeyhint="search"`) at top: non-empty query replaces browse view with `searchItems(buildIndex(...))` results; source badge (menu hall / "Logged before" / "Custom").
- Stale banner: "Showing menu saved <relative time> — couldn't reach UT dining." Error with no cache: "Couldn't load UT menu" + Retry button; search over history/custom still works.
- `FoodSheet` (bottom sheet, focus-trapped, Esc/overlay closes, `role="dialog" aria-modal`): name, hall · station, portion, `Stepper` (−/+ buttons with `aria-label`, center `<input inputmode="decimal">` using `parseServings`; invalid → inline error, Add disabled), meal select default `defaultMealFor(now)` when viewDate is today else 'lunch', full scaled nutrients table (all 7), allergen/legend list, **Add** → `store.put('food_log', {id: crypto.randomUUID(), date: viewDate, meal, hall, station, name, recipeNumber, customFoodId, portion, servings, perServing, updatedAt:'', deletedAt:null})` (store sets updatedAt), toast "Added to <meal>", sheet closes.
- `CustomFoodForm`: name (1–200), portion text, 7 nutrient inputs (calories/protein/carbs/fat required, others default 0; all finite 0–10000) → `store.put('custom_foods', ...)`, then opens FoodSheet for it.

- [ ] **Step 1:** `tests/servings.test.ts` covering every accepted/rejected format, step snapping (1.3 +1 → 1.5, 0.5 −1 → 0.25, 0.25 −1 → 0.25), all four meal time boundaries. FAIL → implement → PASS 100%.
- [ ] **Step 2:** `e2e/menu.spec.ts` (live UT feed): sign up → Menu shows ≥1 station → tap first item → set servings "1.5" → Add → Today shows it with calories = round(1.5 × item kcal). Search "a" → results listed. Create custom food "Protein Shake" 160/30/5/2 → searchable → add.
- [ ] **Step 3:** implement; `make check`, `make e2e` green. **Step 4:** commit `feat: menu browse, search, food sheet, custom foods`.

---

### Task 11: Today screen

**Files:** `src/ui/today/TodayScreen.tsx`, `src/ui/today/EntrySheet.tsx`, `src/ui/today/RepeatMeal.tsx`, `src/ui/components/MacroBar.tsx`, `src/daySummary.ts`, `tests/daySummary.test.ts`, `e2e/today.spec.ts`.

**Produces (`src/daySummary.ts`, pure):**
```ts
export interface DaySummary { total: Nutrients; byMeal: readonly { meal: Meal; entries: readonly LogEntry[]; calories: number }[]; remaining: Targets | null }
export function summarizeDay(entries: readonly LogEntry[], targets: Targets | null): DaySummary   // excludes deleted; byMeal in MEALS order, only non-empty; remaining = target − eaten (may be negative)
export function copyMeal(entries: readonly LogEntry[], toDate: string, now: () => string): LogEntry[]  // fresh ids via crypto.randomUUID, date=toDate, updatedAt=now()
```
Behavior:
- Header: ‹ date label › with "Today" button when not today (`viewDate` in context, shared with Menu's Add).
- Calories: large "eaten" number, "of target", "N left" / "N over" (over uses a distinct color token + text, not color alone). Progress ring or bar with `role="progressbar" aria-valuenow/max`.
- `MacroBar` ×3 (protein/carbs/fat): `g eaten / g target`.
- Micros row: fiber g, sugar g, sodium mg (totals only).
- Meal groups with subtotal; entry row: name, servings × portion, kcal. Tap → `EntrySheet` (Stepper to edit servings → `put`; Delete → `remove` with a 5-second Undo toast that re-`put`s with `deletedAt:null`).
- Empty day: prompt linking to Menu. No targets: card linking to Goals.
- `RepeatMeal`: pick a date (default yesterday) + meal → preview list → "Add N items" → `copyMeal` → `put` each.

- [ ] **Step 1:** unit tests for `summarizeDay` (totals, meal order, deleted excluded, remaining negative, null targets) and `copyMeal`. FAIL → implement → PASS 100%.
- [ ] **Step 2:** `e2e/today.spec.ts`: add 2 items via custom food → totals equal sum → edit servings 2 → totals update → delete → Undo restores → navigate ‹ then Today → repeat yesterday's lunch copies items.
- [ ] **Step 3:** implement; `make check`, `make e2e`. **Step 4:** commit `feat: today dashboard with edit, delete-undo, repeat meal`.

---

### Task 12: Progress screen

**Files:** `src/ui/progress/ProgressScreen.tsx`, `src/ui/progress/WeightChart.tsx`, `src/chart.ts`, `tests/chart.test.ts`, `e2e/progress.spec.ts`.

**Produces (`src/chart.ts`, pure):**
```ts
export interface ChartGeometry { points: string; trend: string; yTicks: readonly { y: number; label: string }[]; xLabels: readonly { x: number; label: string }[] }
export function chartGeometry(raw: readonly WeightPoint[], trend: readonly WeightPoint[], w: number, h: number, pad: number): ChartGeometry
// SVG polyline point strings; y-range = min/max of raw∪trend ± 1 lb; 4 y ticks; ≤5 evenly spaced x date labels ("Sep 18"); single point → centered; empty → empty strings, no ticks
export function weeklyStats(entries: readonly LogEntry[], today: string): { avgCalories: number | null; avgProtein: number | null; daysLogged: number }  // trailing 7 days incl. today, averages over logged days only
```
Behavior: weight input (`inputmode="decimal"`, 50–700) + date (default today) → `put('weights')` reusing the existing row id for that date (`weightForDate`) to honor unique (user,date). Range toggle 30/90 days/All. Hand-rolled SVG chart (no chart lib): raw dots + trend line (`ewmaTrend`), `<title>` + visually-hidden table of values for screen readers. Stats cards from `weeklyStats`. Adaptive status line from `evaluateAdaptive` (see Task 13): "Needs ~X more logged days and Y weigh-ins" or "Maintenance estimate: N kcal (updated <date>)".

- [ ] **Step 1:** unit tests for `chartGeometry` (empty, single, multi, ticks) and `weeklyStats`. FAIL → implement → PASS 100%.
- [ ] **Step 2:** `e2e/progress.spec.ts`: enter 170 today, 171 same day (replaces, one point), 172 for yesterday → chart has 2 dots; stats reflect logged food.
- [ ] **Step 3:** implement; checks green. **Step 4:** commit `feat: progress with weight log, trend chart, weekly stats`.

---

### Task 13: Goals screen + adaptive runner

**Files:** `src/ui/goals/GoalsScreen.tsx`, `src/ui/goals/AdaptiveCard.tsx`, `src/adaptiveRun.ts`, `tests/adaptiveRun.test.ts`, `e2e/goals.spec.ts`.

**Consumes:** `Profile`, `validateProfile`, `computeTargets`, `formulaTdee`, `plannedDelta`, `RATE_OPTIONS`, `evaluateAdaptive`, `ewmaTrend`.
**Produces (`src/adaptiveRun.ts`, pure):**
```ts
export function dailyIntake(entries: readonly LogEntry[]): DayIntake[]     // group non-deleted by date, sum calories (servings × perServing.calories), asc
export function applyAdaptive(p: ProfileRow, result: AdaptiveResult, today: string): ProfileRow | null   // 'updated' → {tdeePrevious: previous, tdeeEstimate: next, tdeeUpdatedOn: today}; else null
export function undoAdaptive(p: ProfileRow): ProfileRow                     // tdeeEstimate = tdeePrevious, tdeePrevious = null
export function plannedLbPerWeek(p: Profile): number                        // cut −rate, bulk +rate, maintain 0
```
Behavior:
- Form: sex (segmented), birth year, height ft + in (→ `heightIn`), activity select with one-line descriptions (Sedentary: mostly sitting; Light: walking to class daily; Moderate: exercise 3–5×/wk; Active: hard training 6–7×/wk; Very active: athlete / 2-a-days), goal segmented, pace select from `RATE_OPTIONS[goal]` labelled "lose 1 lb/week" etc. First run also requires a current weight (writes `weights`). Validate with `validateProfile`; errors inline per field (`aria-describedby`).
- Live panel: BMR, formula TDEE, maintenance used (adaptive estimate marked "learned from your data"), targets. "Adjust targets manually" disclosure: 4 inputs, blank = use computed; saved to `override`.
- Adaptive toggle. Runner: in `App` after profile + store load, once per open: if `adaptiveEnabled`, compute `evaluateAdaptive({ today, lastRunOn: p.tdeeUpdatedOn, previous: p.tdeeEstimate ?? formulaTdee(...), plannedLbPerWeek, weights, intake: dailyIntake(allLog) })`; `applyAdaptive` → `put('profile')` and show `AdaptiveCard` ("Targets updated A → B — <reason>" + Undo → `undoAdaptive`). Note: `lastRunOn` uses `tdeeUpdatedOn`; when result is `insufficient`, nothing is stored (re-evaluates next open; cheap).
- Log out button (`supabase.auth.signOut()`).

- [ ] **Step 1:** unit tests for all four functions, including `applyAdaptive` on each result kind. FAIL → implement → PASS 100%.
- [ ] **Step 2:** `e2e/goals.spec.ts`: first run fills profile (male, 2006, 5'10", 170 lb, moderate, cut 1) → targets show 2270 kcal / 170 P / 63 F / 256 C → override calories 2000 → Today shows 2000 target → clear override → back to 2270. Adaptive: seed 21 days of log + 10 weigh-ins through the UI's store via `page.evaluate` calling the app's exposed test hook? **No hooks** — instead insert rows directly into local Supabase with the user's session (supabase-js in the test, real DB), reload so pull brings them in, then assert AdaptiveCard appears and Undo restores the previous target.
- [ ] **Step 3:** implement; checks green. **Step 4:** commit `feat: goals, manual overrides, adaptive TDEE runner`.

---

### Task 14: PWA (installable + offline)

**Files:** `vite.config.ts`, `public/logo.svg`, generated `public/pwa-*.png`, `public/apple-touch-icon-180x180.png`, `public/maskable-icon-512x512.png`, `public/favicon.ico`, `index.html`, `src/main.tsx`, `e2e/offline.spec.ts`.

- [ ] **Step 1:** `public/logo.svg`: burnt-orange (#BF5700) rounded square, white bold "M" (or longhorn silhouette), 512 viewBox, content inside the 80% maskable safe zone. `npm i -D @vite-pwa/assets-generator` and `npx pwa-assets-generator --preset minimal-2023 public/logo.svg`.
- [ ] **Step 2:** `vite.config.ts`:
```ts
import { defineConfig } from 'vite'; import preact from '@preact/preset-vite'; import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({ plugins: [preact(), VitePWA({
  registerType: 'autoUpdate', includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
  manifest: { name: 'Longhorn Macros', short_name: 'Macros', start_url: '/', display: 'standalone', theme_color: '#BF5700', background_color: '#111111',
    icons: [ { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }, { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
             { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ] },
  workbox: { navigateFallback: '/index.html', runtimeCaching: [ { urlPattern: /^https:\/\/hf-foodpro\.austin\.utexas\.edu\//, handler: 'NetworkFirst',
    options: { cacheName: 'ut-menu', networkTimeoutSeconds: 6, expiration: { maxEntries: 4 } } } ] } })] })
```
  `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `theme-color`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title=Macros`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`. `main.tsx`: `registerSW({ immediate: true })` from `virtual:pwa-register`.
- [ ] **Step 3:** `e2e/offline.spec.ts` against `vite preview` build (separate project in playwright config with `webServer` `npx vite build --mode test && npx vite preview --port 5198`): sign up, wait for SW `navigator.serviceWorker.ready`, go `context.setOffline(true)`, reload → app shell renders, Menu shows stale banner with cached menu, add a custom food entry → sync banner "1 change waiting" (or more) → `setOffline(false)` → banner clears → row present in local Supabase (query with supabase-js as that user).
- [ ] **Step 4:** Lighthouse PWA/installability sanity via chrome-devtools MCP `lighthouse_audit` on the preview URL; fix manifest/icon issues it reports.
- [ ] **Step 5:** checks green; commit `feat: installable offline PWA`.

---

### Task 15: Full E2E + completeness pass

- [ ] **Step 1:** `e2e/journey.spec.ts` — the spec's canonical flow on iPhone 13 viewport: sign up → set profile/goal → add menu item → go offline → add another → back online → assert both rows in Supabase; then open a second browser context, sign in as same user → Today shows both (cross-device).
- [ ] **Step 2:** Walk the spec section by section; for any behavior not exercised by a unit or E2E test, add one.
- [ ] **Step 3:** `make check && make e2e` green; no console errors in any E2E (`page.on('console')` fails the test on `error` level). Commit `test: end-to-end journey and coverage of spec`.

---

### Task 16: Visual design pass (impeccable)

- [ ] **Step 1:** Invoke the `impeccable` skill. Brief: single-user phone-first nutrition logger used standing in a dining-hall line, one hand, often in bright light or at night; UT Austin identity (burnt orange #BF5700) without looking like an official UT site; numbers are the hero (tabular figures); calm, fast, not gamified; must work in light and dark.
- [ ] **Step 2:** Apply its direction to `src/ui/styles.css` tokens + component markup (hierarchy of the calorie readout, macro bars, station list density, bottom sheet, tab bar, empty/error/offline states, toasts). No new runtime dependencies except a self-hosted font file if chosen (CSP is `'self'`).
- [ ] **Step 3:** Screenshots at 390×844 light + dark of all four tabs + food sheet into `docs/screenshots/`; review them against the brief; iterate.
- [ ] **Step 4:** `make check && make e2e` still green (selectors are role/label based, so restyling shouldn't break them). Commit `style: visual design pass`.

---

### Task 17: Deploy (Supabase cloud + Netlify)

Outward-facing — confirm each step with the user before running.
- [ ] **Step 1:** Supabase: `get_cost` → `confirm_cost` → `create_project` (name `longhorn-macros`, region us-east/central, free tier). Apply `supabase/migrations/*.sql` via `apply_migration`. Disable email confirmation in Auth settings (dashboard; tell user if the MCP can't). `get_advisors` security → fix any RLS warnings. Get URL + publishable/anon key.
- [ ] **Step 2:** `npm i -D netlify-cli`; user runs `! npx netlify login`. `npx netlify init` (new site `longhorn-macros`), `npx netlify env:set VITE_SUPABASE_URL ...`, `... VITE_SUPABASE_ANON_KEY ...`. `npx netlify deploy --build --prod`.
- [ ] **Step 3:** Smoke the live URL with Playwright (sign up the user's real account is the user's job — just verify load, SW registration, menu loads, no CSP violations in console).
- [ ] **Step 4:** Tell the user: URL, Safari → Share → Add to Home Screen, create account in-app. Commit any deploy config; run `/spine-capture` with the key decisions (feed discovery, iOS magic-link constraint, TS 6.0 pin, local-first choice).
