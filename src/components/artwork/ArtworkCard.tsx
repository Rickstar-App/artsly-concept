/**
 * ARTWORK CARD — PRD §14.2.
 *
 *   ┌────────────────────────┐
 *   │       [ARTWORK]        │   native aspect, lazy-loaded thumb
 *   ├────────────────────────┤
 *   │ Because you like       │   ← reason chip, small caps
 *   │ abstract art           │
 *   │ Blue Horizon        ♡  │   ← title + save toggle
 *   │ Maya Puterman          │   ← artist, links to profile
 *   │ Abstract · Calm · Blue │   ← up to 3 tag labels
 *   │ From $49/mo            │   ← floor(rental_12m / 12)
 *   │ $1,200 to own          │   ← ALWAYS shown alongside
 *   └────────────────────────┘
 *
 * §45 — "Nested interactive elements in ArtworkCard (card link + save toggle +
 * artist link) must not produce invalid HTML or an unreachable tab order — USE
 * A CARD-WIDE OVERLAY LINK, NOT A WRAPPING <a>."
 *
 * That is exactly what this does: the <article> is not a link; a single
 * absolutely-positioned <a> covers it at z-index 1, and the save toggle and
 * artist link sit at z-index 2. Result is valid HTML, a sane tab order, and a
 * fully clickable card.
 */

import Link from 'next/link'
import type { Artwork } from '@/lib/db/types'
import { COLOR_LABEL, MOOD_LABEL, STYLE_LABEL, type Color, type Mood, type Style } from '@/lib/taxonomy'
import { fromPriceCents } from '@/lib/pricing/rental'
import { CardPrice } from '@/components/ui/Money'
import { ArtworkImage } from './ArtworkImage'
import { SaveToggle } from './SaveToggle'
import { ReasonChip } from './ReasonChip'
import { AvailabilityBadge } from '@/components/ui/Badge'
import type { Reason } from '@/lib/recommend/explain'
import type { ArtworkAvailability } from '@/lib/taxonomy'

export interface ArtworkCardProps {
  artwork: Artwork
  artistName: string
  artistSlug: string
  reason?: Reason | null
  saved?: boolean
  availability?: ArtworkAvailability
  priority?: boolean
  /** Swap mode passes the outgoing rental so the link carries it through (§20.2). */
  swapFrom?: string
}

export function ArtworkCard({
  artwork, artistName, artistSlug, reason, saved = false,
  availability, priority, swapFrom,
}: ArtworkCardProps) {
  const state = availability ?? artwork.availability
  const unavailable = state !== 'available'
  const href = swapFrom
    ? `/artwork/${artwork.slug}?swapFrom=${encodeURIComponent(swapFrom)}`
    : `/artwork/${artwork.slug}`

  // Up to 3 tag labels: one style, one mood, one colour — a legible summary
  // rather than a tag dump.
  const tags = [
    artwork.styles[0] ? STYLE_LABEL[artwork.styles[0] as Style] : null,
    artwork.moods[0] ? MOOD_LABEL[artwork.moods[0] as Mood] : null,
    artwork.colors[0] ? COLOR_LABEL[artwork.colors[0] as Color] : null,
  ].filter(Boolean) as string[]

  return (
    <article className={`artwork-card${unavailable ? ' is-unavailable' : ''}`}>
      <div className="artwork-card-media">
        <ArtworkImage
          src={artwork.thumbnail_url}
          alt={artwork.alt_text}
          widthIn={artwork.width_in}
          heightIn={artwork.height_in}
          blurDataURL={artwork.blur_data_url}
          title={artwork.title}
          artistName={artistName}
          priority={priority}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
        />
        {unavailable ? (
          <div className="artwork-card-badge"><AvailabilityBadge availability={state} /></div>
        ) : null}
      </div>

      <div className="artwork-card-body">
        {reason ? <ReasonChip reason={reason} /> : null}

        <div className="artwork-card-title-row">
          <h3 className="artwork-card-title">
            {/* The one card-wide link. Everything else layers above it. */}
            <Link href={href} className="artwork-card-link">{artwork.title}</Link>
          </h3>
          <div className="artwork-card-save">
            <SaveToggle artworkId={artwork.id} artworkTitle={artwork.title} initialSaved={saved} compact />
          </div>
        </div>

        <Link href={`/artist/${artistSlug}`} className="artwork-card-artist">{artistName}</Link>

        <p className="artwork-card-tags">{tags.join(' · ')}</p>

        {/* §6.7 / §14.2 — both a rental figure AND the purchase price. Always. */}
        <CardPrice
          fromCents={fromPriceCents(artwork)}
          twelveMonthCents={artwork.rental_12m_cents}
          purchaseCents={artwork.purchase_price_cents}
        />
      </div>
    </article>
  )
}
