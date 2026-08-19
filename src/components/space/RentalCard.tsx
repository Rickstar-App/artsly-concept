'use client'

/**
 * RENTAL CARD — PRD §18.1, §18.2.
 *
 *   │ Blue Horizon │
 *   │ Maya Chen    │
 *   │ 23 days left │
 *   │ ████████░░░░ │
 *   │ [Buy] [Extend]│
 *   │ [Swap][Return]│
 *
 * §18.2 — "≤ 14 days: amber accent, copy changes to 'Ending soon — extend, swap,
 * or let it go.' ≤ 0 days: the card moves to a 'Ready to go back' state with
 * Extend and Return as the only actions."
 *
 * "'Expiring soon' is a DERIVED UI STATE, NOT A DATABASE STATUS." (§18.2)
 *
 * §45 — "NEVER RELY ON COLOUR ALONE. The ≤14-day urgency state needs the amber
 * AND the copy change AND the progress bar."
 */

import Link from 'next/link'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import type { Artwork, Rental } from '@/lib/db/types'
import { daysBetween, daysRemaining } from '@/lib/db/state'
import { URGENCY_DAYS } from '@/lib/pricing/config'
import { MysteryBadge, Badge } from '@/components/ui/Badge'
import { formatDate, pluralDays } from '@/lib/format'
import { ReturnDialog } from '@/components/rental/ReturnDialog'
import { markReturned } from '@/lib/actions/rentals'

export function RentalCard({
  rental, artwork, artistName, artistSlug, inTransit,
}: {
  rental: Rental
  artwork: Artwork
  artistName: string
  artistSlug: string
  inTransit?: boolean
}) {
  const [returning, setReturning] = useState(false)
  const [pending, start] = useTransition()

  const left = daysRemaining(rental.end_date)
  const total = Math.max(1, daysBetween(rental.start_date, rental.end_date))
  const elapsed = Math.min(100, Math.max(0, ((total - left) / total) * 100))
  const isMystery = rental.source === 'mystery'

  // §18.2 — three derived states. Never a stored status.
  const state: 'normal' | 'soon' | 'over' = left <= 0 ? 'over' : left <= URGENCY_DAYS ? 'soon' : 'normal'

  return (
    <article className={`rental-card rental-card-${inTransit ? 'transit' : state}`}>
      <Link href={`/artwork/${artwork.slug}`} className="rental-card-media" aria-label={artwork.title}>
        <Image src={artwork.thumbnail_url} alt={artwork.alt_text} fill sizes="(max-width:900px) 90vw, 300px" style={{ objectFit: 'contain', padding: 12 }} />
      </Link>

      <div className="rental-card-body">
        <div className="rental-card-badges">
          {isMystery ? <MysteryBadge /> : null}
          {inTransit ? <Badge tone="neutral">On its way back</Badge> : null}
        </div>

        <h3 className="rental-card-title">
          <Link href={`/artwork/${artwork.slug}`}>{artwork.title}</Link>
        </h3>
        <Link href={`/artist/${artistSlug}`} className="rental-card-artist">{artistName}</Link>

        {inTransit ? (
          <>
            <p className="rental-card-status">
              Heading back to {artistName.split(' ')[0]}. A prepaid label is on its way by email.
            </p>
            <div className="rental-card-actions">
              <button
                type="button" className="btn btn-secondary btn-compact" disabled={pending}
                onClick={() => start(async () => { await markReturned(rental.id) })}
              >
                Mark as sent back
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={`rental-card-countdown tnum${state !== 'normal' ? ' is-urgent' : ''}`}>
              {isMystery
                ? `Rotates in ${pluralDays(Math.max(0, left))}`
                : left > 0
                  ? `${pluralDays(left)} left`
                  : 'Ready to go back'}
            </p>

            <div
              className="rental-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(elapsed)}
              aria-label={`${Math.round(elapsed)}% of the rental term elapsed`}
            >
              <div className="rental-progress-fill" style={{ width: `${elapsed}%` }} />
            </div>

            {/* §45 — the copy change, not just the colour. */}
            {state === 'soon' ? (
              <p className="rental-card-note">Ending soon — extend, swap, or let it go.</p>
            ) : state === 'over' ? (
              <p className="rental-card-note">Its term is up. Extend it, or send it home.</p>
            ) : (
              <p className="rental-card-note">Ends {formatDate(rental.end_date)}.</p>
            )}

            <div className="rental-card-actions">
              {/* §18.1 — Mystery pieces cannot be individually returned; they rotate. */}
              {state === 'over' ? (
                <>
                  {!isMystery ? <Link href={`/rental/${rental.id}/extend`} className="btn btn-secondary btn-compact">Extend</Link> : null}
                  <button type="button" className="btn btn-secondary btn-compact" onClick={() => setReturning(true)}>Return</button>
                </>
              ) : (
                <>
                  <Link href={`/checkout/${artwork.slug}/purchase`} className="btn btn-secondary btn-compact">Buy</Link>
                  {!isMystery ? <Link href={`/rental/${rental.id}/extend`} className="btn btn-secondary btn-compact">Extend</Link> : null}
                  <Link href={`/discover?swapFrom=${rental.id}`} className="btn btn-secondary btn-compact">Swap</Link>
                  {!isMystery ? (
                    <button type="button" className="btn btn-secondary btn-compact" onClick={() => setReturning(true)}>Return</button>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <ReturnDialog
        open={returning}
        onClose={() => setReturning(false)}
        rentalId={rental.id}
        artworkTitle={artwork.title}
        daysLeft={left}
      />
    </article>
  )
}
