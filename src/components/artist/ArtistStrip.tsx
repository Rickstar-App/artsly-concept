/**
 * §15.1 — artist strip on every artwork detail page:
 * "photo, tagline, location, commission availability, four other works,
 *  'View artist.'"
 *
 * §6.5 — artists are people, not inventory. This strip is where that principle
 * shows up on the highest-traffic page in the product.
 */
import Link from 'next/link'
import Image from 'next/image'
import type { Artist, Artwork } from '@/lib/db/types'
import { Badge, DemoArtistBadge } from '@/components/ui/Badge'

export function ArtistStrip({ artist, works }: { artist: Artist; works: readonly Artwork[] }) {
  return (
    <section className="artist-strip">
      <div className="artist-strip-id">
        {artist.profile_image_url ? (
          <Image src={artist.profile_image_url} alt="" width={72} height={72} className="artist-avatar artist-avatar-lg" />
        ) : null}
        <div>
          <p className="eyebrow">About the artist</p>
          <h2 className="artist-strip-name">
            <Link href={`/artist/${artist.slug}`}>{artist.name}</Link>
          </h2>
          <p className="artist-strip-tagline">{artist.tagline}</p>
          <p className="artist-strip-meta">
            {artist.location}
            {artist.mediums.length ? ` · ${artist.mediums.join(' · ')}` : ''}
          </p>
          <div className="artist-strip-badges">
            {artist.commission_available ? (
              <Link href={`/mystery/new?type=custom&artist=${artist.slug}`}>
                <Badge tone="accent">Available for commissions</Badge>
              </Link>
            ) : null}
            {artist.is_fictional ? <DemoArtistBadge /> : null}
          </div>
        </div>
      </div>

      {works.length > 0 ? (
        <div className="artist-strip-works">
          {works.map((w) => (
            <Link key={w.id} href={`/artwork/${w.slug}`} className="artist-strip-thumb" title={w.title}>
              <Image src={w.thumbnail_url} alt={w.alt_text} fill sizes="160px" style={{ objectFit: 'contain', padding: 8 }} />
            </Link>
          ))}
        </div>
      ) : null}

      <Link href={`/artist/${artist.slug}`} className="btn btn-secondary btn-compact artist-strip-cta">
        View artist
      </Link>
    </section>
  )
}
