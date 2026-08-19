/**
 * RENTAL CHECKOUT — PRD §17.
 * "Three steps on one page with a persistent order summary. SIMULATED — no real
 *  payment." (§17)
 */
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getArtworkBySlug, getArtist } from '@/lib/db/catalog'
import { getViewer } from '@/lib/session'
import { CheckoutForm } from '@/components/rental/CheckoutForm'
import { RENTAL_TERMS, type RentalTerm } from '@/lib/taxonomy'

export const metadata: Metadata = { title: 'Checkout' }

export default async function CheckoutPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ term?: string; swapFrom?: string }>
}) {
  const { slug } = await params
  const { term, swapFrom } = await searchParams
  const art = getArtworkBySlug(slug)
  if (!art) notFound()

  const viewer = await getViewer()
  if (!viewer.signedIn) redirect(`/onboarding?next=/checkout/${slug}`)

  const parsedTerm = Number(term)
  const initialTerm: RentalTerm = (RENTAL_TERMS as readonly number[]).includes(parsedTerm)
    ? (parsedTerm as RentalTerm)
    : 3

  const outgoing = swapFrom
    ? viewer.state?.rentals.find((r) => r.id === swapFrom && r.status === 'active')
    : undefined
  const outgoingArt = outgoing ? getArtworkBySlug(outgoing.artwork_id) ?? null : null

  return (
    <div className="page checkout-page">
      <CheckoutForm
        artwork={art}
        artistName={getArtist(art.artist_id)?.name ?? ''}
        initialTerm={initialTerm}
        defaultName={viewer.state?.user.display_name ?? ''}
        defaultEmail={viewer.state?.user.email ?? ''}
        swap={outgoing && outgoingArt ? {
          rentalId: outgoing.id,
          title: outgoingArt.title,
          endDate: outgoing.end_date,
        } : null}
        available={viewer.availabilityOf(art.id) === 'available'}
      />
    </div>
  )
}
