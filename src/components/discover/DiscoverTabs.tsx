'use client'

/**
 * §33.2 — Artists as a segmented tab inside Discover.
 *
 * "Five slots; Artists doesn't fit. Rather than dropping artist discovery on
 *  mobile — WHICH WOULD GUT PRINCIPLE §6.5 — Artists becomes a segmented tab
 *  inside Discover (/discover?tab=artists)."
 *
 * Rendered on every breakpoint, not just mobile, so the two navigations agree.
 */
import Link from 'next/link'

export function DiscoverTabs({ tab }: { tab: 'art' | 'artists' }) {
  return (
    <div className="segmented" role="tablist" aria-label="Browse by">
      <Link href="/discover" role="tab" aria-selected={tab === 'art'} className={`segmented-item${tab === 'art' ? ' is-active' : ''}`}>
        Artwork
      </Link>
      <Link href="/discover?tab=artists" role="tab" aria-selected={tab === 'artists'} className={`segmented-item${tab === 'artists' ? ' is-active' : ''}`}>
        Artists
      </Link>
    </div>
  )
}
