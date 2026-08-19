'use client'

/**
 * LIVE QUOTE + BUDGET FIT — PRD §25.5.
 *
 * **In band:**   `$115/month   ✓ Within your $100–$200 budget`
 *
 * **Over band — with concrete, COMPUTED downgrades:**
 *   $115/month     Above your $50–$100 budget
 *     Fits your budget:
 *     · 2 Large pieces instead of 3      → $80/mo
 *     · 3 Medium pieces instead of Large → $75/mo
 *     [ Keep $115/mo anyway ]
 *
 * "NEVER BLOCK SUBMISSION ON BUDGET. Show the math and let the user choose.
 *  Suggestions are computed from the same table, NOT HARDCODED." (§25.5)
 *
 * §44 — "Mystery quote recalculation instant (it's pure arithmetic — NEVER
 * round-trip it to the server)." This component imports the pure module.
 */

import { assessBudgetFit, explainQuote, type PieceCount } from '@/lib/pricing/mystery'
import { dollars } from '@/components/ui/Money'
import type { BudgetBand, PieceType, Size } from '@/lib/taxonomy'

export function PricingCalculator({
  pieceType, size, pieces, band, onApply, sizeNote,
}: {
  pieceType: PieceType
  size: Size
  pieces: PieceCount
  band: BudgetBand
  onApply?: (next: { pieces: PieceCount; size: Size }) => void
  sizeNote?: string
}) {
  const fit = assessBudgetFit({ pieceType, size, pieces }, band)

  return (
    <div className={`quote quote-${fit.status}`} aria-live="polite">
      <div className="quote-head">
        <p className="quote-price tnum">
          {dollars(fit.monthlyCents)}<span className="quote-per">/month</span>
        </p>
        <p className={`quote-fit quote-fit-${fit.status}`}>
          {fit.status === 'in-band' ? (
            <><span aria-hidden="true">✓</span> Within your {fit.bandLabel} budget</>
          ) : fit.status === 'under-band' ? (
            <><span aria-hidden="true">✓</span> Under your {fit.bandLabel} budget</>
          ) : (
            <>Above your {fit.bandLabel} budget</>
          )}
        </p>
      </div>

      <p className="quote-math">{explainQuote({ pieceType, size, pieces })}.</p>
      {sizeNote ? <p className="quote-math">{sizeNote}.</p> : null}

      {/* §25.5 — computed alternatives. "It doesn't just say no. It does the math." */}
      {fit.status === 'over-band' && fit.alternatives.length > 0 ? (
        <div className="quote-alts">
          <p className="eyebrow">Fits your budget</p>
          <ul className="quote-alt-list">
            {fit.alternatives.map((alt) => (
              <li key={alt.label}>
                <button
                  type="button"
                  className="quote-alt"
                  onClick={() => onApply?.({ pieces: alt.pieces, size: alt.size })}
                  disabled={!onApply}
                >
                  <span>{alt.label}</span>
                  <span className="quote-alt-price tnum">→ {dollars(alt.monthlyCents)}/mo</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="quote-keep">Or keep {dollars(fit.monthlyCents)}/mo anyway — we won’t stop you.</p>
        </div>
      ) : null}

      {fit.status === 'over-band' && fit.alternatives.length === 0 ? (
        <p className="quote-keep">
          Nothing smaller fits that budget. You can raise it, or keep this brief anyway.
        </p>
      ) : null}
    </div>
  )
}
