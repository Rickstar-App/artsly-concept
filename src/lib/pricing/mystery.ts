/**
 * MYSTERY PRICING — PRD §25
 *
 * ONE MODEL. v1.0 gave both a formula (`base + n*fee + size_adj + custom_adj`)
 * and an incompatible flat rate table, then published a worked example that
 * matched neither. The formula is deleted.
 *
 *     monthly_price = round5( rate[piece_type][size] * pieces * bundle[pieces] )
 *
 * Pure module — the quote must never round-trip to the server. (§44)
 */

import {
  MYSTERY_RATE_CENTS, MYSTERY_BUNDLE_BPS, round5Cents,
  MYSTERY_MIN_PIECES, MYSTERY_MAX_PIECES,
} from './config'
import { BUDGET_RANGE, PIECE_TYPE_LABEL, SIZE_LABEL, SIZES, sizeCategory } from '../taxonomy'
import type { BudgetBand, PieceType, Size } from '../taxonomy'

export type PieceCount = 1 | 2 | 3 | 4

export interface MysteryQuoteInput {
  pieceType: PieceType
  size: Size
  pieces: PieceCount
}

/**
 * §25.1 — The model.
 * Worked examples (§25.4), all verified in `mystery-price.test.ts`:
 *   3 x Large curated   45 x 3 x 0.85 = 114.75 -> $115/mo
 *   2 x Large curated   45 x 2 x 0.90 =  81    -> $80/mo
 *   3 x Medium curated  30 x 3 x 0.85 =  76.5  -> $75/mo
 *   1 x Medium custom   75 x 1 x 1.00 =  75    -> $75/mo
 *   4 x Small surprise  35 x 4 x 0.80 = 112    -> $110/mo
 *   2 x Oversized custom 150 x 2 x 0.90 = 270  -> $270/mo
 */
export function mysteryMonthlyCents({ pieceType, size, pieces }: MysteryQuoteInput): number {
  if (pieces < MYSTERY_MIN_PIECES || pieces > MYSTERY_MAX_PIECES || !Number.isInteger(pieces)) {
    throw new Error(`pieces must be an integer ${MYSTERY_MIN_PIECES}–${MYSTERY_MAX_PIECES}, got ${pieces}`)
  }
  const rate = MYSTERY_RATE_CENTS[pieceType][size]
  const bundleBps = MYSTERY_BUNDLE_BPS[pieces]
  // Integer throughout: rate and bundleBps are both integers.
  return round5Cents((rate * pieces * bundleBps) / 100)
}

