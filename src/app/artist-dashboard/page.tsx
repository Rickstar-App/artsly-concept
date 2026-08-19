/**
 * ARTIST DASHBOARD — PRD §30.
 *
 * "EVERY FIGURE DERIVES FROM §7.3 — v1.0 printed '$340/month' WITH NO RATE
 *  ANYWHERE IN THE DOCUMENT TO PRODUCE IT." (§30.1, and §0.1 defect #17)
 *
 * Nothing on this page is a literal. Every number is computed from real rentals,
 * real purchases, and the two share constants.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { BASELINE_PURCHASES, BASELINE_RENTALS, getArtist, getArtwork, worksOf } from '@/lib/db/catalog'
import { artistRentalEarningsCents, artistSaleEarningsCents, mysteryArtistShareCents } from '@/lib/pricing/rental'
import { ARTIST_PITCH, ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE } from '@/lib/pricing/config'
import { dollars } from '@/components/ui/Money'
import { formatDate } from '@/lib/format'
import { AvailabilityBadge, Badge } from '@/components/ui/Badge'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { AddArtworkPanel } from '@/components/artist/AddArtworkPanel'

export const metadata: Metadata = { title: 'Your work' }

export default async function ArtistDashboard() {
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')
  if (!viewer.isArtist || !viewer.state?.user.artist_id) {
    return (
      <div className="page section-top narrow">
        <h1 className="page-title">This is the artist side.</h1>
        <p className="lede">
          You’re signed in as a collector. Sign in as Maya from the footer to see the
          artist dashboard.
        </p>
        <Link href="/for-artists" className="btn btn-secondary">How the artist side works</Link>
      </div>
    )
  }

  const artist = getArtist(viewer.state.user.artist_id)!
  const works = worksOf(artist.id)
  const state = viewer.state

  // ---- Baseline platform activity: other collectors renting and buying. ----
  const baseRentals = BASELINE_RENTALS.filter((r) => r.artist_id === artist.id)
  const basePurchases = BASELINE_PURCHASES.filter((p) => p.artist_id === artist.id)

  // ---- Plus anything THIS session did to this artist's work. --------------
  const myRentals = state.rentals.filter((r) => {
    const a = getArtwork(r.artwork_id)
    return a?.artist_id === artist.id && (r.status === 'active' || r.status === 'ending')
  })
  const myPurchases = state.purchases.filter((p) => getArtwork(p.artwork_id)?.artist_id === artist.id)

  // ---- §7.3 — every figure below is derived, never printed. ---------------
  const libraryRentals = [
    ...baseRentals.map((r) => ({ artworkId: r.artwork_id, priceCents: r.price_cents, months: r.months, endDate: r.end_date, mystery: false })),
    ...myRentals.filter((r) => r.source !== 'mystery').map((r) => ({
      artworkId: r.artwork_id, priceCents: r.price_cents, months: r.rental_period_months, endDate: r.end_date, mystery: false,
    })),
  ]

  const monthlyRentalGrossCents = libraryRentals.reduce((n, r) => n + Math.round(r.priceCents / r.months), 0)
  const monthlyRentalEarningsCents = artistRentalEarningsCents(monthlyRentalGrossCents)

  const salesGrossCents = [
    ...basePurchases.map((p) => p.price_cents),
    ...myPurchases.map((p) => p.price_cents),
  ].reduce((a, b) => a + b, 0)
  const salesEarningsCents = artistSaleEarningsCents(salesGrossCents)
  const saleCount = basePurchases.length + myPurchases.length

  // §25.6 — Mystery placements read from the SUBSCRIPTION, never from rental
  // price_cents (which is 0 for mystery-sourced rentals, §26.3).
  const mysteryPlacements = state.rentals
    .filter((r) => r.source === 'mystery' && r.status === 'active' && getArtwork(r.artwork_id)?.artist_id === artist.id)
    .map((r) => {
      const sub = state.subscriptions.find((s) => s.id === r.mystery_subscription_id)
      if (!sub) return null
      const share = mysteryArtistShareCents(sub.monthly_price_cents, Math.max(1, sub.number_of_pieces))
      return { rental: r, sub, perMonthCents: share.perArtistCents }
    })
    .filter(Boolean) as Array<{ rental: (typeof state.rentals)[number]; sub: (typeof state.subscriptions)[number]; perMonthCents: number }>

  const mysteryMonthlyCents = mysteryPlacements.reduce((n, m) => n + m.perMonthCents, 0)

  const onLoan = works.filter((w) => {
    const overlay = viewer.availabilityOf(w.id)
    return overlay === 'rented' || w.availability === 'rented'
  }).length
  const sold = works.filter((w) => viewer.availabilityOf(w.id) === 'sold' || w.availability === 'sold').length

  return (
    <div className="page section-top">
      <div className="section-head">
        <div>
          <p className="eyebrow">Artist dashboard</p>
          <h1 className="page-title">Your work, {artist.name.split(' ')[0]}</h1>
        </div>
        <Link href="#add-artwork" className="btn btn-primary btn-compact">Add artwork</Link>
      </div>

      {/* ---- Counts ------------------------------------------------------ */}
      <div className="profile-stats dash-counts">
        <Stat value={String(works.length)} label="active pieces" />
        <Stat value={String(onLoan)} label="out on loan" />
        <Stat value={String(sold)} label="sold" />
      </div>

      {/* ---- Earnings, all derived from §7.3 ----------------------------- */}
      <div className="dash-earnings">
        <EarningsBlock
          eyebrow="Monthly rental earnings"
          value={dollars(monthlyRentalEarningsCents)}
          sub={`your ${Math.round(ARTIST_RENTAL_SHARE * 100)}% of ${dollars(monthlyRentalGrossCents)} in active rentals`}
        />
        <EarningsBlock
          eyebrow="Sales"
          value={dollars(salesEarningsCents)}
          sub={`your ${Math.round(ARTIST_SALE_SHARE * 100)}% of ${dollars(salesGrossCents)} across ${saleCount} ${saleCount === 1 ? 'piece' : 'pieces'}`}
        />
        <EarningsBlock
          eyebrow="Mystery placements"
          value={mysteryPlacements.length > 0 ? `${dollars(mysteryMonthlyCents)}/mo` : '—'}
          sub={
            mysteryPlacements.length > 0
              ? `${mysteryPlacements.length} ${mysteryPlacements.length === 1 ? 'piece' : 'pieces'} in a subscription`
              : 'no pieces placed yet'
          }
        />
      </div>

      <p className="dash-pitch">
        Your split: {Math.round(ARTIST_RENTAL_SHARE * 100)}% of every rental,{' '}
        {Math.round(ARTIST_SALE_SHARE * 100)}% of every sale. {ARTIST_PITCH}
      </p>

      {/* ---- Rental activity -------------------------------------------- */}
      <section className="section">
        <h2 className="section-title">Rental activity</h2>
        <div style={{ height: 16 }} />
        {libraryRentals.length === 0 && mysteryPlacements.length === 0 ? (
          <p className="hint">Nothing out on loan right now.</p>
        ) : (
          <div className="scroll-x">
            <table className="activity-table">
              <thead>
                <tr>
                  <th scope="col">Piece</th>
                  <th scope="col">Kind</th>
                  <th scope="col" className="num">To you</th>
                  <th scope="col">Ends</th>
                </tr>
              </thead>
              <tbody>
                {libraryRentals.map((r, i) => {
                  const art = getArtwork(r.artworkId)
                  return (
                    <tr key={`${r.artworkId}-${i}`}>
                      <th scope="row">
                        {art ? <Link href={`/artwork/${art.slug}`}>{art.title}</Link> : r.artworkId}
                      </th>
                      <td>{r.months}-month rental</td>
                      <td className="num tnum">{dollars(artistRentalEarningsCents(r.priceCents))}</td>
                      <td className="tnum">{formatDate(r.endDate)}</td>
                    </tr>
                  )
                })}
                {mysteryPlacements.map((m) => {
                  const art = getArtwork(m.rental.artwork_id)
                  return (
                    <tr key={m.rental.id}>
                      <th scope="row">
                        {art ? <Link href={`/artwork/${art.slug}`}>{art.title}</Link> : m.rental.artwork_id}
                      </th>
                      <td>Mystery, cycle {m.sub.cycle}</td>
                      <td className="num tnum">{dollars(m.perMonthCents)}/mo</td>
                      <td className="tnum">rotates {formatDate(m.sub.next_rotation_at)}</td>
                    </tr>
                  )
                })}
                {basePurchases.concat(myPurchases.map((p) => ({
                  id: p.id, artwork_id: p.artwork_id, artist_id: artist.id, collector: 'You',
                  price_cents: p.price_cents, artist_share_rate: p.artist_share_rate, created_at: p.created_at,
                }))).map((p) => {
                  const art = getArtwork(p.artwork_id)
                  return (
                    <tr key={p.id}>
                      <th scope="row">{art ? <Link href={`/artwork/${art.slug}`}>{art.title}</Link> : p.artwork_id}</th>
                      <td>Sold</td>
                      <td className="num tnum">{dollars(artistSaleEarningsCents(p.price_cents))}</td>
                      <td className="tnum">{formatDate(p.created_at.slice(0, 10))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- The work ----------------------------------------------------- */}
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Your pieces</h2>
          <p className="result-count tnum">{works.length}</p>
        </div>
        <ul className="dash-work-list">
          {works.map((w) => {
            const availability = viewer.availabilityOf(w.id)
            return (
              <li key={w.id} className="dash-work-row">
                <Link href={`/artwork/${w.slug}`} className="dash-work-title">{w.title}</Link>
                <span className="dash-work-meta tnum">
                  {w.width_in} × {w.height_in} in · {w.size_category}
                </span>
                <span className="dash-work-price tnum">
                  {dollars(w.rental_3m_cents)} / 3mo · {dollars(w.purchase_price_cents)} to own
                </span>
                <span className="dash-work-badge">
                  {availability === 'available' ? <Badge tone="success">Available</Badge> : <AvailabilityBadge availability={availability} />}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* §30.2 — add artwork, with the ladder auto-filling from purchase price. */}
      <AddArtworkPanel />

      {/* §30.3 — the known gap, stated rather than hidden. */}
      <p className="dash-gap">
        Known gap: there is no moderation queue in this build. Uploads would publish
        immediately.
      </p>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <p className="stat-value tnum">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  )
}

function EarningsBlock({ eyebrow, value, sub }: { eyebrow: string; value: string; sub: string }) {
  return (
    <div className="earnings-block">
      <p className="eyebrow">{eyebrow}</p>
      <p className="earnings-value tnum">{value}</p>
      <p className="earnings-sub">{sub}</p>
    </div>
  )
}

void ArtworkGrid
