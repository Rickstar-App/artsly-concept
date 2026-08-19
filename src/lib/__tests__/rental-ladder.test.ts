/**
 * §46.1 — rental-ladder.test.ts
 * "purchase_price = 1200 produces 80/200/350/590. Monotonicity holds across
 *  $180–$3,600."
 *
 * §0.1 defect #7: v1.0 priced the SAME artwork, "Blue Horizon", as both a term
 * total ($75 buys 3 months) and a monthly rate ($24/month). The ladder now has
 * exactly one reading: a prepaid total per term.
 */
import { describe, expect, it } from 'vitest'
import {
  buildLadder, rentalTotalCents, monthlyEquivalentCents, fromPriceCents,
  comparisonPriceDollars, validateLadder,
  artistRentalEarningsCents, artistSaleEarningsCents, mysteryArtistShareCents,
} from '../pricing/rental'
import { round5Cents, ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE } from '../pricing/config'
import { RENTAL_TERMS } from '../taxonomy'

const $ = (dollars: number) => dollars * 100

describe('§7.2 the ladder — Blue Horizon worked example', () => {
  const ladder = buildLadder($(1200))

  it('produces exactly 80 / 200 / 350 / 590', () => {
    expect(ladder.rental_1m_cents).toBe($(80))
    expect(ladder.rental_3m_cents).toBe($(200))
    expect(ladder.rental_6m_cents).toBe($(350))
    expect(ladder.rental_12m_cents).toBe($(590))
  })

  it('monthly equivalents are 80 / 67 / 58 / 49', () => {
    expect(monthlyEquivalentCents(ladder.rental_1m_cents, 1)).toBe($(80))
    expect(monthlyEquivalentCents(ladder.rental_3m_cents, 3)).toBe(6667)   // $66.67 -> displays $67
    expect(monthlyEquivalentCents(ladder.rental_6m_cents, 6)).toBe(5833)   // -> $58
    expect(monthlyEquivalentCents(ladder.rental_12m_cents, 12)).toBe(4917) // -> $49
    expect(Math.round(6667 / 100)).toBe(67)
    expect(Math.round(5833 / 100)).toBe(58)
    expect(Math.round(4917 / 100)).toBe(49)
  })

  it('from_price is floor(rental_12m / 12) = $49 — never overstated', () => {
    expect(fromPriceCents(ladder)).toBe($(49))
  })

  it('comparison_price is rental_3m / 3 = $66.67 (§7.2)', () => {
    expect(comparisonPriceDollars(ladder)).toBeCloseTo(66.667, 3)
  })

  it('rentalTotalCents indexes stored columns, it does not recompute', () => {
    expect(rentalTotalCents(ladder, 1)).toBe($(80))
    expect(rentalTotalCents(ladder, 3)).toBe($(200))
    expect(rentalTotalCents(ladder, 6)).toBe($(350))
    expect(rentalTotalCents(ladder, 12)).toBe($(590))
  })

  it('$1,200 to own is materially more than $590 for a year — the pitch contrast', () => {
    expect($(1200)).toBeGreaterThan(ladder.rental_12m_cents * 2)
  })
})

describe('§7.2 monotonicity across the whole seeding range', () => {
  it('holds for every $5 step from $180 to $3,600 (§11.3)', () => {
    const failures: string[] = []
    for (let p = 180; p <= 3600; p += 5) {
      const ladder = buildLadder($(p))
      const v = validateLadder(ladder, $(p))
      if (!v.ok) failures.push(`$${p}: ${v.error}`)
    }
    expect(failures).toEqual([])
  })

  it('every rung is a whole multiple of $5', () => {
    for (let p = 180; p <= 3600; p += 5) {
      const l = buildLadder($(p))
      for (const c of Object.values(l)) expect(c % 500, `$${p}`).toBe(0)
    }
  })

  it('monthly equivalents strictly decrease as the term lengthens', () => {
    for (let p = 180; p <= 3600; p += 5) {
      const l = buildLadder($(p))
      const m = RENTAL_TERMS.map((t) => rentalTotalCents(l, t) / t)
      for (let i = 1; i < m.length; i++) {
        expect(m[i], `$${p} term ${RENTAL_TERMS[i]}`).toBeLessThan(m[i - 1])
      }
    }
  })
})

describe('§7.2 validateLadder rejects violations (mirrors the §31.2 CHECKs)', () => {
  const good = buildLadder($(1200))
  it('accepts a generated ladder', () => expect(validateLadder(good, $(1200)).ok).toBe(true))
  it('rejects a non-increasing total', () => {
    const bad = { ...good, rental_6m_cents: $(150) }
    expect(validateLadder(bad, $(1200))).toMatchObject({ ok: false })
  })
  it('rejects a 12-month total at or above the purchase price', () => {
    expect(validateLadder(good, $(500))).toMatchObject({ ok: false })
  })
  it('rejects an artist override where a longer term costs MORE per month', () => {
    // $260 for 3 months is $86.67/mo, above the 1-month rate of $80.
    const bad = { ...good, rental_3m_cents: $(260) }
    expect(validateLadder(bad, $(1200))).toMatchObject({ ok: false })
  })
  it('accepts a sane artist override', () => {
    expect(validateLadder({ ...good, rental_1m_cents: $(85) }, $(1200)).ok).toBe(true)
  })
})

describe('round5Cents rounds half UP', () => {
  it('boundaries', () => {
    expect(round5Cents(0)).toBe(0)
    expect(round5Cents(249)).toBe(0)
    expect(round5Cents(250)).toBe(500)
    expect(round5Cents(34800)).toBe(35000)
    expect(round5Cents(58800)).toBe(59000)
  })
})

describe('§7.3 artist revenue share', () => {
  it('Blue Horizon, 3-month rental: $200 gross -> $120 to Maya', () => {
    expect(artistRentalEarningsCents($(200))).toBe($(120))
  })
  it('Blue Horizon sold: $1,200 -> $840 to Maya', () => {
    expect(artistSaleEarningsCents($(1200))).toBe($(840))
  })
  it('rates are 60% and 70%', () => {
    expect(ARTIST_RENTAL_SHARE).toBe(0.60)
    expect(ARTIST_SALE_SHARE).toBe(0.70)
  })
  it('the snapshot rate is honoured over the current rate', () => {
    expect(artistRentalEarningsCents($(200), 0.5)).toBe($(100))
  })
  it('§25.6 mystery: $115/mo across 3 pieces -> $69 total, $23 each', () => {
    const s = mysteryArtistShareCents($(115), 3)
    expect(s.totalCents).toBe($(69))
    expect(s.perArtistCents).toBe($(23))
  })
})
