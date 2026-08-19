import type { Artwork } from '@/lib/db/types'
import { ArtworkCard } from './ArtworkCard'
import type { Reason } from '@/lib/recommend/explain'
import type { ArtworkAvailability } from '@/lib/taxonomy'

export interface GridItem {
  artwork: Artwork
  artistName: string
  artistSlug: string
  reason?: Reason | null
  saved?: boolean
  availability?: ArtworkAvailability
}

/**
 * §36 — 4 columns ≥1280px, 2–3 at 768–1279, 2 below 768.
 * §35.4 — consistent WIDTH, variable height. We picked width; we hold it.
 * §44 — only the first row is eager-loaded.
 */
export function ArtworkGrid({ items, eagerCount = 4, swapFrom }: { items: GridItem[]; eagerCount?: number; swapFrom?: string }) {
  return (
    <div className="artwork-grid">
      {items.map((item, i) => (
        <ArtworkCard
          key={item.artwork.id}
          {...item}
          priority={i < eagerCount}
          swapFrom={swapFrom}
        />
      ))}
    </div>
  )
}
