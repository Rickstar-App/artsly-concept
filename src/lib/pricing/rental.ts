/**
 * RENTAL LADDER — PRD §7.2
 *
 * A rental is PREPAID IN FULL FOR THE TERM. "3 months — $200" means one charge
 * of $200 today. This resolves v1.0's contradiction where the same artwork,
 * "Blue Horizon", was priced as both a term total and a monthly rate.
 *
 * THE LADDER IS A GENERATOR, NOT A CONSTRAINT. All four rungs are stored
 * columns. Seeding uses this module; artists may override any rung. The UI must
 * NEVER recompute a price from purchase_price at render time — always read the
 * stored column. (§7.2)
 *
 * Pure module. (§43.2)
 */

import {
  LADDER_DIVISOR, LADDER_MULTIPLIER_BPS, round5Cents,
  ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE,
} from './config'
import type { RentalTerm } from '../taxonomy'

export interface RentalLadder {
  rental_1m_cents: number
  rental_3m_cents: number
  rental_6m_cents: number
  rental_12m_cents: number
}

/**
 * Generate the four rungs from a purchase price.
 * Worked example (§7.2): 120000c ($1,200) -> 8000 / 20000 / 35000 / 59000
 *                        i.e. $80 / $200 / $350 / $590.
 */
export function buildLadder(purchasePriceCents: number): RentalLadder {
  const base = round5Cents(purchasePriceCents / LADDER_DIVISOR)
  return {
    rental_1m_cents:  round5Cents((base * LADDER_MULTIPLIER_BPS[1])  / 100),
    rental_3m_cents:  round5Cents((base * LADDER_MULTIPLIER_BPS[3])  / 100),
    rental_6m_cents:  round5Cents((base * LADDER_MULTIPLIER_BPS[6])  / 100),
    rental_12m_cents: round5Cents((base * LADDER_MULTIPLIER_BPS[12]) / 100),
  }
}

/** Read a stored rung by term. Never recompute — this only indexes. */
export function rentalTotalCents(ladder: RentalLadder, term: RentalTerm): number {
  switch (term) {
    case 1:  return ladder.rental_1m_cents
    case 3:  return ladder.rental_3m_cents
    case 6:  return ladder.rental_6m_cents
    case 12: return ladder.rental_12m_cents
  }
}

/**
 * §7.2 — Display only. NEVER charged.
 * Returned in cents so <Money> stays the only formatter in the product.
 */
export function monthlyEquivalentCents(totalCents: number, months: number): number {
  return Math.round(totalCents / months)
}

/** §7.2 — The "From $49/mo" figure on cards. Floor, so we never overstate. */
export function fromPriceCents(ladder: RentalLadder): number {
  return Math.floor(ladder.rental_12m_cents / 12 / 100) * 100
}

/**
 * §7.2 — The single number used for budget matching. Returned in DOLLARS
 * because §9.7 bands are expressed in dollars and §12.6 compares against them.
 */
export function comparisonPriceDollars(ladder: RentalLadder): number {
  return ladder.rental_3m_cents / 3 / 100
}

/**
 * §7.2 validation rule. Enforced in the seed script AND in artist price editing.
 * Mirrors the `ladder_order` / `ladder_value` CHECK constraints in §31.2, so a
 * violation is caught before Postgres has to reject it.
 */
export function validateLadder(
  ladder: RentalLadder,
  purchasePriceCents: number,
): { ok: true } | { ok: false; error: string } {
  const { rental_1m_cents: m1, rental_3m_cents: m3, rental_6m_cents: m6, rental_12m_cents: m12 } = ladder

  if (!(m1 > 0)) return { ok: false, error: '1-month rate must be positive' }
  if (!(m1 < m3 && m3 < m6 && m6 < m12)) {
    return { ok: false, error: `Rental totals must increase with term length (got ${m1}/${m3}/${m6}/${m12})` }
  }
  if (!(m12 < purchasePriceCents)) {
    return { ok: false, error: `12-month total (${m12}) must be below the purchase price (${purchasePriceCents})` }
  }
  // Monthly equivalents must be STRICTLY decreasing as the term lengthens.
  // Cross-multiplied to stay in integers: m3/3 < m1/1  <=>  m3 < m1*3
  if (!(m3 < m1 * 3))      return { ok: false, error: 'A 3-month rental must cost less per month than a 1-month rental' }
  if (!(m6 * 3 < m3 * 6))  return { ok: false, error: 'A 6-month rental must cost less per month than a 3-month rental' }
  if (!(m12 * 6 < m6 * 12)) return { ok: false, error: 'A 12-month rental must cost less per month than a 6-month rental' }

  return { ok: true }
}

// ---------------------------------------------------------------------------
// §7.3 — Artist earnings.
// ---------------------------------------------------------------------------

/** Rate is snapshotted on the row, so historical earnings never move. */
export function artistRentalEarningsCents(rentalTotalCents: number, rate = ARTIST_RENTAL_SHARE): number {
  return Math.round(rentalTotalCents * rate)
}

export function artistSaleEarningsCents(purchasePriceCents: number, rate = ARTIST_SALE_SHARE): number {
  return Math.round(purchasePriceCents * rate)
}

/**
 * §25.6 — Mystery share, split evenly across the pieces in the cycle.
 * A $115/mo 3-piece subscription pays $69/mo total, $23/mo to each artist.
 */
export function mysteryArtistShareCents(
  monthlyPriceCents: number,
  numberOfPieces: number,
  rate = ARTIST_RENTAL_SHARE,
): { totalCents: number; perArtistCents: number } {
  const totalCents = Math.round(monthlyPriceCents * rate)
  return { totalCents, perArtistCents: Math.round(totalCents / numberOfPieces) }
}
