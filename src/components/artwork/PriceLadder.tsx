'use client'

/**
 * PRICE LADDER — PRD §15.2.
 *
 * §43.3 — "`PriceLadder` is used by artwork detail, checkout, and extend. DO NOT
 * DUPLICATE IT — v1.0's three separate price examples disagreeing with each
 * other is exactly what duplication produces."
 *
 * §15.2 requires this exact shape:
 *
 *   RENT                          Total    Per month
 *     1 month                       $80        $80
 *     3 months                     $200        $67
 *     6 months                     $350        $58
 *     12 months                    $590        $49
 *
 * "Every rung shows BOTH the prepaid total and the monthly equivalent."
 * "Values come from STORED COLUMNS, never recomputed at render." (§7.2)
 */

import { RENTAL_TERMS, type RentalTerm } from '@/lib/taxonomy'
import { monthlyEquivalentCents, rentalTotalCents, type RentalLadder } from '@/lib/pricing/rental'
import { dollars, termLabel } from '@/components/ui/Money'

export function PriceLadder({
  ladder, selected, onSelect, name, compact,
}: {
  ladder: RentalLadder
  selected: RentalTerm
  onSelect: (t: RentalTerm) => void
  name?: string
  compact?: boolean
}) {
  return (
    <fieldset className={`ladder${compact ? ' ladder-compact' : ''}`}>
      <legend className="sr-only">Choose a rental term</legend>
      <div className="ladder-head" aria-hidden="true">
        <span className="eyebrow">Rent</span>
        <span className="ladder-col">Total</span>
        <span className="ladder-col">Per month</span>
      </div>

      {RENTAL_TERMS.map((term) => {
        const total = rentalTotalCents(ladder, term)
        const monthly = monthlyEquivalentCents(total, term)
        const id = `${name ?? 'term'}-${term}`
        return (
          <label key={term} htmlFor={id} className={`ladder-row${selected === term ? ' is-selected' : ''}`}>
            <input
              id={id}
              type="radio"
              name={name ?? 'term'}
              value={term}
              checked={selected === term}
              onChange={() => onSelect(term)}
              className="ladder-radio"
            />
            <span className="ladder-term">{termLabel(term)}</span>
            <span className="ladder-col tnum ladder-total">{dollars(total)}</span>
            <span className="ladder-col tnum ladder-monthly">
              {dollars(monthly)}<span aria-hidden="true">/mo</span>
              <span className="sr-only"> per month</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

/** Read-only variant for confirmation screens and the artist dashboard. */
export function PriceLadderStatic({ ladder }: { ladder: RentalLadder }) {
  return (
    <div className="ladder ladder-static">
      <div className="ladder-head">
        <span className="eyebrow">Rent</span>
        <span className="ladder-col">Total</span>
        <span className="ladder-col">Per month</span>
      </div>
      {RENTAL_TERMS.map((term) => {
        const total = rentalTotalCents(ladder, term)
        return (
          <div key={term} className="ladder-row">
            <span className="ladder-term">{termLabel(term)}</span>
            <span className="ladder-col tnum ladder-total">{dollars(total)}</span>
            <span className="ladder-col tnum ladder-monthly">
              {dollars(monthlyEquivalentCents(total, term))}<span aria-hidden="true">/mo</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
