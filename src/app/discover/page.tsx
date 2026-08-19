/**
 * DISCOVER — PRD §14, §29.
 *
 * §14.1 page structure, in order:
 *   1 "Made for you" — top 12, each card carrying a reason chip
 *   2 Search + filter bar — sticky on scroll
 *   3 "Because you like {top style}" — themed rail
 *   4 "Fits your {room}" — themed rail
 *   5 "Explore all" — the full paginated grid
 *
 * "Rails 3 and 4 are SKIPPED ENTIRELY for cold-start users; do not render empty
 *  sections." (§14.1)
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { ARTISTS, ARTWORKS, getArtist, searchBlob, worksOf } from '@/lib/db/catalog'
import { getViewer } from '@/lib/session'
import { buildFeed, relaxationOptions, type FeedFilters } from '@/lib/recommend/feed'
import { reasonChip, SECTION_LABELS } from '@/lib/recommend/explain'
import { ArtworkGrid, type GridItem } from '@/components/artwork/ArtworkGrid'
import { ArtistCard } from '@/components/artist/ArtistCard'
import { FilterBar } from '@/components/discover/FilterBar'
import { NoResults } from '@/components/discover/NoResults'
import { BudgetNotice } from '@/components/discover/BudgetNotice'
import { DiscoverTabs } from '@/components/discover/DiscoverTabs'
import {
  COLORS, ROOMS, SIZES, STYLES, STYLE_LABEL, USER_ROOM_LABEL, BUDGET_BANDS,
  type Color, type Room, type Size, type Style, type UserRoom,
} from '@/lib/taxonomy'
import type { Artwork } from '@/lib/db/types'

export const metadata: Metadata = { title: 'Discover' }

type SP = Record<string, string | string[] | undefined>

const list = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).filter(Boolean)

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const viewer = await getViewer()
  const tab = sp.tab === 'artists' ? 'artists' : 'art'

  // §29.2 — "Filter state lives in the URL query string so views are shareable
  // and the back button behaves."
  const filters: FeedFilters = {
    styles: list(sp.styles).filter((s): s is Style => (STYLES as readonly string[]).includes(s)),
    colors: list(sp.colors).filter((c): c is Color => (COLORS as readonly string[]).includes(c)),
    rooms: list(sp.rooms).filter((r): r is Room => (ROOMS as readonly string[]).includes(r)),
    sizes: list(sp.sizes).filter((s): s is Size => (SIZES as readonly string[]).includes(s)),
    budgets: list(sp.budgets).filter((b) => (BUDGET_BANDS as readonly string[]).includes(b)),
    mediums: list(sp.mediums),
    artists: list(sp.artists),
    query: typeof sp.query === 'string' ? sp.query : undefined,
    showOverBudget: sp.overBudget === '1',
    showOtherSizes: sp.allSizes === '1',
  }
  const hasFilters =
    !!filters.query ||
    (['styles', 'colors', 'rooms', 'sizes', 'budgets', 'mediums', 'artists'] as const)
      .some((k) => (filters[k] as string[]).length > 0)

  const savedIds = new Set(viewer.state?.favorites.map((f) => f.artwork_id) ?? [])
  const toItem = (artwork: Artwork, reason?: GridItem['reason']): GridItem => {
    const artist = getArtist(artwork.artist_id)!
    return {
      artwork,
      artistName: artist.name,
      artistSlug: artist.slug,
      reason,
      saved: savedIds.has(artwork.id),
      availability: viewer.availabilityOf(artwork.id),
    }
  }

  const base = {
    candidates: ARTWORKS,
    profile: viewer.profile,
    affinity: viewer.affinity,
    availabilityOf: viewer.availabilityOf,
    excludeIds: viewer.excludeIds,
    searchBlob,
  }

  const primary = buildFeed({ ...base, filters, limit: 12 })
  const all = buildFeed({ ...base, filters, limit: 24, maxPerArtist: 4 })

  const swapFrom = typeof sp.swapFrom === 'string' ? sp.swapFrom : undefined

  // §14.1 rails 3 & 4 — skipped entirely for cold start.
  const topStyle = viewer.profile?.styles?.[0] as Style | undefined
  const room = viewer.state?.preferences?.room as UserRoom | undefined
  const styleRail = !primary.coldStart && topStyle && !hasFilters
    ? buildFeed({ ...base, filters: { styles: [topStyle] }, limit: 4 })
    : null
  const roomRail = !primary.coldStart && room && room !== 'any' && !hasFilters
    ? buildFeed({ ...base, filters: { rooms: [room as Room] }, limit: 4 })
    : null

  if (tab === 'artists') {
    return (
      <div className="page section-top">
        <h1 className="page-title">Artists</h1>
        <DiscoverTabs tab={tab} />
        <h2 className="sr-only">All artists</h2>
        <div className="artist-grid">
          {ARTISTS.map((a) => <ArtistCard key={a.id} artist={a} works={worksOf(a.id).slice(0, 3)} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="page section-top">
      <h1 className="page-title">Discover</h1>
      <DiscoverTabs tab={tab} />

      {swapFrom ? (
        <div className="swap-banner" role="status">
          <span>Choosing a replacement. Pick a piece and we’ll show you exactly what the swap costs.</span>
          <Link href="/my-space" className="btn btn-ghost btn-compact">Cancel</Link>
        </div>
      ) : null}

      {/* §14.1 item 2 — search + filters, sticky on scroll. */}
      <FilterBar
        total={all.total}
        artists={ARTISTS.map((a) => ({ id: a.id, name: a.name }))}
        mediums={[...new Set(ARTWORKS.map((a) => a.medium))].sort()}
      />

      {/* §12.9 — surface the exclusion honestly rather than silently. */}
      <BudgetNotice hiddenByBudget={primary.hiddenByBudget} hiddenBySize={primary.hiddenBySize} />

      {primary.items.length === 0 ? (
        <NoResults options={relaxationOptions({ ...base, filters }, labelForFacet)} />
      ) : (
        <>
          <section className="section-first">
            <div className="section-head">
              <h2 className="section-title">
                {primary.coldStart ? SECTION_LABELS.coldStart : SECTION_LABELS.personalized}
              </h2>
              {/* The filter bar already reports the total. Repeating it beside a
                  section that shows 12 reads as a claim that this section holds
                  all of them. Say what this section actually is. */}
              <p className="result-count tnum">
                Top {primary.items.length} of {all.total}
              </p>
            </div>
            {primary.coldStart ? (
              <p className="section-note">
                Take the 90-second quiz and we’ll make this yours.{' '}
                <Link href="/onboarding" className="inline-link">Discover My Art</Link>
              </p>
            ) : null}
            <ArtworkGrid
              items={primary.items.map((i) => toItem(i.artwork, reasonChip(i.result, viewer.profile)))}
              swapFrom={swapFrom}
            />
          </section>

          {styleRail && styleRail.items.length >= 2 ? (
            <section className="section">
              <h2 className="section-title">{SECTION_LABELS.becauseStyle(STYLE_LABEL[topStyle!])}</h2>
              <div style={{ height: 20 }} />
              <ArtworkGrid items={styleRail.items.map((i) => toItem(i.artwork))} eagerCount={0} swapFrom={swapFrom} />
            </section>
          ) : null}

          {roomRail && roomRail.items.length >= 2 ? (
            <section className="section">
              <h2 className="section-title">{SECTION_LABELS.room(USER_ROOM_LABEL[room!])}</h2>
              <div style={{ height: 20 }} />
              <ArtworkGrid items={roomRail.items.map((i) => toItem(i.artwork))} eagerCount={0} swapFrom={swapFrom} />
            </section>
          ) : null}

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">{SECTION_LABELS.exploreAll}</h2>
              <p className="result-count tnum">
                Showing {all.items.length} of {all.total}
              </p>
            </div>
            <ArtworkGrid items={all.items.map((i) => toItem(i.artwork))} eagerCount={0} swapFrom={swapFrom} />
          </section>
        </>
      )}
    </div>
  )
}

/** §41.1 — name the facet and its result count, never a generic message. */
function labelForFacet(facet: keyof FeedFilters, values: string[]): string {
  const first = values[0]
  switch (facet) {
    case 'sizes':   return `Remove “${cap(first)}”`
    case 'styles':  return `Remove “${STYLE_LABEL[first as Style] ?? first}”`
    case 'colors':  return `Remove “${cap(first)}”`
    case 'rooms':   return `Remove “${USER_ROOM_LABEL[first as UserRoom] ?? first}”`
    case 'budgets': return `Remove the price filter`
    case 'mediums': return `Remove “${first}”`
    case 'artists': return `Remove the artist filter`
    default:        return 'Clear this filter'
  }
}
const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
