'use client'

/**
 * EXTEND — PRD §19.5.
 *
 *   EXTEND "BLUE HORIZON"
 *   Currently ends March 12, 2027.
 *     + 1 month     $80     → ends April 12
 *     + 3 months   $200     → ends June 12
 *   Charged today: $200
 *   Extending doesn't change the $1,200 purchase price.
 *
 * §19.2 — the new end date is computed from the OLD END DATE, never from today.
 * "Adding from the old end date is what makes early extension safe — a user who
 *  extends on day 2 doesn't lose 28 days."
 *
 * §19.3 — at the 24-month cap the CTA becomes the buy prompt: "That is the
 * single best-converting moment in the product; DO NOT SKIP IT."
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Artwork, Rental } from '@/lib/db/types'
import { RENTAL_TERMS, type RentalTerm } from '@/lib/taxonomy'
import { rentalTotalCents } from '@/lib/pricing/rental'
import { addMonths } from '@/lib/db/state'
import { dollars, termLabel } from '@/components/ui/Money'
import { extendRental } from '@/lib/actions/rentals'
import { formatDate } from '@/lib/format'
import { MAX_CUMULATIVE_RENTAL_MONTHS } from '@/lib/pricing/config'
import { toast } from '@/components/ui/Toast'

export function ExtendDialog({
  rental, artwork, artistName,
}: { rental: Rental; artwork: Artwork; artistName: string }) {
  const router = useRouter()
  const [term, setTerm] = useState<RentalTerm>(3)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const available = RENTAL_TERMS.filter(
    (t) => rental.rental_period_months + t <= MAX_CUMULATIVE_RENTAL_MONTHS,
  )
  const atCap = available.length === 0
  const price = rentalTotalCents(artwork, term)

  // §19.3 — the cap moment.
  if (atCap) {
    return (
      <section className="extend">
        <p className="eyebrow">Extend</p>
        <h1 className="page-title">You’ve had this for two years.</h1>
        <p className="lede">
          “{artwork.title}” has been on your wall for {rental.rental_period_months} months.
          Maybe it should be yours.
        </p>
        <div className="extend-actions">
          <Link href={`/checkout/${artwork.slug}/purchase`} className="btn btn-primary">
            Own it — {dollars(artwork.purchase_price_cents)}
          </Link>
          <Link href="/my-space" className="btn btn-secondary">Back to My Space</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="extend">
      <p className="eyebrow">Extend</p>
      <h1 className="page-title">“{artwork.title}”</h1>
      <p className="extend-current tnum">Currently ends {formatDate(rental.end_date)}.</p>

      <fieldset className="extend-options">
        <legend className="sr-only">Choose how much longer to keep it</legend>
        {available.map((t) => {
          const cost = rentalTotalCents(artwork, t)
          // §19.2 — from the OLD END DATE.
          const newEnd = addMonths(rental.end_date, t)
          return (
            <label key={t} className={`extend-row${term === t ? ' is-selected' : ''}`}>
              <input
                type="radio" name="extend-term" value={t}
                checked={term === t} onChange={() => setTerm(t)} className="sr-only"
              />
              <span className="extend-mark" aria-hidden="true">{term === t ? '●' : '○'}</span>
              <span className="extend-term">+ {termLabel(t)}</span>
              <span className="extend-price tnum">{dollars(cost)}</span>
              <span className="extend-end tnum">→ ends {formatDate(newEnd)}</span>
            </label>
          )
        })}
      </fieldset>

      <div className="extend-summary">
        <p className="extend-charge">
          Charged today: <strong className="tnum">{dollars(price)}</strong>
        </p>
        {/* §7.4 — extension does not move the purchase price either. */}
        <p className="extend-note">
          Extending doesn’t change the <span className="tnum">{dollars(artwork.purchase_price_cents)}</span> purchase price.
          {artistName ? ` ${artistName.split(' ')[0]} keeps 60% of it.` : ''}
        </p>
      </div>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <div className="extend-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null)
              const res = await extendRental(rental.id, term)
              if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
              toast({
                title: `Extended — “${artwork.title}” now ends ${formatDate(addMonths(rental.end_date, term))}.`,
                tone: 'success',
              })
              router.push('/my-space')
              router.refresh()
            })
          }
        >
          {pending ? 'Extending…' : `Extend ${termLabel(term)} — ${dollars(price)}`}
        </button>
        <Link href="/my-space" className="btn btn-secondary">Cancel</Link>
      </div>
    </section>
  )
}
