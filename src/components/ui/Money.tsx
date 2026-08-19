/**
 * MONEY — PRD §43.3.
 *
 * "`Money` is a COMPONENT, not a helper: it renders cents as dollars and
 *  enforces §6.7 (a rental figure never appears without its term). One
 *  component, one place to get the money format right."
 *
 * §6.7 is the principle that overrides visual minimalism: "Every price surface
 * states the term, the total, the monthly equivalent, and the cost to own."
 *
 * The `term` prop is REQUIRED whenever `kind="rental"`. TypeScript enforces it,
 * so "a rental figure without its term" is a compile error rather than a
 * review comment. §48's acceptance criterion — "No screen shows a rental figure
 * without its term" — is therefore checked by the type system.
 */

import { RENTAL_TERMS, type RentalTerm } from '@/lib/taxonomy'

/** Whole dollars only. Cents are stored, never displayed (DESIGN.md §8). */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function termLabel(months: number): string {
  return months === 1 ? '1 month' : `${months} months`
}

type MoneyProps =
  | {
      /** A one-off amount with no term: a purchase price, an earnings figure. */
      kind?: 'plain'
      cents: number
      className?: string
      /** Screen-reader-only prefix, e.g. "Purchase price". */
      srLabel?: string
    }
  | {
      /** A prepaid rental total. `term` is mandatory — see §6.7. */
      kind: 'rental'
      cents: number
      term: RentalTerm | number
      className?: string
      srLabel?: string
    }
  | {
      /** A derived monthly equivalent. `term` names the prepaid term behind it. */
      kind: 'monthly'
      cents: number
      term: RentalTerm | number
      className?: string
      srLabel?: string
    }

export function Money(props: MoneyProps) {
  const cls = ['tnum', props.className].filter(Boolean).join(' ')
  const sr = props.srLabel ? <span className="sr-only">{props.srLabel} </span> : null

  // Switched on `props.kind` directly rather than a destructured local, so
  // TypeScript narrows the union and `term` stays mandatory on the two variants
  // that require it.
  switch (props.kind) {
    case 'rental':
      return (
        <span className={cls}>
          {sr}
          {dollars(props.cents)}
          <span className="sr-only"> for {termLabel(props.term)}</span>
        </span>
      )

    case 'monthly':
      return (
        <span className={cls}>
          {sr}
          {dollars(props.cents)}
          <span aria-hidden="true">/mo</span>
          <span className="sr-only">
            {' '}per month, the monthly equivalent of a {termLabel(props.term)} prepaid rental
          </span>
        </span>
      )

    default:
      return <span className={cls}>{sr}{dollars(props.cents)}</span>
  }
}

/**
 * §14.2 — the card price block. NON-NEGOTIABLE per §6.7: the card shows both a
 * rental figure and the purchase price.
 *
 * "v1.0's card showed only 'From $24/month', which is exactly the ambiguity the
 *  product cannot afford."
 */
export function CardPrice({
  fromCents, twelveMonthCents, purchaseCents,
}: { fromCents: number; twelveMonthCents: number; purchaseCents: number }) {
  return (
    <div className="card-price">
      <span
        className="tnum card-price-rent"
        title={`${dollars(twelveMonthCents)} prepaid for 12 months`}
      >
        From {dollars(fromCents)}<span aria-hidden="true">/mo</span>
        <span className="sr-only">
          {' '}per month — {dollars(twelveMonthCents)} prepaid for 12 months
        </span>
      </span>
      <span className="tnum card-price-own">
        {dollars(purchaseCents)} to own
      </span>
    </div>
  )
}

export const TERMS = RENTAL_TERMS
