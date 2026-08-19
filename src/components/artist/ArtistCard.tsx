/**
 * §6.5 — "Artists are people, not inventory. Bios, faces, locations, and
 * commission availability are visible and meaningful everywhere their work
 * appears."
 */
import Link from 'next/link'
import Image from 'next/image'
import type { Artist, Artwork } from '@/lib/db/types'
import { Badge, DemoArtistBadge } from '@/components/ui/Badge'

export function ArtistCard({ artist, works }: { artist: Artist; works: readonly Artwork[] }) {
  return (
    <article className="artist-card">
      <Link href={`/artist/${artist.slug}`} className="artist-card-head">
        {artist.profile_image_url ? (
          <Image
            src={artist.profile_image_url}
            alt=""
            width={56} height={56}
            className="artist-avatar"
          />
        ) : <div className="artist-avatar" aria-hidden="true" />}
        <div className="artist-card-id">
          <h3 className="artist-card-name">{artist.name}</h3>
          <p className="artist-card-loc">{artist.location}</p>
        </div>
      </Link>

      <p className="artist-card-tagline">{artist.tagline}</p>

      <div className="artist-card-works">
        {works.map((w) => (
          <Link key={w.id} href={`/artwork/${w.slug}`} className="artist-card-thumb" aria-label={w.title}>
            <Image src={w.thumbnail_url} alt="" fill sizes="120px" style={{ objectFit: 'contain' }} />
          </Link>
        ))}
      </div>

      <div className="artist-card-meta">
        {artist.commission_available ? <Badge tone="accent">Takes commissions</Badge> : null}
        {artist.is_fictional ? <DemoArtistBadge /> : null}
      </div>
    </article>
  )
}
