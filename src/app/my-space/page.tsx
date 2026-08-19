/**
 * MY SPACE — PRD §18.
 *
 * "THE MOST IMPORTANT SCREEN IN THE PRODUCT. It must communicate *a home whose
 *  art changes*, not *an order history*." (§18)
 *
 * §18.1 — "v1.0 specified ONE 'currently displayed' artwork, which cannot
 * represent a Mystery subscription delivering up to four pieces simultaneously.
 * My Space renders N current pieces."
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  getViewer, activeRentals, inTransitRentals, pastRentals, subscriptionsActive,
} from '@/lib/session'
import { getArtwork, getArtist, ARTWORKS } from '@/lib/db/catalog'
import { daysRemaining, daysBetween } from '@/lib/db/state'
import { RentalCard } from '@/components/space/RentalCard'
import { PastArtList } from '@/components/space/PastArtList'
import { SubscriptionCard } from '@/components/mystery/SubscriptionCard'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { EmptyState, EMPTY } from '@/components/ui/EmptyState'
import { buildFeed } from '@/lib/recommend/feed'
import { URGENCY_DAYS } from '@/lib/pricing/config'
import { formatDate } from '@/lib/format'
import { CHANGE_FREQUENCY_LABEL } from '@/lib/taxonomy'

export const metadata: Metadata = { title: 'My Space' }

export default async function MySpacePage() {
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')
  const state = viewer.state!

  const active = activeRentals(state)
  const inTransit = inTransitRentals(state)
  const past = pastRentals(state)
  const subs = subscriptionsActive(state)

  const savedIds = new Set(state.favorites.map((f) => f.artwork_id))
  const savedWorks = state.favorites
    .map((f) => getArtwork(f.artwork_id))
    .filter(Boolean)
    .slice(0, 4)

  // §18.2 — "Next return" and the ≤14-day banner are DERIVED, never stored.
  const soonest = [...active].sort((a, b) => a.end_date.localeCompare(b.end_date))[0]
  const urgent = active.filter((r) => daysRemaining(r.end_date) <= URGENCY_DAYS && r.source !== 'mystery')
  const overdue = active.filter((r) => daysRemaining(r.end_date) <= 0)

  // §18.4 — nudge timing keyed off Q7's change_frequency.
  const freq = state.preferences?.change_frequency
  const showNudge = active.length > 0 && soonest ? shouldNudge(freq, soonest.start_date, soonest.end_date) : active.length === 0

  const recs = buildFeed({
    candidates: ARTWORKS,
    profile: viewer.profile,
    affinity: viewer.affinity,
    availabilityOf: viewer.availabilityOf,
    excludeIds: viewer.excludeIds,
    limit: 4,
  })

  return (
    <div className="page section-top space-page">
      <header className="section-head">
        <h1 className="page-title">Your space</h1>
        <p className="result-count tnum">
          {active.length === 0 ? 'Nothing at home' : `${active.length} ${active.length === 1 ? 'piece' : 'pieces'} at home`}
        </p>
      </header>

      {/* §18.2 — a dismissible banner when something is at or past its end date. */}
      {overdue.length > 0 ? (
        <div className="urgency-banner" role="status">
          <strong>
            {overdue.length === 1 ? 'One piece is ready to go back.' : `${overdue.length} pieces are ready to go back.`}
          </strong>{' '}
          Extend it, or send it home.
        </div>
      ) : urgent.length > 0 ? (
        <div className="urgency-banner urgency-banner-soft" role="status">
          <strong>Ending soon.</strong>{' '}
          {urgent.length === 1
            ? `“${getArtwork(urgent[0].artwork_id)?.title}” has ${daysRemaining(urgent[0].end_date)} days left.`
            : `${urgent.length} pieces have under ${URGENCY_DAYS} days left.`}
        </div>
      ) : null}

      {/* ── Current collection ─────────────────────────────────────────── */}
      <section className="section-first">
        <h2 className="sr-only">On your walls now</h2>
        {active.length === 0 && inTransit.length === 0 ? (
          <EmptyState {...EMPTY.current} />
        ) : (
          <div className="space-grid">
            {active.map((r) => {
              const art = getArtwork(r.artwork_id)
              if (!art) return null
              return (
                <RentalCard
                  key={r.id}
                  rental={r}
                  artwork={art}
                  artistName={getArtist(art.artist_id)?.name ?? ''}
                  artistSlug={getArtist(art.artist_id)?.slug ?? ''}
                />
              )
            })}
            {inTransit.map((r) => {
              const art = getArtwork(r.artwork_id)
              if (!art) return null
              return (
                <RentalCard
                  key={r.id}
                  rental={r}
                  artwork={art}
                  artistName={getArtist(art.artist_id)?.name ?? ''}
                  artistSlug={getArtist(art.artist_id)?.slug ?? ''}
                  inTransit
                />
              )
            })}
          </div>
        )}

        {soonest ? (
          <p className="next-return tnum">
            Next return: {getArtwork(soonest.artwork_id)?.title}, {formatDate(soonest.end_date)}
          </p>
        ) : null}
      </section>

      {/* ── Mystery subscriptions (§7.6 — one collection, two doors) ────── */}
      {subs.length > 0 ? (
        <section className="section">
          <h2 className="section-title">Mystery Art</h2>
          <div style={{ height: 20 }} />
          <div className="space-grid">
            {subs.map((sub) => <SubscriptionCard key={sub.id} subscription={sub} state={state} />)}
          </div>
        </section>
      ) : (
        <section className="section">
          <EmptyState {...EMPTY.mystery} compact />
        </section>
      )}

      {/* ── Past art (§18.3) ───────────────────────────────────────────── */}
      <section className="section">
        <h2 className="section-title">Past art</h2>
        <div style={{ height: 16 }} />
        {past.length > 0 ? <PastArtList rentals={past} purchases={state.purchases} /> : <EmptyState {...EMPTY.history} compact />}
      </section>

      {/* ── Saved (§18.3 — lives HERE, not under Profile) ───────────────── */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Saved</h2>
          {state.favorites.length > 0 ? (
            <Link href="/my-space/saved" className="btn btn-ghost btn-compact">
              View all {state.favorites.length} →
            </Link>
          ) : null}
        </div>
        {savedWorks.length > 0 ? (
          <ArtworkGrid
            items={savedWorks.map((w) => ({
              artwork: w!,
              artistName: getArtist(w!.artist_id)?.name ?? '',
              artistSlug: getArtist(w!.artist_id)?.slug ?? '',
              saved: savedIds.has(w!.id),
              availability: viewer.availabilityOf(w!.id),
            }))}
            eagerCount={0}
          />
        ) : (
          <EmptyState {...EMPTY.saved} compact />
        )}
      </section>

      {/* ── Ready for something new? (§18.4) ────────────────────────────── */}
      {showNudge && recs.items.length > 0 ? (
        <section className="section refresh-module">
          <h2 className="section-title">Ready for something new?</h2>
          <p className="lede">
            Based on your taste, we found {recs.total} pieces you might love.
            {freq ? ` You said you like to change things ${CHANGE_FREQUENCY_LABEL[freq].toLowerCase()}.` : ''}
          </p>
          <div className="refresh-actions">
            <Link href="/discover" className="btn btn-primary">Explore new art</Link>
            {active.length > 0 ? (
              <Link href={`/discover?swapFrom=${active[0].id}`} className="btn btn-secondary">
                Refresh my space
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/**
 * §18.4 — "Use change_frequency from Q7 to time the 'ready for something new?'
 * module: a `monthly` user sees it from day 20 of a 1-month rental; a
 * `when-i-find-something` user only sees it in the final 14 days."
 */
function shouldNudge(freq: string | undefined, start: string, end: string): boolean {
  const total = Math.max(1, daysBetween(start, end))
  const left = daysRemaining(end)
  const elapsedFraction = 1 - left / total
  switch (freq) {
    case 'monthly':   return elapsedFraction >= 0.65
    case 'quarterly': return elapsedFraction >= 0.75
    case 'biannual':  return elapsedFraction >= 0.85
    case 'annual':    return elapsedFraction >= 0.9
    default:          return left <= URGENCY_DAYS
  }
}
