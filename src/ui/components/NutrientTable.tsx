import type { Key } from '../../i18n'
import { NUTRIENT_KEYS, type Nutrients } from '../../nutrition'
import { useT } from '../i18n'
import { Swatch } from '../icons/Marks'

const NUTRIENT_LABELS: Readonly<Record<keyof Nutrients, { label: Key; unit: Key }>> = {
  calories: { label: 'nutrient.calories', unit: 'unit.kcal' },
  protein: { label: 'nutrient.protein', unit: 'unit.g' },
  carbs: { label: 'nutrient.carbs', unit: 'unit.g' },
  fat: { label: 'nutrient.fat', unit: 'unit.g' },
  fiber: { label: 'nutrient.fiber', unit: 'unit.g' },
  sugar: { label: 'nutrient.sugar', unit: 'unit.g' },
  sodium: { label: 'nutrient.sodium', unit: 'unit.mg' },
}

// One column per set of numbers; `values: null` prints em dashes (servings text that doesn't parse).
// `head: null` on every column (the menu's single-column case) drops the header row entirely.
export interface NutrientColumn { head: string | null; values: Nutrients | null }

export function NutrientTable({ caption, columns }: { caption: string; columns: readonly NutrientColumn[] }) {
  const t = useT()
  const heads = columns.map((c) => c.head)
  return (
    <table class="nutrients">
      <caption>{caption}</caption>
      {heads.some((h) => h !== null) && (
        <thead>
          <tr>
            <td />
            {heads.map((h, i) => <th key={i} scope="col">{h}</th>)}
          </tr>
        </thead>
      )}
      <tbody>
        {NUTRIENT_KEYS.map((k) => (
          <tr key={k} class={k === 'calories' ? 'kcal-row' : undefined}>
            <th scope="row">{(k === 'calories' || k === 'protein' || k === 'carbs' || k === 'fat') && <Swatch ink={k} />}{t.t(NUTRIENT_LABELS[k].label)}</th>
            {/* kcal and mg are whole-unit figures and go through t.n(), so the sheet prints the same string as the
                row the user tapped; t.d() and its one decimal are for the gram macros only. */}
            {columns.map((c, i) => (
              <td key={i}>{c.values === null ? '—' : `${k === 'calories' || k === 'sodium' ? t.n(c.values[k]) : t.d(c.values[k])} ${t.t(NUTRIENT_LABELS[k].unit)}`}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
