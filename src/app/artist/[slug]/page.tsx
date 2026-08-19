/**
 * ARTIST PROFILE — PRD §16.
 *
 * "Each grid card shows the standard card pricing and its availability badge.
 *  CARDS FOR RENTED PIECES STAY VISIBLE ON THE ARTIST PROFILE — an artist's body
 *  of work shouldn't disappear because it's out on loan — but with the
 *  'In someone's home' badge." (§16)
 *
 * "If commission_available is true, show a Request a commission CTA that routes
 *  into the Mystery form pre-set to `custom` with that artist pre-selected."
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getArtistBySlug, getArtist, worksOf } from '@/lib/db/catalog'
import { getViewer } from '@/lib/session'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { Badge, DemoArtistBadge } from '@/components/ui/Badge'
import { EmptyState, EMPTY } from '@/components/ui/EmptyState'
import { STYLE_LABEL, type Style } from '@/lib/taxonomy'
import { ArtistViewTracker } from '@/components/artist/ArtistViewTracker'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = getArtistBySlug(slug)
  return a ? { title: a.name, description: a.tagline ?? undefined } : { title: 'Artist not found' }
}

export default async function ArtistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const artist = getArtistBySlug(slug)
  if (!artist) notFound()

  const viewer = await getViewer()
  const works = worksOf(artist.id)
  const savedIds = new Set(viewer.state?.favorites.map((f) => f.artwork_id) ?? [])

  const items = works.map((w) => ({
    artwork: w,
    artistName: artist.name,
    artistSlug: artist.slug,
    saved: savedIds.has(w.id),
    availability: viewer.availabilityOf(w.id),
  }))

  return (
    <div className="page section-top">
      <ArtistViewTracker artistId={artist.id} />

      <header className="artist-hero">
        {artist.profile_image_url ? (
          <Image src={artist.profile_image_url} alt="" width={160} height={160} className="artist-hero-avatar" priority />
        ) : null}
        <div className="artist-hero-body">
          <h1 className="artist-hero-name">{artist.name}</h1>
          <p className="artist-hero-tagline">{artist.tagline}</p>
          {artist.bio ? <p className="artist-hero-bio">{artist.bio}</p> : null}

          <dl className="artist-hero-meta">
            {artist.location ? (
              <div><dt>Based in</dt><dd>{artist.location}</dd></div>
            ) : null}
            {artist.mediums.length ? (
              <div><dt>Works in</dt><dd>{artist.mediums.join(' · ')}</dd></div>
            ) : null}
            {artist.styles.length ? (
              <div><dt>Styles</dt><dd>{artist.styles.map((s) => STYLE_LABEL[s as Style]).join(' · ')}</dd></div>
            ) : null}
          </dl>

          <div className="artist-hero-actions">
            {artist.commission_available ? (
              <>
                <Badge tone="accent">Available for commissions</Badge>
                {/* §27.3 — enters the Mystery flow with this artist pre-selected. */}
                <Link href={`/mystery/new?type=custom&artist=${artist.slug}`} className="btn btn-primary btn-compact">
                  Request a commission
                </Link>
              </>
            ) : (
              <Badge tone="neutral">Not taking commissions</Badge>
            )}
            {artist.is_fictional ? <DemoArtistBadge /> : null}
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Work</h2>
          <p className="result-count tnum">{works.length} pieces</p>
        </div>
        {items.length > 0 ? (
          <ArtworkGrid items={items} eagerCount={4} />
        ) : (
          <EmptyState {...EMPTY.artist} />
        )}
      </section>
    </div>
  )
}

void getArtist
