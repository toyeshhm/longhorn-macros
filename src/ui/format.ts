// Thousands separators everywhere a kcal/mg figure is printed, so one value never appears two ways.
export const n = (v: number): string => Math.round(v).toLocaleString('en-US')
