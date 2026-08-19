/**
 * EXTEND — PRD §19.
 *
 * §19 is a NEW SECTION: "v1.0 put 'Extend Rental' on the dashboard as a primary
 * CTA and specified it NOWHERE — not in the feature list, not in acceptance
 * criteria, not in the demo script." (§0.1 defect #15: "Demo hits a dead button
 * on the money screen.")
 */
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getArtwork, getArtist } from '@/lib/db/catalog'
import { ExtendDialog } from '@/components/rental/ExtendDialog'

export const metadata: Metadata = { title: 'Extend rental' }

export default async function ExtendPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')

  const rental = viewer.state!.rentals.find((r) => r.id === id)
  if (!rental) notFound()
  const art = getArtwork(rental.artwork_id)
  if (!art) notFound()

  return (
    <div className="page checkout-page narrow">
      <ExtendDialog
        rental={rental}
        artwork={art}
        artistName={getArtist(art.artist_id)?.name ?? ''}
      />
    </div>
  )
}
