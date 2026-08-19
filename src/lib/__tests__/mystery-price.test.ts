/**
 * §46.1 — mystery-price.test.ts
 * "All six rows of §25.4. Bundle multipliers. Custom-dimension size resolution."
 *
 * §0.1 defect #9: v1.0's worked example priced 3 Large pieces at $95/mo, which
 * was unreachable under v1.0's OWN table ($114.75 curated / $255 custom). The
 * first row below is the corrected number.
 */
import { describe, expect, it } from 'vitest'
import {
  mysteryMonthlyCents, resolveMysterySize, assessBudgetFit,
  startingPriceCents, explainQuote, proratedForFewerPieces,
  type PieceCount,
} from '../pricing/mystery'
import { MYSTERY_BUNDLE_BPS, MYSTERY_RATE_CENTS } from '../pricing/config'
import { PIECE_TYPES, SIZES } from '../taxonomy'

const $ = (d: number) => d * 100

describe('§25.4 — the six worked examples', () => {
  const rows: Array<[string, Parameters<typeof mysteryMonthlyCents>[0], number]> = [
    ['3 × Large, curated   (45×3×0.85 = 114.75)', { pieceType: 'curated',  size: 'large',     pieces: 3 }, $(115)],
    ['2 × Large, curated   (45×2×0.90 = 81)',     { pieceType: 'curated',  size: 'large',     pieces: 2 }, $(80)],
    ['3 × Medium, curated  (30×3×0.85 = 76.5)',   { pieceType: 'curated',  size: 'medium',    pieces: 3 }, $(75)],
    ['1 × Medium, custom   (75×1×1.00 = 75)',     { pieceType: 'custom',   size: 'medium',    pieces: 1 }, $(75)],
    ['4 × Small, surprise  (35×4×0.80 = 112)',    { pieceType: 'surprise', size: 'small',     pieces: 4 }, $(110)],
    ['2 × Oversized, custom (150×2×0.90 = 270)',  { pieceType: 'custom',   size: 'oversized', pieces: 2 }, $(270)],
  ]
  for (const [name, input, expected] of rows) {
    it(name, () => expect(mysteryMonthlyCents(input)).toBe(expected))
  }

  it('the demo-script switch from Large to Medium: $115 -> $75', () => {
    expect(mysteryMonthlyCents({ pieceType: 'curated', size: 'large',  pieces: 3 })).toBe($(115))
    expect(mysteryMonthlyCents({ pieceType: 'curated', size: 'medium', pieces: 3 })).toBe($(75))
  })
})

describe('§25.2 rate table', () => {
  it('surprise sits at the midpoint of curated and custom, rounded to $5', () => {
    for (const size of SIZES) {
      const mid = (MYSTERY_RATE_CENTS.curated[size] + MYSTERY_RATE_CENTS.custom[size]) / 2
      expect(MYSTERY_RATE_CENTS.surprise[size], size).toBe(Math.round(mid / 500) * 500)
    }
  })
  it('rates increase with size for every piece type', () => {
    for (const t of PIECE_TYPES) {
      const r = SIZES.map((s) => MYSTERY_RATE_CENTS[t][s])
      for (let i = 1; i < r.length; i++) expect(r[i], `${t}`).toBeGreaterThan(r[i - 1])
    }
  })
  it('curated < surprise < custom at every size', () => {
    for (const s of SIZES) {
      expect(MYSTERY_RATE_CENTS.curated[s]).toBeLessThan(MYSTERY_RATE_CENTS.surprise[s])
      expect(MYSTERY_RATE_CENTS.surprise[s]).toBeLessThan(MYSTERY_RATE_CENTS.custom[s])
    }
  })
})

describe('§25.3 bundle multipliers — NOT optional', () => {
  it('are 1.00 / 0.90 / 0.85 / 0.80', () => {
    expect(MYSTERY_BUNDLE_BPS).toEqual({ 1: 100, 2: 90, 3: 85, 4: 80 })
  })
  it('per-piece cost strictly decreases as count rises', () => {
    for (const t of PIECE_TYPES) for (const s of SIZES) {
      const per = ([1, 2, 3, 4] as PieceCount[]).map((n) => mysteryMonthlyCents({ pieceType: t, size: s, pieces: n }) / n)
      for (let i = 1; i < per.length; i++) {
        expect(per[i], `${t}/${s}/${i + 1}`).toBeLessThanOrEqual(per[i - 1])
      }
    }
  })
  it('rejects a non-integer or out-of-range piece count (v1.0 offered "4+")', () => {
    expect(() => mysteryMonthlyCents({ pieceType: 'curated', size: 'large', pieces: 5 as PieceCount })).toThrow()
    expect(() => mysteryMonthlyCents({ pieceType: 'curated', size: 'large', pieces: 0 as PieceCount })).toThrow()
    expect(() => mysteryMonthlyCents({ pieceType: 'curated', size: 'large', pieces: 2.5 as PieceCount })).toThrow()
  })
  it('every quote is a whole multiple of $5', () => {
    for (const t of PIECE_TYPES) for (const s of SIZES) for (const n of [1, 2, 3, 4] as PieceCount[]) {
      expect(mysteryMonthlyCents({ pieceType: t, size: s, pieces: n }) % 500).toBe(0)
    }
  })
})

