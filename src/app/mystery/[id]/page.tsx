/**
 * MYSTERY SUBSCRIPTION — PRD §26.3, §26.4, §26.6, §27.3.
 * Confirmation, reveal, and management, on one route.
 */
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getArtwork, getArtist } from '@/lib/db/catalog'
import { matchesForCycle } from '@/lib/db/state'
import { RevealSequence, type RevealPiece } from '@/components/mystery/RevealSequence'
import { CommissionState } from '@/components/mystery/CommissionState'

export const metadata: Metadata = { title: 'Your Mystery Art' }

export default async function MysterySubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/mystery')

  const state = viewer.state!
  const sub = state.subscriptions.find((s) => s.id === id)
  if (!sub) notFound()

  const matches = matchesForCycle(state, sub.id, sub.cycle)

  // §27.3 — a commission renders its own state; there is no artwork to reveal.
  const commission = matches.find((m) => m.kind === 'commission')
  if (commission) {
    const artist = getArtist(commission.artist_id)
    if (artist) {
      return <div className="page section-top narrow"><CommissionState artist={artist} subscription={sub} /></div>
    }
  }

  const pieces: RevealPiece[] = matches
    .filter((m) => m.artwork_id)
    .map((m) => {
      const art = getArtwork(m.artwork_id!)
      const artist = art ? getArtist(art.artist_id) : undefined
      return art && artist
        ? { artwork: art, artistName: artist.name, artistSlug: artist.slug, matchScore: m.match_score }
        : null
    })
    .filter(Boolean) as RevealPiece[]

  const alreadyRevealed = matches.length > 0 && matches.every((m) => m.revealed_at !== null)

  // §26.2 — flag when the size bucket had to widen, so the reveal can say so.
  const widened = pieces.some((p) => p.artwork.size_category !== sub.size)

  return (
    <div className="page section-top">
      <RevealSequence
        subscription={sub}
        pieces={pieces}
        alreadyRevealed={alreadyRevealed}
        widened={widened}
      />
    </div>
  )
}
