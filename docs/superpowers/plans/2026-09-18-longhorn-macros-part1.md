# Longhorn Macros Implementation Plan — Part 1 (foundation + logic)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Part 2: `2026-09-18-longhorn-macros-part2.md`.

**Goal:** Installable PWA to log UT dining-hall food and track calories/macros against adaptive goal targets, synced to Supabase.

**Architecture:** Vite + TypeScript + Preact SPA. Pure logic modules (`nutrition`, `menu`, `goals`, `adaptive`, `search`, `dates`) have no DOM/Preact imports and 100% coverage. UI reads only from IndexedDB; an outbox syncs to Supabase (RLS per user). UT menu fetched live from the CORS-open FoodPro JSON feed.

**Tech Stack:** vite 8, preact 10.29, @preact/preset-vite 2.10, vite-plugin-pwa 1.3, @supabase/supabase-js 2.116, idb 8, typescript **6.0.3** (typescript-eslint requires <6.1), eslint 10 + typescript-eslint 8.70, vitest 5 + @vitest/coverage-v8 + @vitest/browser-playwright, @playwright/test 1.63, Supabase CLI 2.106 (Docker running).

**Spec:** `docs/superpowers/specs/2026-09-18-longhorn-macros-design.md` — read it before any task.

## Global Constraints

