/**
 * §18.3 — Past Art.
 *
 * "Owned pieces show PERMANENTLY in Past Art with an 'Owned' badge, no
 *  countdown, and no return prompt."
 */
import Link from 'next/link'
import Image from 'next/image'
import type { Purchase, Rental } from '@/lib/db/types'
import { getArtwork, getArtist } from '@/lib/db/catalog'
import { OwnedBadge, Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/format'
import { dollars } from '@/components/ui/Money'

export function PastArtList({ rentals, purchases }: { rentals: Rental[]; purchases: Purchase[] }) {
  const purchasedIds = new Set(purchases.map((p) => p.artwork_id))

  return (
    <ul className="past-list">
      {rentals.map((r) => {
        const art = getArtwork(r.artwork_id)
        if (!art) return null
        const artist = getArtist(art.artist_id)
        const owned = purchasedIds.has(art.id)
        return (
          <li key={r.id} className="past-row">
            <Link href={`/artwork/${art.slug}`} className="past-thumb" aria-label={art.title}>
              <Image src={art.thumbnail_url} alt="" fill sizes="72px" style={{ objectFit: 'contain', padding: 4 }} />
            </Link>
            <div className="past-id">
              <Link href={`/artwork/${art.slug}`} className="past-title">{art.title}</Link>
              <Link href={`/artist/${artist?.slug}`} className="past-artist">{artist?.name}</Link>
            </div>
            <p className="past-when tnum">
              {owned
                ? `Purchased ${formatDate(r.ended_at ?? r.end_date)}`
                : `Returned ${formatDate(r.ended_at ?? r.end_date)}`}
            </p>
            <p className="past-badge">
              {owned ? <OwnedBadge /> : <Badge tone="neutral">{r.rental_period_months}-month rental</Badge>}
            </p>
            <p className="past-price tnum">
              {owned ? dollars(art.purchase_price_cents) : dollars(r.price_cents)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
