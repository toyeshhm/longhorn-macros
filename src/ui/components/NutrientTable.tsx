import { NUTRIENT_KEYS, round1, type Nutrients } from '../../nutrition'
import { n } from '../format'
import { Swatch } from '../icons/Marks'

const NUTRIENT_LABELS: Readonly<Record<keyof Nutrients, { label: string; unit: string }>> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  sugar: { label: 'Sugar', unit: 'g' },
  sodium: { label: 'Sodium', unit: 'mg' },
}

// One column per set of numbers; `values: null` prints em dashes (servings text that doesn't parse).
// `head: null` on every column (the menu's single-column case) drops the header row entirely.
export interface NutrientColumn { head: string | null; values: Nutrients | null }

export function NutrientTable({ caption, columns }: { caption: string; columns: readonly NutrientColumn[] }) {
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
            <th scope="row">{(k === 'protein' || k === 'carbs' || k === 'fat') && <Swatch ink={k} />}{NUTRIENT_LABELS[k].label}</th>
            {/* kcal and mg are whole-unit figures and go through n(), so the sheet prints the same string as the
                row the user tapped; round1 is for the gram macros only. */}
            {columns.map((c, i) => (
              <td key={i}>{c.values === null ? '—' : `${k === 'calories' || k === 'sodium' ? n(c.values[k]) : String(round1(c.values[k]))} ${NUTRIENT_LABELS[k].unit}`}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