- Repo root `~/dev/longhorn-macros`. Commits have **no** `Co-Authored-By` trailer.
- TS: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`. No `any`, no `as` casts except `as const`. No type aliases that only rename another type.
- ESLint: `strictTypeChecked` + `stylisticTypeChecked`; `no-empty: error`; `@typescript-eslint/no-floating-promises: error`.
- No mocks/fakes (no `vi.mock`, no `fake-indexeddb`, no stubbed fetch). Recorded real feed JSON as test **input data** is allowed.
- 100% lines/branches/functions/statements for `src/**` excluding `src/ui/**`, `src/main.tsx`, `src/supabase/client.ts`.
- One logger: `src/log.ts`. No `console.*` elsewhere (eslint `no-console: error` except that file). No empty catch.
- Every source file < 500 lines. No innerHTML / `dangerouslySetInnerHTML`.
- Money-path equivalents: all numbers crossing a boundary (feed, Supabase rows, form inputs) validated with finite/range checks.

## File map

```
src/log.ts                 structured logger
src/dates.ts               local date keys + arithmetic
src/nutrition.ts           Nutrients type + math
src/menu/feed.ts           FoodPro feed parsing → Menu
src/menu/select.ts         station grouping, current meal, hall ids
src/goals.ts               Profile, BMR/TDEE, targets
src/adaptive.ts            EWMA trend + adaptive TDEE
src/search.ts              unified index + ranking
src/db/types.ts            row types (LogEntry, CustomFood, WeightEntry, ProfileRow, Meal)
src/db/codec.ts            camelCase ↔ snake_case + validation of remote rows
src/sync/store.ts          IndexedDB LocalStore (rows + outbox + meta)
src/sync/engine.ts         push/pull/backoff
src/supabase/client.ts     createClient from env
supabase/migrations/*.sql  schema + RLS
tests/**                   vitest node tests; tests/browser/** browser-mode tests
e2e/**                     playwright
```
---

### Task 1: Scaffold + tooling + logger

**Files:** Create `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `Makefile`, `netlify.toml`, `.gitignore`, `index.html`, `src/main.tsx` (renders `<p>Longhorn Macros</p>`), `src/log.ts`, `tests/log.test.ts`.

**Produces:** `log.info|warn|error(event: string, fields?: Record<string, string | number | boolean | null>): void`.

- [ ] **Step 1:** `npm init -y`, set `"type":"module","private":true`. Install:
  `npm i preact @supabase/supabase-js idb` and
  `npm i -D vite @preact/preset-vite vite-plugin-pwa typescript@6.0.3 eslint @eslint/js typescript-eslint globals vitest @vitest/coverage-v8 @vitest/browser-playwright playwright @playwright/test @types/node`
  then `npx playwright install chromium`. If a peer conflict appears, pin the newest version satisfying the peer range and note it in the commit message.
- [ ] **Step 2:** `tsconfig.json`:
```json
{ "compilerOptions": {
  "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler", "lib": ["ES2023","DOM","DOM.Iterable","WebWorker"],
  "jsx": "react-jsx", "jsxImportSource": "preact", "strict": true, "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true, "noImplicitOverride": true, "noFallthroughCasesInSwitch": true,
  "noUnusedLocals": true, "noUnusedParameters": true, "skipLibCheck": true, "noEmit": true,
  "types": ["vite/client", "vite-plugin-pwa/client", "node"] },
  "include": ["src", "tests", "e2e", "*.ts", "*.js"] }
```
- [ ] **Step 3:** `vitest.config.ts` — two projects: `unit` (environment node, `tests/**/*.test.ts` excluding `tests/browser/**`) and `browser` (`tests/browser/**/*.test.ts`, `browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] }` from `@vitest/browser-playwright`). Coverage: provider v8, `include: ['src/**']`, `exclude: ['src/ui/**','src/main.tsx','src/supabase/client.ts','src/sw.ts']`, `thresholds: { lines:100, branches:100, functions:100, statements:100 }`.
- [ ] **Step 4:** `eslint.config.js`:
```js
import js from '@eslint/js'; import tseslint from 'typescript-eslint'; import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended, ...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked,
  { languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }, globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-empty': ['error', { allowEmptyCatch: false }], 'no-console': 'error',
      '@typescript-eslint/no-floating-promises': 'error', '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }] } },
  { files: ['src/log.ts'], rules: { 'no-console': 'off' } },
  { files: ['**/*.js'], ...tseslint.configs.disableTypeChecked },
)
```
- [ ] **Step 5:** `Makefile` (tabs):
```make
.PHONY: lint test check e2e db-up db-env dev build
lint: ; npx eslint . && npx tsc --noEmit
db-up: ; supabase start >/dev/null
db-env: db-up ; supabase status -o env | sed -n 's/^API_URL=/VITE_SUPABASE_URL=/p; s/^ANON_KEY=/VITE_SUPABASE_ANON_KEY=/p' | tr -d '"' > .env.test
test: db-env ; npx vitest run --coverage
check: lint test
e2e: db-env ; npx playwright test
dev: ; npx vite
build: ; npx vite build
```
- [ ] **Step 6:** `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"
[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.supabase.co https://hf-foodpro.austin.utexas.edu; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'"
```
  `package.json` scripts: `"dev":"vite","build":"tsc --noEmit && vite build","lint":"make lint","test":"make test"`. `.gitignore`: `node_modules dist dev-dist coverage .env* playwright-report test-results supabase/.temp`.
- [ ] **Step 7: failing test** `tests/log.test.ts`:
```ts
import { expect, test, vi } from 'vitest'
import { log } from '../src/log'
test('emits one JSON line per event with level, event, fields', () => {
  const lines: string[] = []
  const spy = vi.spyOn(console, 'info').mockImplementation((line: string) => { lines.push(line) })
  log.info('sync.push', { rows: 3 })
  spy.mockRestore()
  const parsed: unknown = JSON.parse(lines[0] ?? '')
  expect(parsed).toMatchObject({ level: 'info', event: 'sync.push', rows: 3 })
})
test('warn and error route to matching console methods', () => {
  const seen: string[] = []
  const w = vi.spyOn(console, 'warn').mockImplementation(() => { seen.push('warn') })
  const e = vi.spyOn(console, 'error').mockImplementation(() => { seen.push('error') })
  log.warn('a'); log.error('b', { msg: 'x' })
  w.mockRestore(); e.mockRestore()
  expect(seen).toEqual(['warn', 'error'])
})
```
- [ ] **Step 8:** `npx vitest run --project unit tests/log.test.ts` → FAIL (module missing).
- [ ] **Step 9:** `src/log.ts`:
```ts
type Fields = Record<string, string | number | boolean | null>
type Level = 'info' | 'warn' | 'error'
function emit(level: Level, event: string, fields: Fields = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields })
  if (level === 'info') console.info(line)
  else if (level === 'warn') console.warn(line)
  else console.error(line)
}
export const log = {
  info: (event: string, fields?: Fields) => { emit('info', event, fields) },
  warn: (event: string, fields?: Fields) => { emit('warn', event, fields) },
  error: (event: string, fields?: Fields) => { emit('error', event, fields) },
}
```
- [ ] **Step 10:** `npx vitest run --project unit` → PASS; `make lint` → clean; `npx vite build` → succeeds.
- [ ] **Step 11:** commit `chore: scaffold vite+preact+ts with strict lint, coverage, logger`.
---

### Task 2: dates + nutrition

**Files:** `src/dates.ts`, `src/nutrition.ts`, `tests/dates.test.ts`, `tests/nutrition.test.ts`.

**Produces:**
- `localDateKey(d: Date): string` (local `YYYY-MM-DD`), `addDays(key: string, n: number): string`, `daysBetween(a: string, b: string): number` (b − a, whole days, DST-safe via UTC noon), `feedDateToKey(mmddyyyy: string): string` (throws on bad format).
- `interface Nutrients { calories; protein; carbs; fat; fiber; sugar; sodium: number }`, `NUTRIENT_KEYS` (readonly tuple), `zeroNutrients()`, `scaleNutrients(n, servings)`, `sumNutrients(list)`, `round1(n)`.

- [ ] **Step 1: failing tests**
```ts
// tests/dates.test.ts
import { expect, test } from 'vitest'
import { addDays, daysBetween, feedDateToKey, localDateKey } from '../src/dates'
test('localDateKey uses local calendar date', () => { expect(localDateKey(new Date(2026, 8, 18, 23, 59))).toBe('2026-09-18') })
test('addDays crosses month/year and DST boundaries', () => {
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  expect(addDays('2026-03-08', -1)).toBe('2026-03-07')
})
test('daysBetween', () => { expect(daysBetween('2026-09-01', '2026-09-22')).toBe(21); expect(daysBetween('2026-09-22', '2026-09-01')).toBe(-21) })
test('feedDateToKey', () => {
  expect(feedDateToKey('09/18/2026')).toBe('2026-09-18')
  expect(() => feedDateToKey('2026-09-18')).toThrow(/feed date/)
})
test('addDays rejects malformed key', () => { expect(() => addDays('nope', 1)).toThrow(/date key/) })
```
```ts
// tests/nutrition.test.ts
import { expect, test } from 'vitest'
import { round1, scaleNutrients, sumNutrients, zeroNutrients, type Nutrients } from '../src/nutrition'
const a: Nutrients = { calories: 146, protein: 22.4, carbs: 1.1, fat: 4.7, fiber: 0, sugar: 0, sodium: 108 }
test('scale by 1.5', () => { expect(scaleNutrients(a, 1.5)).toEqual({ calories: 219, protein: 33.6, carbs: 1.65, fat: 7.05, fiber: 0, sugar: 0, sodium: 162 }) })
test('sum and zero', () => { expect(sumNutrients([])).toEqual(zeroNutrients()); expect(sumNutrients([a, a]).calories).toBe(292) })
test('round1', () => { expect(round1(1.25)).toBe(1.3); expect(round1(-0.04)).toBe(0) })
```
  Use `toBeCloseTo` per field if float error bites on `1.65`/`7.05`.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: implement**
```ts
// src/dates.ts
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/
function parts(key: string): [number, number, number] {
  const m = KEY.exec(key)
  if (!m) throw new Error(`invalid date key: ${key}`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}
const pad = (n: number): string => String(n).padStart(2, '0')
export function localDateKey(d: Date): string { return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function utcNoon(key: string): number { const [y, m, d] = parts(key); return Date.UTC(y, m - 1, d, 12) }
export function addDays(key: string, n: number): string {
  const t = new Date(utcNoon(key) + n * 86_400_000)
  return `${String(t.getUTCFullYear())}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}
export function daysBetween(a: string, b: string): number { return Math.round((utcNoon(b) - utcNoon(a)) / 86_400_000) }
export function feedDateToKey(s: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (!m) throw new Error(`invalid feed date: ${s}`)
  return `${m[3] ?? ''}-${m[1] ?? ''}-${m[2] ?? ''}`
}
```
```ts
// src/nutrition.ts
export interface Nutrients { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }
export const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const
export function zeroNutrients(): Nutrients { return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 } }
export function scaleNutrients(n: Nutrients, servings: number): Nutrients {
  const out = zeroNutrients(); for (const k of NUTRIENT_KEYS) out[k] = n[k] * servings; return out
}
export function sumNutrients(list: readonly Nutrients[]): Nutrients {
  const out = zeroNutrients(); for (const n of list) for (const k of NUTRIENT_KEYS) out[k] += n[k]; return out
}
export function round1(n: number): number { const r = Math.round(n * 10) / 10; return r === 0 ? 0 : r }
```
- [ ] **Step 4:** run → PASS, coverage 100% for both files.
- [ ] **Step 5:** commit `feat: date keys and nutrient math`.
---

### Task 3: Menu feed parser + selection

**Files:** `src/menu/feed.ts`, `src/menu/select.ts`, `tests/fixtures/feed-sample.json`, `tests/menu-feed.test.ts`, `tests/menu-select.test.ts`, `tests/menu-live.test.ts`.

**Consumes:** `Nutrients`, `feedDateToKey`, `log`.
**Produces:**
```ts
export const FEED_URL = 'https://hf-foodpro.austin.utexas.edu/foodpro/data_all_endpoint.php?menu=1'
export type HallId = 'J2' | 'JCL' | 'Kins'
export interface MenuItem { recipeNumber: string; name: string; station: string; portion: string; nutrients: Nutrients; legends: readonly string[] }
export interface MealMenu { name: string; items: readonly MenuItem[] }
export interface HallMenu { hall: HallId; meals: readonly MealMenu[] }
export interface Menu { cachedAt: string; dates: readonly string[]; days: Readonly<Record<string, readonly HallMenu[]>> }
export function parseFeed(json: unknown): Menu
export async function fetchMenu(fetchFn: typeof fetch): Promise<Menu>
// select.ts
export const HALLS: readonly { id: HallId; label: string }[]  // J2 "J2", JCL "JCL", Kins "Kins"
export function groupByStation(items: readonly MenuItem[]): { station: string; items: MenuItem[] }[]   // preserves feed order
export function currentMeal(available: readonly string[], now: Date): string | null
```

Feed facts (see spec): location nums `'12'→J2`, `'12(a)'→JCL`, `'03'→Kins`; unknown location → `log.warn('menu.unknown_location', {num})` and skip. Station header rows: `number === ''` and name matches `/^--\s*(.+?)\s*--$/`. Items before any header get station `'Other'`. Recipe lookup in `data_object.recipes_data[number]`; missing recipe → `log.warn('menu.missing_recipe')` + skip. Nutrients map: `Cals→calories, Prot→protein, Carb→carbs, Fat-T→fat, Fiber→fiber, Sugar→sugar, Sod→sodium`; required (`Cals, Prot, Carb, Fat-T`) must parse finite ≥ 0 else skip item with warn; optional missing/non-finite → 0. Portion = `${portionSize} ${portionUnit}`.trim() or `'1 serving'` if empty. Legends mapped via `global_data.legendInfo[code + '_lbl']`, unknown codes kept raw. Top-level shape errors (not an object, missing `days`/`menuWindow.dates`/`data_object.recipes_data`) throw `Error('UT menu feed format changed: <path>')`.

`currentMeal`: minutes = h*60+m; preferred = `<630` Breakfast, `<960` Lunch, else Dinner; return the available name equal (case-insensitive) to preferred; else if preferred is Breakfast and 'Brunch' available return it; else first available; empty → null.

- [ ] **Step 1: record fixture.** `curl -s "$FEED_URL" | node -e '<script>'` that keeps `last_cached`, `menuWindow` (first date only), `days[firstDate]` with each location's first meal truncated to its first 2 station groups, plus `recipes_data` entries referenced, plus `global_data`. Hand-append to that fixture one extra location `{"locationNum":"99","locationName":"Test Hall","meals":[]}` and one recipe row `{"number":"999999","name":"Ghost Item","serv":"1"}` absent from recipes_data, and one recipe `{"number":"999998","name":"Blank Cals Item",...}` in both the meal and recipes_data whose `Cals` value is `""`. Save as `tests/fixtures/feed-sample.json`. (Real recorded data, edited to include edge rows — input data, not a fake.)
- [ ] **Step 2: failing tests** (`tests/menu-feed.test.ts`):
```ts
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseFeed } from '../src/menu/feed'
const raw: unknown = JSON.parse(readFileSync(new URL('./fixtures/feed-sample.json', import.meta.url), 'utf8'))
test('parses halls, meals, stations, nutrients from real feed sample', () => {
  const menu = parseFeed(raw)
  const day = menu.days[menu.dates[0] ?? '']
  expect(day?.map(h => h.hall).sort()).toEqual(['J2', 'JCL', 'Kins'])
  const item = day?.[0]?.meals[0]?.items[0]
  expect(item?.station).not.toBe('')
  expect(item?.portion).toMatch(/\S/)
  expect(Number.isFinite(item?.nutrients.calories)).toBe(true)
})
test('skips unknown location, missing recipe, and non-numeric required nutrient', () => {
  const menu = parseFeed(raw)
  const names = Object.values(menu.days).flat().flatMap(h => h.meals.flatMap(m => m.items.map(i => i.name)))
  expect(names).not.toContain('Ghost Item')
  expect(names).not.toContain('Blank Cals Item')
})
test.each([[null, 'root'], [{}, 'menuWindow'], [{ menuWindow: { dates: [] }, days: {}, data_object: {} }, 'recipes_data']])(
  'throws on shape change %#', (bad, path) => { expect(() => parseFeed(bad)).toThrow(new RegExp(`format changed: .*${path}`)) })
```
  Add targeted tests for: header regex, items before header → `'Other'`, optional nutrient missing → 0, empty portion → `'1 serving'`, unknown legend code kept raw — build these inputs by deep-cloning the fixture and editing one field (`structuredClone`). Also `select` tests: `groupByStation` order; `currentMeal` at 08:00/12:00/18:00, Brunch fallback on a weekend list `['Brunch','Dinner']` at 09:00, first-available fallback, `[]` → null.
- [ ] **Step 3:** run → FAIL.
- [ ] **Step 4:** implement `feed.ts` with small readers: `obj(v, path): Record<string, unknown>` (throws format error), `arr(v, path): unknown[]`, `str(v, path): string`, `num(v): number | null` (`parseFloat`, finite and ≥0 else null). These narrow `unknown` with `typeof`/`Array.isArray` — no casts. `fetchMenu(fetchFn)` = `const r = await fetchFn(FEED_URL); if (!r.ok) throw new Error(\`UT menu HTTP ${r.status}\`); return parseFeed(await r.json())`. Implement `select.ts`.
- [ ] **Step 5:** live integration test `tests/menu-live.test.ts` (real network, no mocks):
```ts
import { expect, test } from 'vitest'
import { fetchMenu } from '../src/menu/feed'
test('live UT feed parses with ≥1 hall and ≥20 items', async () => {
  const menu = await fetchMenu(fetch)
  expect(menu.dates.length).toBeGreaterThan(0)
  const items = Object.values(menu.days).flat().flatMap(h => h.meals.flatMap(m => m.items))
  expect(items.length).toBeGreaterThanOrEqual(20)
}, 30_000)
test('non-OK response throws', async () => {
  await expect(fetchMenu(() => fetch('https://hf-foodpro.austin.utexas.edu/foodpro/does-not-exist-404'))).rejects.toThrow(/UT menu HTTP/)
}, 30_000)
```
- [ ] **Step 6:** run all → PASS, coverage 100% on `src/menu/**`.
- [ ] **Step 7:** commit `feat: parse UT FoodPro menu feed`.
---

### Task 4: Goals

**Files:** `src/goals.ts`, `tests/goals.test.ts`.
**Produces:**
```ts
export type Sex = 'male' | 'female'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'cut' | 'maintain' | 'bulk'
export interface Targets { calories: number; protein: number; carbs: number; fat: number }
export interface Profile { sex: Sex; birthYear: number; heightIn: number; activity: Activity; goal: Goal; rateLbPerWeek: number;
  override: Partial<Targets> | null; adaptiveEnabled: boolean; tdeeEstimate: number | null; tdeeUpdatedOn: string | null; tdeePrevious: number | null }
export const ACTIVITY_FACTOR: Readonly<Record<Activity, number>>   // 1.2 1.375 1.55 1.725 1.9
export const RATE_OPTIONS: Readonly<Record<Goal, readonly number[]>> // cut [0.5,1,1.5,2] maintain [0] bulk [0.25,0.5,1]
export function bmr(p: Profile, weightLb: number, year: number): number
export function formulaTdee(p: Profile, weightLb: number, year: number): number
export function maintenance(p: Profile, weightLb: number, year: number): number
export function plannedDelta(p: Profile): number        // kcal/day, signed
export function computeTargets(p: Profile, weightLb: number, year: number): Targets
export function validateProfile(p: Profile): string[]   // human-readable errors; [] = valid
```
Formulas exactly per spec "Goal math". `validateProfile`: `1900 ≤ birthYear ≤ 2015` (matches DB check); heightIn 48–96; rate ∈ RATE_OPTIONS[goal]; override fields finite 0–10000.

- [ ] **Step 1: failing tests** — key cases:
```ts
const base: Profile = { sex: 'male', birthYear: 2006, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
  override: null, adaptiveEnabled: true, tdeeEstimate: null, tdeeUpdatedOn: null, tdeePrevious: null }
// 170 lb, 2026 → age 20; kg 77.111, cm 177.8; BMR = 771.11+1111.25-100+5 = 1787.36
test('bmr male', () => { expect(bmr(base, 170, 2026)).toBeCloseTo(1787.36, 1) })
test('bmr female', () => { expect(bmr({ ...base, sex: 'female' }, 170, 2026)).toBeCloseTo(1621.36, 1) })
// tdee = 1787.36·1.55 = 2770.4 → 2270; fat round(0.25·2270/9)=63; carbs round((2270−680−567)/4)=round(255.75)=256
test('cut 1 lb/wk targets', () => { expect(computeTargets(base, 170, 2026)).toEqual({ calories: 2270, protein: 170, fat: 63, carbs: 256 }) })
test('maintain uses 0.8 g/lb protein, delta 0', ...)
test('bulk adds rate*500', ...)
test('calorie floor male 1500 / female 1200', ...)   // tiny female sedentary cut 2 lb/wk
test('adaptive estimate overrides formula in maintenance()', ...)
test('override replaces only given fields', ...)
test('carbs never negative', ...)                     // override protein 400 at low calories
test('validateProfile reports each bad field', ...)
```
  For each `...` test, compute the expected numbers by hand from the spec formulas and write them in a comment above the assertion, as done for the cut case.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** PASS + 100%. **Step 5:** commit `feat: goal targets`.
---

### Task 5: Adaptive TDEE

**Files:** `src/adaptive.ts`, `tests/adaptive.test.ts`.
**Consumes:** `addDays`, `daysBetween`.
**Produces:**
```ts
export interface WeightPoint { date: string; weightLb: number }
export interface DayIntake { date: string; calories: number }   // only days with ≥1 entry
export function ewmaTrend(points: readonly WeightPoint[], alpha?: number): WeightPoint[]   // sorted asc; trend0 = first weight; t = t + α(w − t)
export type AdaptiveResult =
  | { kind: 'not-due' }
  | { kind: 'insufficient'; loggedDaysNeeded: number; weighInsNeeded: number }
  | { kind: 'updated'; previous: number; next: number; estimate: number; actualLbPerWeek: number; plannedLbPerWeek: number; reason: string }
export function evaluateAdaptive(a: { today: string; lastRunOn: string | null; previous: number; plannedLbPerWeek: number;
  weights: readonly WeightPoint[]; intake: readonly DayIntake[] }): AdaptiveResult
```
Rules (spec "Adaptive TDEE"): not-due if `lastRunOn` and `daysBetween(lastRunOn, today) < 7`. Window = dates `> addDays(today,-21)` and `≤ today`. Need `≥14` intake days and `≥8` weigh-ins in window, else insufficient with `max(0, 14−n)` / `max(0, 8−m)`. Trend over **all** weights; take trend points inside window; `span = daysBetween(first.date, last.date)`; if `span < 7` return `{ kind: 'insufficient', loggedDaysNeeded: 0, weighInsNeeded: 1 }` (weigh-ins too bunched to measure a trend). `estimate = mean(intake cals) − (Δtrend × 3500 / span)`; `blended = 0.5·estimate + 0.5·previous`; `next = round(previous + clamp(blended − previous, −150, 150))`. `actualLbPerWeek = Δtrend / span × 7` (1 decimal). `plannedLbPerWeek` signed (cut negative). reason: if |actual − planned| < 0.2 → "you're right on pace"; if planned < 0 and actual > planned → "you're losing slower than planned"; if planned < 0 and actual < planned → "you're losing faster than planned"; planned > 0 analogous with "gaining"; planned = 0 → "your weight is drifting up"/"down".

- [ ] **Step 1: failing tests** — construct 21 days of synthetic intake (2400/day) and weights falling 0.5 lb/wk from 170, previous 2600 → estimate ≈ 2400 + 250 = 2650 before smoothing; assert `next` within clamp and kind `updated`; not-due case; insufficient counts; clamp both directions; each reason branch; `ewmaTrend` on unsorted input returns sorted; span<7 case.
- [ ] **Step 2–4:** FAIL → implement → PASS 100%. **Step 5:** commit `feat: adaptive TDEE from weight trend`.
---

### Task 6: Row types + search

**Files:** `src/db/types.ts`, `src/search.ts`, `tests/search.test.ts`.
**Produces (`db/types.ts`):**
```ts
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: readonly Meal[] = ['breakfast', 'lunch', 'dinner', 'snack']
export interface SyncMeta { id: string; updatedAt: string; deletedAt: string | null }
export interface LogEntry extends SyncMeta { date: string; meal: Meal; hall: string | null; station: string | null; name: string;
  recipeNumber: string | null; customFoodId: string | null; portion: string; servings: number; perServing: Nutrients }
export interface CustomFood extends SyncMeta { name: string; portion: string; perServing: Nutrients }
export interface WeightEntry extends SyncMeta { date: string; weightLb: number }
export interface ProfileRow extends SyncMeta, Profile {}   // id = user id
export interface Tables { food_log: LogEntry; custom_foods: CustomFood; weights: WeightEntry; profile: ProfileRow }
export type TableName = keyof Tables
```
**Produces (`search.ts`):**
```ts
export interface SearchItem { key: string; name: string; source: 'menu' | 'history' | 'custom'; hall: string | null; station: string | null;
  portion: string; nutrients: Nutrients; recipeNumber: string | null; customFoodId: string | null }
export function buildIndex(src: { menu: Menu | null; history: readonly LogEntry[]; customFoods: readonly CustomFood[] }): SearchItem[]
export function searchItems(index: readonly SearchItem[], query: string, limit?: number): SearchItem[]   // default 40
```
Key: `r:<recipeNumber>` | `c:<customFoodId>` | `n:<lower name>|<portion>`. Precedence when keys collide: custom > menu > history (menu gives current hall/station). Deleted rows (`deletedAt !== null`) excluded. Menu items across all days/halls. Search: lowercase, split on whitespace; every token must be a substring of `name + ' ' + (hall ?? '') + ' ' + (station ?? '')`; score 0 if name startsWith full query, 1 if any name word startsWith first token, 2 otherwise; sort score, then name. Empty/whitespace query → `[]`.

- [ ] Steps: failing tests (dedup precedence, deleted excluded, multi-token AND, ranking, limit, empty query, null menu) → FAIL → implement → PASS 100% → commit `feat: unified food search`.
---

### Task 7: Supabase schema + RLS (integration, real local DB)

**Files:** `supabase/config.toml` (via `supabase init`), `supabase/migrations/20260918000000_init.sql`, `src/db/codec.ts`, `tests/codec.test.ts`, `tests/rls.test.ts`, `tests/helpers/supabase.ts`.

- [ ] **Step 1:** `supabase init`; in `supabase/config.toml` set `[auth.email] enable_confirmations = false`. `make db-env` → `.env.test` created.
- [ ] **Step 2:** migration:
```sql
create table public.profile (
  id uuid primary key default auth.uid() references auth.users on delete cascade,
  sex text not null check (sex in ('male','female')),
  birth_year int not null check (birth_year between 1900 and 2015),
  height_in numeric not null check (height_in between 48 and 96),
  activity text not null check (activity in ('sedentary','light','moderate','active','very_active')),
  goal text not null check (goal in ('cut','maintain','bulk')),
  rate_lb_per_week numeric not null check (rate_lb_per_week between 0 and 2),
  override jsonb, adaptive_enabled boolean not null default true,
  tdee_estimate numeric, tdee_updated_on date, tdee_previous numeric,
  updated_at timestamptz not null, deleted_at timestamptz);
create table public.food_log (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null, meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  hall text, station text, name text not null check (length(name) between 1 and 200),
  recipe_number text, custom_food_id uuid, portion text not null, servings numeric not null check (servings > 0 and servings <= 50),
  per_serving jsonb not null, updated_at timestamptz not null, deleted_at timestamptz);
create table public.custom_foods (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 200), portion text not null, per_serving jsonb not null,
  updated_at timestamptz not null, deleted_at timestamptz);
create table public.weights (
  id uuid primary key, user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null, weight_lb numeric not null check (weight_lb between 50 and 700),
  updated_at timestamptz not null, deleted_at timestamptz, unique (user_id, date));
create index on public.food_log (user_id, updated_at);
create index on public.custom_foods (user_id, updated_at);
create index on public.weights (user_id, updated_at);
alter table public.profile enable row level security;
alter table public.food_log enable row level security;
alter table public.custom_foods enable row level security;
alter table public.weights enable row level security;
create policy own_profile on public.profile for all using (id = auth.uid()) with check (id = auth.uid());
create policy own_log on public.food_log for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_custom on public.custom_foods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_weights on public.weights for all using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke delete on public.profile, public.food_log, public.custom_foods, public.weights from anon, authenticated;
```
  Weights unique `(user_id,date)`: the client must reuse the existing row id for a date (store enforces; see Task 8).
- [ ] **Step 3:** `supabase db reset` → applies cleanly.
- [ ] **Step 4:** `src/db/codec.ts`:
```ts
export function toRemote<T extends TableName>(table: T, row: Tables[T]): Record<string, unknown>
export function fromRemote<T extends TableName>(table: T, rec: unknown): Tables[T]   // validates every field; throws Error('bad <table> row: <field>')
```
  snake_case mapping per migration; `profile.id`↔`id`; `per_serving` validated as Nutrients (7 finite ≥0 numbers); dates `YYYY-MM-DD`; `updated_at` any ISO string (normalize via `new Date(x).toISOString()`). Implement per-table readers with the Task 3 narrowing helpers (move `obj/str/num` into `src/guard.ts` and have `menu/feed.ts` import them — one copy).
  `tests/codec.test.ts`: round-trip each table; each validation failure branch.
- [ ] **Step 5:** `tests/helpers/supabase.ts`: reads `.env.test` (`node:fs` parse `KEY=VALUE`), `newUserClient(): Promise<{ client: SupabaseClient; userId: string }>` → `createClient(url, anon, { auth: { persistSession: false } })` then `auth.signUp({ email: \`t-${crypto.randomUUID()}@example.test\`, password: crypto.randomUUID() })`.
- [ ] **Step 6:** `tests/rls.test.ts` (real DB): user A upserts one row per table; user B `select` on each returns `[]`; B `upsert` of a row with A's `user_id` → error; A `delete` → error/0 rows (no delete grant); `check` constraints reject `servings: 0` and `weight_lb: 5`.
- [ ] **Step 7:** `make test` → PASS 100%. Commit `feat: supabase schema with RLS and row codec`.
---

### Task 8: LocalStore + SyncEngine (browser-mode tests, real IndexedDB + real local Supabase)

**Files:** `src/sync/store.ts`, `src/sync/engine.ts`, `tests/browser/store.test.ts`, `tests/browser/sync.test.ts`, `tests/browser/env.ts`.

**Produces:**
```ts
// store.ts
export interface OutboxItem { seq: number; table: TableName; id: string; attempts: number; failed: string | null }
export class LocalStore {
  static open(dbName: string): Promise<LocalStore>
  put<T extends TableName>(table: T, row: Tables[T]): Promise<void>          // sets updatedAt=now ISO; row + outbox in ONE tx
  remove<T extends TableName>(table: T, id: string): Promise<void>           // soft delete: deletedAt=now, via put
  get<T extends TableName>(table: T, id: string): Promise<Tables[T] | undefined>
  all<T extends TableName>(table: T): Promise<Tables[T][]>                   // excludes deleted
  logForDate(date: string): Promise<LogEntry[]>                               // index 'date'
  weightForDate(date: string): Promise<WeightEntry | undefined>              // index 'date'
  outbox(): Promise<OutboxItem[]>
  ackOutbox(seq: number): Promise<void>
  bumpOutbox(seq: number, failed: string | null): Promise<void>               // attempts+1, failed reason
  applyRemote<T extends TableName>(table: T, rows: readonly Tables[T][]): Promise<void>  // LWW on updatedAt; skip if a pending outbox item exists for that id
  getMeta(key: string): Promise<string | undefined>; setMeta(key: string, value: string): Promise<void>
  onChange(fn: () => void): () => void                                        // notify UI after any write
}
// engine.ts
export function backoffMs(attempt: number): number                           // min(2000·2^attempt, 300000)
export class SyncEngine {
  constructor(store: LocalStore, client: SupabaseClient, userId: string)
  push(): Promise<{ pushed: number; failed: number }>   // per item: read row, upsert toRemote(...,user_id), ack; network error → stop & throw; PostgREST 4xx → bumpOutbox(failed=message)
  pull(): Promise<number>                               // per table: select * where updated_at > cursor order by updated_at; fromRemote; applyRemote; cursor=max
  runOnce(): Promise<void>                              // push then pull; logs; schedules retry via backoff on network error
  start(): void; stop(): void                           // listens to 'online' & visibilitychange; interval 60s
  pending(): Promise<{ queued: number; failed: number }>
}
```
IDB schema (version 1): stores `food_log`, `custom_foods`, `weights`, `profile` (keyPath `id`; `food_log` & `weights` index `date`), `outbox` (keyPath `seq`, autoIncrement, index `id`), `meta` (out-of-line keys). Distinguish network vs rejection: supabase-js returns `{ error }` with `code`; treat `error.message` containing `Failed to fetch`/`NetworkError` or missing `code` as network (throw), else rejection.

- [ ] **Step 1:** `tests/browser/env.ts` exports `SUPABASE_URL`/`ANON_KEY` from `import.meta.env` (vitest loads `.env.test` via `loadEnv` in config: `test.env = loadEnv('test', process.cwd(), '')`).
- [ ] **Step 2: failing browser tests** (`store.test.ts`): put writes row and one outbox item atomically; remove soft-deletes and `all` hides it; `applyRemote` older row loses, newer wins, pending-outbox id is skipped; `logForDate` filters; `onChange` fires; each test uses a unique db name (`crypto.randomUUID()`).
  (`sync.test.ts`, real local Supabase): signUp user; put a LogEntry + WeightEntry; `push()` → rows in Supabase (verify via client select); outbox empty. Second LocalStore (new db, same user = "laptop") `pull()` → sees both rows. Edit on device 2, push, device 1 pull → updated. Rejection path: put a LogEntry with `servings: 0` → `push()` returns `failed: 1`, `pending().failed === 1`, not retried by next push. Network path: client created with URL `http://127.0.0.1:9` → `push()` rejects; outbox retained. `backoffMs(0)=2000, (3)=16000, (20)=300000`.
- [ ] **Step 3:** run `npx vitest run --project browser` → FAIL. **Step 4:** implement. **Step 5:** PASS; `make test` 100%. **Step 6:** commit `feat: local-first store with outbox sync`.

Continue with Part 2.
