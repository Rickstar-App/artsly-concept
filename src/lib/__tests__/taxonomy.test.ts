/**
 * §46.1 — THE REGRESSION TEST FOR v1.0's DEFECT #1.
 *
 * v1.0's survey offered "Pop art"/"Street art"/"Surrealist" while artwork tags
 * carried "Pop"/"Street"/"Surreal", so style_match silently scored 0 for three
 * of twelve styles. Its survey offered "Black & white" while artwork carried
 * "Black" and "White". Its survey offered mood "Minimal", which no artwork
 * could carry. Its Q1 offered room "Other", which no artwork could carry.
 *
 * Every one of those is a SILENT zero — the feed still renders, it is just
 * quietly wrong. These assertions are the only thing standing between the
 * product and that class of bug returning.
 */
import { describe, expect, it } from 'vitest'
import * as T from '../taxonomy'

describe('taxonomy — single source of truth (§9)', () => {
  it('every enum has a label for every slug, and no orphan labels', () => {
    const pairs: Array<[readonly string[], Record<string, string>, string]> = [
      [T.STYLES, T.STYLE_LABEL, 'STYLE'],
      [T.COLORS, T.COLOR_LABEL, 'COLOR'],
      [T.MOODS, T.MOOD_LABEL, 'MOOD'],
      [T.ROOMS, T.ROOM_LABEL, 'ROOM'],
      [T.SIZES, T.SIZE_LABEL, 'SIZE'],
      [T.BUDGET_BANDS, T.BUDGET_LABEL, 'BUDGET'],
      [T.CHANGE_FREQUENCIES, T.CHANGE_FREQUENCY_LABEL, 'CHANGE_FREQUENCY'],
      [T.PIECE_TYPES, T.PIECE_TYPE_LABEL, 'PIECE_TYPE'],
      [T.RETURN_REASONS, T.RETURN_REASON_LABEL, 'RETURN_REASON'],
    ]
    for (const [slugs, labels, name] of pairs) {
      expect(Object.keys(labels).sort(), `${name} label keys`).toEqual([...slugs].sort())
      for (const s of slugs) expect(labels[s], `${name}.${s}`).toBeTruthy()
    }
  })

  it('has exactly the counts §9 specifies', () => {
    expect(T.STYLES).toHaveLength(12)
    expect(T.COLORS).toHaveLength(10)
    expect(T.MOODS).toHaveLength(7)
    expect(T.ROOMS).toHaveLength(5)
    expect(T.SIZES).toHaveLength(4)
    expect(T.BUDGET_BANDS).toHaveLength(5)
    expect(T.CHANGE_FREQUENCIES).toHaveLength(5)
    expect(T.PIECE_TYPES).toHaveLength(3)
  })

  it('slugs are unique, lowercase, kebab-case', () => {
    const all = [...T.STYLES, ...T.COLORS, ...T.MOODS, ...T.ROOMS, ...T.SIZES,
                 ...T.BUDGET_BANDS, ...T.CHANGE_FREQUENCIES, ...T.PIECE_TYPES]
    for (const s of all) expect(s, s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    for (const group of [T.STYLES, T.COLORS, T.MOODS, T.ROOMS, T.SIZES]) {
      expect(new Set(group).size).toBe(group.length)
    }
  })

  // --- The five specific v1.0 defects ------------------------------------
  it('defect #1: pop / street / surreal are single canonical slugs', () => {
    expect(T.STYLES).toContain('pop')
    expect(T.STYLES).toContain('street')
    expect(T.STYLES).toContain('surreal')
    expect(T.STYLE_LABEL.pop).toBe('Pop art')
    expect(T.STYLE_LABEL.street).toBe('Street art')
    expect(T.STYLE_LABEL.surreal).toBe('Surrealist')
    // The v1.0 artwork-side strings must NOT exist as separate slugs.
    for (const bad of ['pop-art', 'street-art', 'surrealist']) {
      expect(T.STYLES as readonly string[]).not.toContain(bad)
    }
  })

  it('defect #2: monochrome replaces "Black & white" / "Black" / "White"', () => {
    expect(T.COLORS).toContain('monochrome')
    expect(T.COLOR_LABEL.monochrome).toBe('Black & white')
    expect(T.COLORS as readonly string[]).not.toContain('black')
    expect(T.COLORS as readonly string[]).not.toContain('white')
    expect(T.COLORS as readonly string[]).not.toContain('black-and-white')
  })

  it('defect #3: "minimal" is a style, never a mood', () => {
    expect(T.MOODS as readonly string[]).not.toContain('minimal')
    expect(T.MOODS as readonly string[]).not.toContain('minimalist')
    expect(T.STYLES).toContain('minimalist')
  })

  it('defect #4: "any" is a first-class user-side wildcard, never an artwork tag', () => {
    expect(T.USER_ROOMS).toContain('any')
    expect(T.ROOMS as readonly string[]).not.toContain('any')
    expect(T.ROOMS as readonly string[]).not.toContain('other')
    expect(T.isRoom('any')).toBe(false)      // not valid on artwork
    expect(T.isUserRoom('any')).toBe(true)   // valid on a user
    expect(T.USER_ROOM_LABEL.any).toBe('Somewhere else / not sure')
  })

  it('defect #14: size buckets are defined in inches, by longest edge', () => {
    expect(T.sizeCategory(18, 12)).toBe('small')
    expect(T.sizeCategory(12, 18)).toBe('small')      // longest edge, either axis
    expect(T.sizeCategory(19, 10)).toBe('medium')
    expect(T.sizeCategory(30, 30)).toBe('medium')
    expect(T.sizeCategory(31, 10)).toBe('large')
    expect(T.sizeCategory(48, 36)).toBe('large')      // Blue Horizon
    expect(T.sizeCategory(49, 10)).toBe('oversized')
    expect(T.sizeCategory(10, 72)).toBe('oversized')
  })

  it('size boundaries have no gaps or overlaps across 1..120 in', () => {
    for (let e = 1; e <= 120; e++) {
      const cat = T.sizeCategory(e, 1)
      expect(T.SIZES).toContain(cat)
    }
    expect(T.sizeCategory(18.0, 1)).toBe('small')
    expect(T.sizeCategory(18.01, 1)).toBe('medium')
    expect(T.sizeCategory(30.0, 1)).toBe('medium')
    expect(T.sizeCategory(30.01, 1)).toBe('large')
    expect(T.sizeCategory(48.0, 1)).toBe('large')
    expect(T.sizeCategory(48.01, 1)).toBe('oversized')
  })

  it('budget bands tile the number line with no gap', () => {
    let prevMax = 0
    for (const b of T.BUDGET_BANDS) {
      const { min, max } = T.BUDGET_RANGE[b]
      expect(min).toBe(prevMax)
      expect(max).toBeGreaterThan(min)
      prevMax = max
    }
    expect(T.bandForMonthly(0)).toBe('under-25')
    expect(T.bandForMonthly(24)).toBe('under-25')
    expect(T.bandForMonthly(67)).toBe('50-100')
    expect(T.bandForMonthly(500)).toBe('200-plus')
  })

  it('SIZE_INDEX is a contiguous ordinal over SIZES', () => {
    expect(T.SIZES.map((s) => T.SIZE_INDEX[s])).toEqual([0, 1, 2, 3])
  })

  it('selection caps are within the option counts', () => {
    expect(T.SURVEY_CAPS.styles.max).toBeLessThanOrEqual(T.STYLES.length)
    expect(T.SURVEY_CAPS.colors.max).toBeLessThanOrEqual(T.COLORS.length)
    expect(T.SURVEY_CAPS.moods.max).toBeLessThanOrEqual(T.MOODS.length)
    expect(T.SURVEY_CAPS.styles.min).toBeGreaterThanOrEqual(1)
  })

  it('joinLabels reads like English', () => {
    expect(T.joinLabels([])).toBe('')
    expect(T.joinLabels(['Abstract'])).toBe('Abstract')
    expect(T.joinLabels(['Abstract', 'Contemporary'])).toBe('Abstract and Contemporary')
    expect(T.joinLabels(['A', 'B', 'C'])).toBe('A, B and C')
    expect(T.joinLabels(['A', 'B'], 'or')).toBe('A or B')
  })

  it('boldnessLabel covers the whole 1..10 range', () => {
    for (let i = T.BOLDNESS_MIN; i <= T.BOLDNESS_MAX; i++) {
      expect(T.boldnessLabel(i), `boldness ${i}`).toBeTruthy()
    }
  })
})
