import { describe, expect, test } from 'vitest'
import type { LogEntry, ProfileRow } from '../src/db/types'
import { dateLabel } from '../src/dates'
import type { Targets } from '../src/goals'
import { adherence, dailyTotals, macroReads, qualitySignals, plantShare, todayRead } from '../src/health'
import {
  DEFAULT_LOCALE, en, es, interpolate, isLocale, LOCALES, LOCALE_STORAGE_KEY, parts, translator,
  type Dictionary,
} from '../src/i18n'
import { dayNames, dayText, formatTime, hallStatus, hoursLine, parseDay, statusText, type Week } from '../src/menu/hours'
import { adaptiveStatus, predictionNote, signed, summarize } from '../src/progress'
import { zeroNutrients, type Nutrients } from '../src/nutrition'

const keys = (d: Dictionary): string[] => Object.keys(d).sort()
const slots = (template: string): string[] =>
  parts(template).flatMap((p) => (typeof p === 'string' ? [] : [p.slot])).sort()

// --------------------------------------------------------------------------------------------- the key set

describe('the dictionaries', () => {
  test('Spanish carries exactly the English keys: no gaps, no extras, nothing empty', () => {
    // `Dictionary` makes both of these compile errors too; this is the runtime half of the same promise.
    expect(keys(es)).toEqual(keys(en))
    for (const [key, value] of Object.entries(es)) expect(value.trim(), key).not.toBe('')
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe('')
  })

  test('no Spanish string invents a placeholder the English one does not have', () => {
    // A hole with no value prints as "{name}" on screen, so an invented one is a visible bug and a dropped one
    // silently loses a number. Dropping is allowed where Spanish does not need the figure; each case is named.
    const spanish: Readonly<Record<string, string>> = es
    const dropped: string[] = []
    for (const [key, english] of Object.entries(en)) {
      const source = slots(english)
      const target = slots(spanish[key] ?? '')
      expect(target.filter((s) => !source.includes(s)), key).toEqual([])
      if (target.length !== source.length) dropped.push(key)
    }
    // "on the 1 day you logged" reads badly with the number in Spanish: "en el único día que registraste".
    expect(dropped).toEqual(['health.per.one'])
  })

  test('no dictionary string carries a grouped number: every figure goes through t.n()', () => {
    // The Spanish fiber line used to spell "1.000" into the template while every figure beside it came out of
    // es-ES CLDR ungrouped below 10,000, so one paragraph printed four-digit numbers two ways. A number a
    // template writes is a number no locale gets to format, so no template writes one.
    const grouped = /\d[.,]\d{3}(?!\d)/
    for (const [key, value] of [...Object.entries(en), ...Object.entries(es)]) {
      expect(grouped.test(value), `${key}: ${value}`).toBe(false)
    }
  })

  test('English is the default and only the two published locales are accepted from storage', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(LOCALES).toEqual(['en', 'es'])
    expect(LOCALE_STORAGE_KEY).toBe('lm-locale')
    for (const l of LOCALES) expect(isLocale(l)).toBe(true)
    for (const junk of [null, '', 'EN', 'fr', 42, undefined]) expect(isLocale(junk)).toBe(false)
  })
})

// ------------------------------------------------------------------------------------------- interpolation

describe('interpolation', () => {
  test('a template splits into text and holes, alternating, text first and last', () => {
    expect(parts('plain')).toEqual(['plain'])
    expect(parts('{a}')).toEqual(['', { slot: 'a' }, ''])
    expect(parts('{a} of {b} kcal')).toEqual(['', { slot: 'a' }, ' of ', { slot: 'b' }, ' kcal'])
    expect(parts('')).toEqual([''])
  })

  test('an unclosed brace is text, not a lost sentence', () => {
    expect(parts('100% {sure')).toEqual(['100% {sure'])
    expect(interpolate('100% {sure', {})).toBe('100% {sure')
  })

  test('values fill their holes, in any order, and repeat as often as the template asks', () => {
    expect(interpolate('{a} of {b}', { a: '600', b: '2,000' })).toBe('600 of 2,000')
    expect(interpolate('{b} then {a}', { a: 1, b: 2 })).toBe('2 then 1')
    expect(interpolate('{a}{a}', { a: 'x' })).toBe('xx')
  })

  test('a hole with no value keeps its own name, so a missing parameter is visible rather than a gap', () => {
    expect(interpolate('{a} of {b}', { a: '600' })).toBe('600 of {b}')
  })
})

// -------------------------------------------------------------------------------------------- formatting