/** §24.3 — "Custom dimensions" maps through the same §9.5 function. */
export function resolveMysterySize(
  size: Size | 'custom',
  customWidthIn?: number | null,
  customHeightIn?: number | null,
): { size: Size; wasCustom: boolean; note?: string } {
  if (size !== 'custom') return { size, wasCustom: false }
  if (!customWidthIn || !customHeightIn || customWidthIn <= 0 || customHeightIn <= 0) {
    throw new Error('Custom dimensions require a positive width and height in inches')
  }
  const resolved = sizeCategory(customWidthIn, customHeightIn)
  return {
    size: resolved,
    wasCustom: true,
    // Displayed in both the quote and the summary (§24.3).
    note: `${trimNum(customWidthIn)} × ${trimNum(customHeightIn)} in — priced as ${SIZE_LABEL[resolved]}`,
  }
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// ---------------------------------------------------------------------------
// §25.5 — Budget-fit feedback.
// Never block submission on budget. Show the math and let the user choose.
// Suggestions are COMPUTED from the same table, never hardcoded.
// ---------------------------------------------------------------------------

export interface BudgetAlternative {
  /** e.g. "2 Large pieces instead of 3" */
  label: string
  monthlyCents: number
  pieces: PieceCount
  size: Size
  pieceType: PieceType
}

export interface BudgetFit {
  status: 'in-band' | 'over-band' | 'under-band'
  monthlyCents: number
  bandLabel: string
  alternatives: BudgetAlternative[]
}

export function assessBudgetFit(
  input: MysteryQuoteInput,
  band: BudgetBand,
): BudgetFit {
  const monthlyCents = mysteryMonthlyCents(input)
  const { min, max, label } = BUDGET_RANGE[band]
  const monthly = monthlyCents / 100

  let status: BudgetFit['status'] = 'in-band'
  if (monthly > max) status = 'over-band'
  else if (monthly < min) status = 'under-band'

  return {
    status,
    monthlyCents,
    bandLabel: label,
    alternatives: status === 'over-band' ? computeAlternatives(input, max) : [],
  }
}

/**
 * Enumerate the neighbouring briefs that DO fit, cheapest deviation first.
 * We only ever suggest reducing count or size, and only downward — never a
 * different piece type, because that changes what the user asked for.
 */
function computeAlternatives(input: MysteryQuoteInput, maxDollars: number): BudgetAlternative[] {
  const out: BudgetAlternative[] = []
  const sizeIdx = SIZES.indexOf(input.size)

  // Fewer pieces, same size.
  for (let n = input.pieces - 1; n >= MYSTERY_MIN_PIECES; n--) {
    const pieces = n as PieceCount
    const cents = mysteryMonthlyCents({ ...input, pieces })
    if (cents / 100 <= maxDollars) {
      out.push({
        label: `${pieces} ${SIZE_LABEL[input.size]} ${pieces === 1 ? 'piece' : 'pieces'} instead of ${input.pieces}`,
        monthlyCents: cents, pieces, size: input.size, pieceType: input.pieceType,
      })
      break // the largest count that fits is the best of this family
    }
  }

  // Same count, smaller size.
  for (let i = sizeIdx - 1; i >= 0; i--) {
    const size = SIZES[i]
    const cents = mysteryMonthlyCents({ ...input, size })
    if (cents / 100 <= maxDollars) {
      out.push({
        label: `${input.pieces} ${SIZE_LABEL[size]} ${input.pieces === 1 ? 'piece' : 'pieces'} instead of ${SIZE_LABEL[input.size]}`,
        monthlyCents: cents, pieces: input.pieces, size, pieceType: input.pieceType,
      })
      break
    }
  }

  return out.sort((a, b) => b.monthlyCents - a.monthlyCents)
}

/**
 * §34.2 — "from $20/mo curated, from $50/mo custom" on the homepage.
 * Derived, so the homepage can never contradict the quote.
 */
export function startingPriceCents(pieceType: PieceType): number {
  return mysteryMonthlyCents({ pieceType, size: 'small', pieces: 1 })
}

/** Human-readable arithmetic, shown under the quote so the number is legible. */
export function explainQuote({ pieceType, size, pieces }: MysteryQuoteInput): string {
  const rate = MYSTERY_RATE_CENTS[pieceType][size] / 100
  const bundle = MYSTERY_BUNDLE_BPS[pieces] / 100
  const discount = Math.round((1 - bundle) * 100)
  const base = `$${rate} per ${SIZE_LABEL[size].toLowerCase()} ${PIECE_TYPE_LABEL[pieceType].toLowerCase()} piece × ${pieces}`
  return discount > 0 ? `${base}, less a ${discount}% bundle discount` : base
}

/**
 * §41.5 — When matching finds fewer pieces than requested, the subscription is
 * re-quoted at the delivered count. "We found 2 pieces worth your walls instead
 * of 3 — you'll be billed $80/mo, not $115."
 */
export function proratedForFewerPieces(
  input: MysteryQuoteInput,
  delivered: number,
): { monthlyCents: number; originalCents: number } {
  const originalCents = mysteryMonthlyCents(input)
  const clamped = Math.max(MYSTERY_MIN_PIECES, Math.min(MYSTERY_MAX_PIECES, delivered)) as PieceCount
  return { monthlyCents: mysteryMonthlyCents({ ...input, pieces: clamped }), originalCents }
}
