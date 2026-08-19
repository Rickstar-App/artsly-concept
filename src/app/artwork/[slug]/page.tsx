/**
 * ARTWORK DETAIL — PRD §15.
 *
 * "Two-column on desktop (image left, sticky purchase panel right); stacked on
 *  mobile with the panel pinned to the bottom." (§15)
 *
 * §48 acceptance: "Every artwork page states what it is, who made it, its exact
 * dimensions and size class, ALL FOUR RENTAL TOTALS WITH MONTHLY EQUIVALENTS,
 * the purchase price, and that shipping is included both ways."
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ARTWORKS, getArtworkBySlug, getArtist, worksOf, scorable } from '@/lib/db/catalog'
import { getViewer, budgetBandLabel } from '@/lib/session'
import { scoreArtwork, similar, affinityBonusFor } from '@/lib/recommend/score'
import { whyThisPiece, SECTION_LABELS } from '@/lib/recommend/explain'
import { comparisonPriceDollars } from '@/lib/pricing/rental'
import { ArtworkImage } from '@/components/artwork/ArtworkImage'
import { SaveToggle } from '@/components/artwork/SaveToggle'
import { WhyThisPiece } from '@/components/artwork/WhyThisPiece'
import { PurchasePanel } from '@/components/artwork/PurchasePanel'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { ArtistStrip } from '@/components/artist/ArtistStrip'
import { AvailabilityBadge } from '@/components/ui/Badge'
import { UnavailableNotice } from '@/components/artwork/UnavailableNotice'
import { ViewTracker } from '@/components/artwork/ViewTracker'
import {
  COLOR_LABEL, MOOD_LABEL, SIZE_LABEL, STYLE_LABEL, ROOM_LABEL,
  type Color, type Mood, type Room, type Style,
} from '@/lib/taxonomy'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const art = getArtworkBySlug(slug)
  if (!art) return { title: 'Artwork not found' }
  const artist = getArtist(art.artist_id)
  return { title: `${art.title} by ${artist?.name}`, description: art.description ?? undefined }
}

export default async function ArtworkPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ swapFrom?: string }>
}) {
  const { slug } = await params
  const { swapFrom } = await searchParams
  const art = getArtworkBySlug(slug)
  if (!art) notFound()

  const artist = getArtist(art.artist_id)!
  const viewer = await getViewer()
  const availability = viewer.availabilityOf(art.id)

  const result = viewer.profile
    ? scoreArtwork(
        viewer.profile,
        { ...art, comparison_price: comparisonPriceDollars(art) },
        affinityBonusFor(art, viewer.affinity),
      )
    : null

  const why = viewer.profile && result
    ? whyThisPiece(
        viewer.profile,
        { ...scorable(art), width_in: art.width_in, height_in: art.height_in },
        result,
        budgetBandLabel(viewer.state),
      )
    : null

  const saved = viewer.state?.favorites.some((f) => f.artwork_id === art.id) ?? false
  const myRental = viewer.state?.rentals.find((r) => r.artwork_id === art.id && r.status === 'active')
  const iOwnIt = viewer.state?.purchases.some((p) => p.artwork_id === art.id) ?? false

  // §15.1 — "More like this" rail, backed by §12.8.
  const pool = ARTWORKS.map((a) => ({ ...scorable(a), availability: viewer.availabilityOf(a.id) }))
  const moreLikeThis = similar(scorable(art), pool, 8)
    .map((s) => ARTWORKS.find((a) => a.id === s.id)!)
    .filter(Boolean)
    .slice(0, 4)

  const savedIds = new Set(viewer.state?.favorites.map((f) => f.artwork_id) ?? [])
  const railItems = moreLikeThis.map((a) => ({
    artwork: a,
    artistName: getArtist(a.artist_id)!.name,
    artistSlug: getArtist(a.artist_id)!.slug,
    saved: savedIds.has(a.id),
    availability: viewer.availabilityOf(a.id),
  }))

  const otherWorks = worksOf(artist.id).filter((w) => w.id !== art.id).slice(0, 4)

  return (
    <div className="page detail">
      {/* §13.2 — a view counts only after 3s of dwell. */}
      <ViewTracker artworkId={art.id} />

      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/discover">Discover</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/artist/${artist.slug}`}>{artist.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{art.title}</span>
      </nav>

      {swapFrom ? (
        <div className="swap-banner" role="status">
          <span>You’re choosing a replacement. We’ll confirm what you give up at checkout.</span>
          <Link href="/my-space" className="btn btn-ghost btn-compact">Cancel swap</Link>
        </div>
      ) : null}

      <div className="detail-grid">
        <div className="detail-media">
          <div className="mat">
            <ArtworkImage
              src={art.image_url}
              alt={art.alt_text}
              widthIn={art.width_in}
              heightIn={art.height_in}
              blurDataURL={art.blur_data_url}
              title={art.title}
              artistName={artist.name}
              priority
              sizes="(max-width: 900px) 100vw, 55vw"
              className="detail-frame"
            />
          </div>
          <div className="detail-caption">
            <p className="detail-caption-line tnum">
              {trimNum(art.width_in)} × {trimNum(art.height_in)} in · {SIZE_LABEL[art.size_category]}
            </p>
            <p className="detail-caption-line">{art.medium}{art.materials ? ` · ${art.materials}` : ''}</p>
            {art.year_created ? <p className="detail-caption-line tnum">{art.year_created}</p> : null}
          </div>
        </div>

        <div className="detail-side">
          <div className="detail-head">
            <div>
              {availability !== 'available' ? (
                <div className="detail-availability"><AvailabilityBadge availability={availability} /></div>
              ) : null}
              <h1 className="detail-title">{art.title}</h1>
              <p className="detail-byline">
                <Link href={`/artist/${artist.slug}`} className="detail-artist">{artist.name}</Link>
                {artist.location ? <span className="detail-loc"> · {artist.location}</span> : null}
              </p>
            </div>
            <SaveToggle artworkId={art.id} artworkTitle={art.title} initialSaved={saved} />
          </div>

          <ul className="detail-tags">
            {art.styles.map((s) => (
              <li key={s}><Link href={`/discover?styles=${s}`} className="chip chip-static chip-link">{STYLE_LABEL[s as Style]}</Link></li>
            ))}
            {art.colors.map((c) => (
              <li key={c}><Link href={`/discover?colors=${c}`} className="chip chip-static chip-link">{COLOR_LABEL[c as Color]}</Link></li>
            ))}
            {art.moods.map((m) => (
              <li key={m}><span className="chip chip-static">{MOOD_LABEL[m as Mood]}</span></li>
            ))}
          </ul>

          <p className="detail-rooms">
            Tagged for {art.rooms.map((r) => ROOM_LABEL[r as Room].toLowerCase()).join(', ')}.
          </p>

          {why && result ? <WhyThisPiece lines={why} matchScore={result.match_score} /> : null}

          {availability === 'available' || myRental ? (
            <PurchasePanel
              artwork={art}
              artistName={artist.name}
              canRent={availability === 'available'}
              activeRentalId={myRental?.id ?? null}
              owned={iOwnIt}
              swapFrom={swapFrom ?? null}
              signedIn={viewer.signedIn}
            />
          ) : (
            <UnavailableNotice availability={availability} similar={railItems.slice(0, 3)} />
          )}

          {art.description ? (
            <div className="detail-prose">
              <p className="eyebrow">About this piece</p>
              <p>{art.description}</p>
            </div>
          ) : null}

          {art.artist_note ? (
            <blockquote className="artist-note">
              <p>{art.artist_note}</p>
              <cite>— {artist.name}</cite>
            </blockquote>
          ) : null}
        </div>
      </div>

      <ArtistStrip artist={artist} works={otherWorks} />

      {railItems.length > 0 ? (
        <section className="section">
          <h2 className="section-title">{SECTION_LABELS.moreLikeThis}</h2>
          <div style={{ height: 20 }} />
          <ArtworkGrid items={railItems} eagerCount={0} />
        </section>
      ) : null}
    </div>
  )
}

function trimNum(n: number) { return Number.isInteger(n) ? String(n) : n.toFixed(1) }