describe('a translator', () => {
  const t = { en: translator('en'), es: translator('es') } as const

  test('is the same object for the same locale, and knows which one it is', () => {
    expect(translator('es')).toBe(t.es)
    expect(t.en.locale).toBe('en')
    expect(t.es.locale).toBe('es')
  })

  test('looks a key up, with and without parameters', () => {
    expect(t.en.t('common.save')).toBe('Save')
    expect(t.es.t('common.save')).toBe('Guardar')
    expect(t.es.t('food.portion', { portion: '1 taza' })).toBe('Porción: 1 taza')
  })

  test('hands back an unfilled template split into parts for the lines that set a figure in its own element', () => {
    expect(t.en.rich('today.eatenOf')).toEqual(['', { slot: 'eaten' }, ' eaten of ', { slot: 'target' }, ''])
    expect(t.es.rich('today.eatenOf')).toEqual(['', { slot: 'eaten' }, ' consumidas de ', { slot: 'target' }, ''])
  })

  test('groups whole figures and marks decimals the way the language does', () => {
    expect(t.en.n(1234.6)).toBe('1,235')
    expect(t.es.n(1234.6)).toBe('1235') // es-ES leaves four digits unseparated, as the RAE has it
    expect(t.en.n(12345)).toBe('12,345')
    expect(t.es.n(12345)).toBe('12.345')
    expect(t.en.d(1.25)).toBe('1.3')
    expect(t.es.d(1.25)).toBe('1,3')
    expect(t.es.d(170)).toBe('170')
  })

  test('writes a date day-first in Spanish and month-first in English', () => {
    const at = new Date(2026, 8, 19, 12)
    expect(t.en.date(at, { month: 'numeric', day: 'numeric' })).toBe('9/19')
    expect(t.es.date(at, { month: 'numeric', day: 'numeric' })).toBe('19/9')
    expect(t.en.date(at, { weekday: 'long' })).toBe('Saturday')
    expect(t.es.date(at, { weekday: 'long' })).toBe('sábado')
  })

  test('says how long ago in the reader’s language', () => {
    expect(t.en.rel(-2, 'hour')).toBe('2 hours ago')
    expect(t.es.rel(-2, 'hour')).toBe('hace 2 horas')
  })

  test('knows which clock the language reads', () => {
    expect(t.en.hour12).toBe(true)
    expect(t.es.hour12).toBe(false)
  })
})

// ----------------------------------------------------------------------------- the modules that write prose

const targets: Targets = { calories: 2000, protein: 150, carbs: 200, fat: 60 }
const nutrients = (over: Partial<Nutrients>): Nutrients => ({ ...zeroNutrients(), ...over })
const entry = (date: string, over: Partial<Nutrients>): LogEntry => ({
  id: date, date, meal: 'lunch', hall: 'J2', station: 'Grill', name: 'Grilled Chicken', recipeNumber: null,
  customFoodId: null, portion: '1 each', servings: 1, updatedAt: '', deletedAt: null, perServing: nutrients(over),
})

