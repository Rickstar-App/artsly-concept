/**
 * §28 — "Saved pieces live at My Space → Saved. Profile links to it. ONE HOME,
 * NOT TWO." (v1.0's §38 put it under Profile and §54 under My Space.)
 *
 * "Saved pieces that become sold or rented STAY IN THE LIST, badged, with a
 *  Notify me action."
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { getArtwork, getArtist } from '@/lib/db/catalog'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { EmptyState, EMPTY } from '@/components/ui/EmptyState'

export const metadata: Metadata = { title: 'Saved' }

export default async function SavedPage() {
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')
  const state = viewer.state!

  const items = state.favorites
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((f) => {
      const art = getArtwork(f.artwork_id)
      if (!art) return null
      const artist = getArtist(art.artist_id)
      return {
        artwork: art,
        artistName: artist?.name ?? '',
        artistSlug: artist?.slug ?? '',
        saved: true,
        availability: viewer.availabilityOf(art.id),
      }
    })
    .filter(Boolean) as Parameters<typeof ArtworkGrid>[0]['items']

  return (
    <div className="page section-top">
      <div className="section-head">
        <h1 className="page-title">Saved</h1>
        <p className="result-count tnum">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</p>
      </div>
      <div style={{ height: 20 }} />
      {items.length > 0 ? <ArtworkGrid items={items} eagerCount={4} /> : <EmptyState {...EMPTY.saved} />}
    </div>
  )
}
