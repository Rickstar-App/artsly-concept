/**
 * PURCHASE — PRD §21.
 *
 *   OWN IT
 *   Purchase price                  $1,200
 *   Shipping                       Included
 *   Total                           $1,200
 *   Your rental ends when you buy — nothing to send back.
 *   Renting doesn't reduce the purchase price.
 */
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getArtworkBySlug, getArtist } from '@/lib/db/catalog'
import { getViewer } from '@/lib/session'
import { PurchaseForm } from '@/components/rental/PurchaseForm'

export const metadata: Metadata = { title: 'Own it' }

export default async function PurchasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const art = getArtworkBySlug(slug)
  if (!art) notFound()

  const viewer = await getViewer()
  if (!viewer.signedIn) redirect(`/onboarding?next=/checkout/${slug}/purchase`)

  const mine = viewer.state?.rentals.find((r) => r.artwork_id === art.id && r.status === 'active')
  const availability = viewer.availabilityOf(art.id)

  return (
    <div className="page checkout-page narrow">
      <PurchaseForm
        artwork={art}
        artistName={getArtist(art.artist_id)?.name ?? ''}
        activeRental={mine ? { id: mine.id, endDate: mine.end_date, address: mine.shipping_address } : null}
        // §21.3 — only the current renter may buy a rented piece.
        blocked={availability === 'sold' || (availability === 'rented' && !mine)}
        blockedReason={availability === 'sold' ? 'sold' : 'rented'}
        defaultName={viewer.state?.user.display_name ?? ''}
        defaultEmail={viewer.state?.user.email ?? ''}
      />
    </div>
  )
}