describe('Spanish across the app', () => {
  const spanish = translator('es')

  test('the day chip prints the date day-first with a Spanish weekday, and speaks both before the full date', () => {
    const { date, weekday, full } = dateLabel('2026-09-19', spanish)
    expect({ date, weekday }).toEqual({ date: '19/9', weekday: 'sáb' })
    expect(full).toBe('19/9 sáb, sábado, 19 de septiembre')
    // WCAG 2.5.3 holds in every language: the spoken name starts with what the chip prints.
    expect(full.startsWith(`${date} ${weekday}`)).toBe(true)
  })

  test('the hours read on a 24-hour clock, because that is the clock Spanish reads', () => {
    expect(formatTime(0, spanish)).toBe('Medianoche')
    expect(formatTime(16 * 60 + 30, spanish)).toBe('16:30')
    expect(formatTime(9 * 60, spanish)).toBe('9:00')
    expect(formatTime(22 * 60, spanish)).toBe('22:00')
    expect(dayText(parseDay('4:30pm-9:00pm'), spanish)).toBe('16:30–21:00')
    expect(dayText([], spanish)).toBe('Cerrado')
    expect(dayText(null, spanish)).toBe('Desconocido')
    expect(dayNames(spanish)).toEqual(['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'])
  })

  test('the hall line says the state in words, then the windows, in Spanish', () => {
    const open: Week = Array.from({ length: 7 }, () => parseDay('9:00am-2:00pm|4:30pm-9:00pm'))
    const monday1pm = new Date(2026, 8, 14, 13)
    expect(statusText(hallStatus(open, monday1pm, spanish), spanish)).toBe('Abierto hasta las 14:00 · reabre a las 16:30')
    expect(hoursLine(open, monday1pm, 0, spanish)).toEqual({
      head: 'Abierto hasta las 14:00 · reabre a las 16:30', detail: 'Hoy 9:00–14:00, 16:30–21:00',
    })
    expect(hoursLine(open, monday1pm, 1, spanish).head).toBe('mar 9:00–14:00, 16:30–21:00')
    const shut: Week = Array.from({ length: 7 }, () => [])
    expect(statusText(hallStatus(shut, monday1pm, spanish), spanish)).toBe('Cerrado hoy')
    expect(statusText({ state: 'unknown' }, spanish)).toBe('Horario no disponible')
    // A hall that opens again tomorrow names the day, and "mañana" is a word, not a weekday.
    const weekdaysOnly: Week = [[], ...Array.from({ length: 6 }, () => parseDay('9:00am-2:00pm'))]
    expect(statusText(hallStatus(weekdaysOnly, monday1pm, spanish), spanish)).toBe('Cerrado hoy · abre mañana a las 9:00')
  })

  test('the week reads with Spanish numbers and Spanish sentences', () => {
    const days = dailyTotals([
      entry('2026-09-18', { calories: 1800, protein: 100, carbs: 180, fat: 60, fiber: 12, sodium: 3000, sugar: 40 }),
      entry('2026-09-19', { calories: 1800, protein: 100, carbs: 180, fat: 60, fiber: 12, sodium: 3000, sugar: 40 }),
    ])
    const a = adherence(days, targets, spanish)
    expect(a.coverage).toBe('2 de 7 días registrados')
    expect(a.headline).toBe('Media de 1800 kcal en los 2 días que registraste frente a 2000. Unas 200 por debajo.')
    expect(adherence([], targets, spanish).headline)
      .toBe('No hay nada registrado en los últimos 7 días, así que todavía no hay media que leer.')

    const [protein] = macroReads(days, targets, spanish)
    expect(protein?.label).toBe('Proteína')
    expect(protein?.share).toBe('22,2% de las calorías · objetivo 30%')
    expect(protein?.note).toBe('Bajo en 2 de 2 días registrados, media de 100 g frente a 150 g.')

    const [fiber, sodium] = qualitySignals(days, plantShare([], new Map()), spanish)
    expect(fiber?.label).toBe('Fibra')
    expect(fiber?.fact).toBe('6,7 g por cada 1000 kcal, frente a la marca de 14 g.')
    expect(sodium?.fact).toBe('3000 mg al día, frente a la marca de 2300 mg.')

    const today = todayRead([entry('2026-09-19', { calories: 600, protein: 40.5 })], targets, '2026-09-19', spanish)
    expect(today.line).toBe('600 de 2000 kcal hoy, quedan 1400. Proteína 40,5 de 150 g.')
    expect(todayRead([], targets, '2026-09-19', spanish).line)
      .toBe('Nada registrado hoy. Quedan 2000 kcal y 150 g de proteína.')
  })

  test('Progress prints its figures, its dates and its prompts in Spanish', () => {
    expect(signed(1.3, spanish)).toBe('+1,3')
    expect(signed(-2.4, spanish)).toBe('-2,4')
    expect(summarize({ trend: [], calories: [], range: '30', t: spanish }).changeLabel).toBe('Cambio (suavizado)')
    expect(summarize({
      trend: [{ date: '2026-09-18', value: 170 }, { date: '2026-09-19', value: 170.5 }],
      calories: [], range: '30', t: spanish,
    }).changeLabel).toBe('Cambio en un día (suavizado)')

    expect(predictionNote(2400, true, spanish))
      .toContain('con un mantenimiento de 2400 kcal al día y 3500 kcal por libra')
    expect(predictionNote(2400, false, spanish))
      .toContain('con un mantenimiento estimado de 2400 kcal al día calculado a partir de tu altura')
    expect(predictionNote(null, false, spanish)).toBe(
      'Aún no hay estimación de mantenimiento, así que no hay de qué partir. Configura primero tus objetivos.',
    )

    const profile = {
      id: 'u', sex: 'male', birthYear: 2006, heightIn: 70, activity: 'moderate', goal: 'cut', rateLbPerWeek: 1,
      override: null, adaptiveEnabled: false, tdeeEstimate: 2480, tdeeUpdatedOn: '2026-09-14', tdeePrevious: null,
      updatedAt: '', deletedAt: null,
    } satisfies ProfileRow
    expect(adaptiveStatus(profile, [], [], '2026-09-19', spanish))
      .toBe('Estimación de mantenimiento: 2480 kcal (actualizada el 14 sept)')
    expect(adaptiveStatus(null, [], [], '2026-09-19', spanish)).toBe('Faltan ~14 días registrados más y 8 pesajes')
  })
})
