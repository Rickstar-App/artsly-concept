import type { Metadata } from 'next'
import { ARTISTS, ARTWORKS, worksOf } from '@/lib/db/catalog'
import { ArtistCard } from '@/components/artist/ArtistCard'
import { ARTIST_PITCH } from '@/lib/pricing/config'

export const metadata: Metadata = { title: 'Artists' }

export default function ArtistsPage() {
  return (
    <div className="page section-top">
      <h1 className="page-title">Artists</h1>
      <p className="lede">
        {ARTISTS.length} emerging artists, {ARTWORKS.length} pieces. Every one is a single
        original, made by one of them. {ARTIST_PITCH}
      </p>
      <h2 className="sr-only">All artists</h2>
      <div className="artist-grid">
        {ARTISTS.map((a) => <ArtistCard key={a.id} artist={a} works={worksOf(a.id).slice(0, 3)} />)}
      </div>
    </div>
  )
}
