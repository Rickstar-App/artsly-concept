'use client'

/**
 * THE FORFEITURE DISCLOSURE — PRD §20.3. REQUIRED.
 *
 *   You have 23 days left on "Blue Horizon."
 *   Swapping now ends that rental — those 23 days aren't refunded or credited.
 *     [ Swap anyway — $200 ]
 *     [ Wait until March 12 ]
 *     [ Extend Blue Horizon instead ]
 *
 * "Burying this would be the kind of thing that makes a marketplace
 *  untrustworthy AT EXACTLY THE MOMENT TRUST MATTERS. Show it plainly and offer
 *  the off-ramp." (§20.3)
 */

import Link from 'next/link'
import { dollars } from '@/components/ui/Money'
import { formatDate, pluralDays } from '@/lib/format'

export function SwapDisclosure({
  outgoingTitle, outgoingRentalId, daysLeft, endDate, newTotalCents, onConfirm, pending,
}: {
  outgoingTitle: string
  outgoingRentalId: string
  daysLeft: number
  endDate: string
  newTotalCents: number
  onConfirm: () => void
  pending?: boolean
}) {
  return (
    <section className="disclosure" aria-labelledby="swap-disclosure-title">
      <p id="swap-disclosure-title" className="disclosure-title">
        You have {pluralDays(Math.max(0, daysLeft))} left on “{outgoingTitle}.”
      </p>
      <p className="disclosure-body">
        Swapping now ends that rental — those days aren’t refunded or credited.
      </p>
      <div className="disclosure-actions">
        <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={pending}>
          {pending ? 'Working…' : `Swap anyway — ${dollars(newTotalCents)}`}
        </button>
        <Link href="/my-space" className="btn btn-secondary">Wait until {formatDate(endDate)}</Link>
        <Link href={`/rental/${outgoingRentalId}/extend`} className="btn btn-ghost">
          Extend “{outgoingTitle}” instead
        </Link>
      </div>
    </section>
  )
}
