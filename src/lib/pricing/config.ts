/**
 * PRICING CONFIG — PRD §7, §25
 *
 * NORMATIVE. Every price shown anywhere in the product derives from this file.
 * NEVER hardcode a price in a component. (§7)
 *
 * All money is integer CENTS. Displayed as whole dollars. (Doc header)
 * All arithmetic below is integer arithmetic — no float drift, ever. A price
 * that is off by a cent because of IEEE-754 is a price that contradicts another
 * price, which §51.1 names as the single lesson of v1.0.
 *
 * Pure module: no I/O, no React, no database. (§43.2)
 */

import type { PieceType, Size } from '../taxonomy'

/** Bump when any constant below changes. Stamped onto every subscription so an
 *  existing subscriber's price does not silently move. (§25.4) */
export const PRICING_CONFIG_VERSION = '2.0.0'

// ---------------------------------------------------------------------------
// §7.2 — The rental ladder. All four rungs derive from purchase_price.
// Expressed in basis points of rental_1m so the math stays integral.
// ---------------------------------------------------------------------------
export const LADDER_DIVISOR = 15          // rental_1m = purchase_price / 15
export const LADDER_MULTIPLIER_BPS = {
  1:  100,   // 1.00×
  3:  250,   // 2.50×
  6:  435,   // 4.35×
  12: 735,   // 7.35×
} as const

/** Every price rounds to the nearest $5. Round half up. (§7.2) */
export const ROUND_TO_CENTS = 500

// ---------------------------------------------------------------------------
// §7.3 — Artist revenue share.
// Snapshot onto each rental/purchase row at creation time so historical
// earnings do not move if the rate changes.
// ---------------------------------------------------------------------------
export const ARTIST_RENTAL_SHARE = 0.60
export const ARTIST_SALE_SHARE   = 0.70

/** The supply-side line that matters (§7.3). */
export const ARTIST_PITCH =
  'A gallery takes 50% and sells your work once. We take 30% when it sells — and pay you every month it hangs on someone’s wall.'

// ---------------------------------------------------------------------------
// §25.2 — Mystery rates, per piece, per month, in CENTS.
// `surprise` sits at the midpoint of curated and custom, rounded to $5, because
// the platform — not the user — decides which side of the line each piece lands
// on, and the price must be honest before that decision is made.
// ---------------------------------------------------------------------------
export const MYSTERY_RATE_CENTS: Record<PieceType, Record<Size, number>> = {
  curated:  { small: 2_000, medium: 3_000, large:  4_500, oversized:  6_500 },
  surprise: { small: 3_500, medium: 5_500, large:  7_500, oversized: 11_000 },
  custom:   { small: 5_000, medium: 7_500, large: 10_000, oversized: 15_000 },
}

// ---------------------------------------------------------------------------
// §25.3 — Bundle multipliers. NOT OPTIONAL. v1.0 wrote "if desired", which is
// not a spec. Basis points keep the arithmetic integral.
// ---------------------------------------------------------------------------
export const MYSTERY_BUNDLE_BPS: Record<1 | 2 | 3 | 4, number> = {
  1: 100,
  2: 90,
  3: 85,
  4: 80,
}

export const MYSTERY_MIN_PIECES = 1
export const MYSTERY_MAX_PIECES = 4

// ---------------------------------------------------------------------------
// §7.5 — Mystery subscription terms.
// ---------------------------------------------------------------------------
export const MYSTERY_MINIMUM_TERM_MONTHS = 3
export const MYSTERY_ROTATION_MONTHS     = 3

// ---------------------------------------------------------------------------
// §19.3 — Extension cap.
// ---------------------------------------------------------------------------
export const MAX_CUMULATIVE_RENTAL_MONTHS = 24

/** §19.1 — Extend stays available up to 30 days past end_date. */
export const EXTEND_GRACE_DAYS = 30

// ---------------------------------------------------------------------------
// §17.5 — Cancellation window; §20.4 — auto-return; §23.1 — reserve expiry.
// ---------------------------------------------------------------------------
export const CANCEL_WINDOW_HOURS      = 24
export const AUTO_RETURN_AFTER_DAYS   = 7
export const RESERVE_EXPIRY_HOURS     = 24

// ---------------------------------------------------------------------------
// §18.2 — Urgency threshold. This is a DERIVED UI STATE, not a DB status.
// ---------------------------------------------------------------------------
export const URGENCY_DAYS = 14

// ---------------------------------------------------------------------------
// §12.9 — Hard budget cutoff multiple.
// ---------------------------------------------------------------------------
export const BUDGET_HARD_CUTOFF_MULTIPLE = 1.5

// ---------------------------------------------------------------------------
// §17.4 — Shipping. Included both ways, always, in every price.
// Never show a shipping line item with a dollar value.
// ---------------------------------------------------------------------------
export const SHIPPING_INCLUDED = true
export const SHIPPING_COPY = 'Shipping included, both ways.'

// ---------------------------------------------------------------------------
// §7.4 — No rent-to-own credit. Approved and banned copy live here so that a
// single grep proves the product never oversells.
// ---------------------------------------------------------------------------
export const NO_CREDIT_COPY = 'Renting doesn’t reduce the purchase price.'
export const NO_CREDIT_COPY_LONG =
  'Your rental ends when you buy. Nothing to send back. Renting doesn’t reduce the purchase price.'

/** Asserted against rendered copy by `no-banned-copy.test.ts`. */
export const BANNED_COPY_PATTERNS = [
  /apply\s+your\s+rent/i,
  /rent\s+toward\s+ownership/i,
  /rent[-\s]to[-\s]own/i,
  /already\s+paid\s+\$?\d+\s+toward/i,
] as const

// ---------------------------------------------------------------------------
// Shared rounding. Round half up, to the nearest $5.
// ---------------------------------------------------------------------------
export function round5Cents(cents: number): number {
  return ROUND_TO_CENTS * Math.round(cents / ROUND_TO_CENTS)
}