describe('§24.3 custom dimensions resolve through the §9.5 function', () => {
  it('maps by longest edge and reports the resolved bucket', () => {
    const r = resolveMysterySize('custom', 36, 24)
    expect(r.size).toBe('large')
    expect(r.wasCustom).toBe(true)
    expect(r.note).toBe('36 × 24 in — priced as Large')
  })
  it('passes a plain size through untouched', () => {
    expect(resolveMysterySize('medium')).toEqual({ size: 'medium', wasCustom: false })
  })
  it('rejects missing or non-positive dimensions', () => {
    expect(() => resolveMysterySize('custom')).toThrow()
    expect(() => resolveMysterySize('custom', 0, 20)).toThrow()
    expect(() => resolveMysterySize('custom', -5, 20)).toThrow()
  })
  it('a custom-dimension quote equals the resolved bucket quote', () => {
    const { size } = resolveMysterySize('custom', 40, 30)
    expect(mysteryMonthlyCents({ pieceType: 'curated', size, pieces: 2 }))
      .toBe(mysteryMonthlyCents({ pieceType: 'curated', size: 'large', pieces: 2 }))
  })
})

describe('§25.5 budget fit — computed alternatives, never hardcoded', () => {
  it('the demo case: $115 over a $50–$100 band, with both downgrades', () => {
    const fit = assessBudgetFit({ pieceType: 'curated', size: 'large', pieces: 3 }, '50-100')
    expect(fit.status).toBe('over-band')
    expect(fit.monthlyCents).toBe($(115))
    const labels = fit.alternatives.map((a) => a.label)
    expect(labels).toContain('2 Large pieces instead of 3')
    expect(labels).toContain('3 Medium pieces instead of Large')
    const byLabel = Object.fromEntries(fit.alternatives.map((a) => [a.label, a.monthlyCents]))
    expect(byLabel['2 Large pieces instead of 3']).toBe($(80))
    expect(byLabel['3 Medium pieces instead of Large']).toBe($(75))
  })

  it('every suggested alternative genuinely fits the band', () => {
    for (const t of PIECE_TYPES) for (const s of SIZES) for (const n of [1, 2, 3, 4] as PieceCount[]) {
      for (const band of ['under-25', '25-50', '50-100', '100-200'] as const) {
        const fit = assessBudgetFit({ pieceType: t, size: s, pieces: n }, band)
        for (const alt of fit.alternatives) {
          expect(alt.monthlyCents / 100, `${t}/${s}/${n}/${band} -> ${alt.label}`)
            .toBeLessThanOrEqual({ 'under-25': 25, '25-50': 50, '50-100': 100, '100-200': 200 }[band])
        }
      }
    }
  })

  it('an alternative never changes the piece type the user asked for (§24.2)', () => {
    const fit = assessBudgetFit({ pieceType: 'custom', size: 'oversized', pieces: 4 }, '50-100')
    for (const a of fit.alternatives) expect(a.pieceType).toBe('custom')
  })

  it('in-band and under-band produce no alternatives', () => {
    expect(assessBudgetFit({ pieceType: 'curated', size: 'medium', pieces: 3 }, '50-100').status).toBe('in-band')
    expect(assessBudgetFit({ pieceType: 'curated', size: 'small', pieces: 1 }, '100-200').status).toBe('under-band')
    expect(assessBudgetFit({ pieceType: 'curated', size: 'small', pieces: 1 }, '100-200').alternatives).toEqual([])
  })

  it('offers nothing rather than lying when nothing fits', () => {
    const fit = assessBudgetFit({ pieceType: 'custom', size: 'oversized', pieces: 1 }, 'under-25')
    expect(fit.status).toBe('over-band')
    expect(fit.alternatives).toEqual([])
  })
})

describe('§34.2 homepage starting prices derive from the same table', () => {
  it('"from $20/mo curated, from $50/mo custom"', () => {
    expect(startingPriceCents('curated')).toBe($(20))
    expect(startingPriceCents('custom')).toBe($(50))
    expect(startingPriceCents('surprise')).toBe($(35))
  })
})

describe('§41.5 prorated fallback when matching finds too few pieces', () => {
  it('"2 pieces instead of 3 — $80/mo, not $115"', () => {
    const r = proratedForFewerPieces({ pieceType: 'curated', size: 'large', pieces: 3 }, 2)
    expect(r.originalCents).toBe($(115))
    expect(r.monthlyCents).toBe($(80))
  })
})

describe('explainQuote states the arithmetic in words, never the formula', () => {
  it('names the rate, the count, and the discount', () => {
    const s = explainQuote({ pieceType: 'curated', size: 'large', pieces: 3 })
    expect(s).toContain('$45')
    expect(s).toContain('× 3')
    expect(s).toContain('15% bundle discount')
  })
  it('omits the discount at a count of one', () => {
    expect(explainQuote({ pieceType: 'custom', size: 'medium', pieces: 1 })).not.toContain('discount')
  })
})
