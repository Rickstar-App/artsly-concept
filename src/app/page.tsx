/**
 * HOMEPAGE — PRD §34.
 *
 * §34.2 sections, in order:
 *   1 Hero · 2 How it works · 3 Featured artwork · 4 Featured artists
 *   5 Mystery Art · 6 How pricing works · 7 For artists · 8 Closing CTA
 *
 * §50.1 — "A stranger sits down with no explanation and can understand what the
 * company does WITHIN 10 SECONDS."
 */

import Link from 'next/link'
import { getViewer } from '@/lib/session'
import { ARTISTS, ARTWORKS, getArtist, worksOf, withArtist } from '@/lib/db/catalog'
import { buildFeed } from '@/lib/recommend/feed'
import { reasonChip } from '@/lib/recommend/explain'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { ArtistCard } from '@/components/artist/ArtistCard'
import { dollars } from '@/components/ui/Money'
import { startingPriceCents } from '@/lib/pricing/mystery'
import { ARTIST_PITCH, ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE, NO_CREDIT_COPY, SHIPPING_COPY } from '@/lib/pricing/config'
import { getArtworkBySlug } from '@/lib/db/catalog'

export default async function HomePage() {
  const viewer = await getViewer()

  // §34.2 item 3 — "For a returning user with preferences, this becomes 'Picked
  // for you' and uses the §12 feed." Otherwise: 8 featured pieces.
  const feed = buildFeed({
    candidates: ARTWORKS,
    profile: viewer.profile,
    affinity: viewer.affinity,
    availabilityOf: viewer.availabilityOf,
    excludeIds: viewer.excludeIds,
    limit: 8,
  })

  const savedIds = new Set(viewer.state?.favorites.map((f) => f.artwork_id) ?? [])
  const items = feed.items.map((i) => {
    const a = withArtist(i.artwork)
    return {
      artwork: i.artwork,
      artistName: a.artist.name,
      artistSlug: a.artist.slug,
      reason: reasonChip(i.result, viewer.profile),
      saved: savedIds.has(i.artwork.id),
      availability: viewer.availabilityOf(i.artwork.id),
    }
  })

  const featuredArtists = ARTISTS.slice(0, 4)

  // §34.2 item 6 — the pricing block uses REAL stored columns from the running
  // example, never a hardcoded string (§7.2).
  const bh = getArtworkBySlug('blue-horizon')!

  return (
    <>
      {/* ── 1. Hero ─────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="page">
          <h1 className="hero-title">Your walls don’t have to stay the same.</h1>
          <p className="hero-sub">
            Discover, rent, and rotate art from emerging artists — personalised to your
            taste and your space.
          </p>
          <div className="hero-actions">
            {/* §34.1 — "Discover My Art" EVERYWHERE. v1.0 alternated. */}
            <Link href="/onboarding" className="btn btn-primary">Discover My Art</Link>
            <Link href="/mystery" className="btn btn-secondary">Try Mystery Art</Link>
          </div>
          <p className="hero-note">
            {SHIPPING_COPY} 90-second quiz. Nothing to install.
          </p>
        </div>
      </section>

      {/* ── 2. How it works (§34.3) ─────────────────────────────────────── */}
      <section className="page section">
        <p className="eyebrow">How it works</p>
        <ol className="how-grid">
          {[
            ['01', 'Tell us your taste', 'A 90-second quiz about your space, your colours, and how bold you want to go.'],
            ['02', 'Discover your art', 'Browse recommendations built for your walls, or let us surprise you.'],
            ['03', 'Live with it', 'Rent for one month or twelve. Shipping is included both ways.'],
            ['04', 'Refresh or keep it', 'Swap it for something new, extend it, or buy it permanently.'],
          ].map(([n, title, body]) => (
            <li key={n} className="how-step">
              <span className="how-num tnum">{n}</span>
              <h3 className="how-title">{title}</h3>
              <p className="how-body">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 3. Featured artwork / Picked for you ────────────────────────── */}
      <section className="page section">
        <div className="section-head">
          <h2 className="section-title">
            {feed.coldStart ? 'Featured this week' : 'Picked for you'}
          </h2>
          <Link href="/discover" className="btn btn-ghost btn-compact">See all 65 pieces →</Link>
        </div>
        {/* §12.11 — never claim personalisation we don't have. */}
        {feed.coldStart ? (
          <p className="section-note">
            Take the 90-second quiz and we’ll make this yours.{' '}
            <Link href="/onboarding" className="inline-link">Discover My Art</Link>
          </p>
        ) : null}
        <ArtworkGrid items={items} eagerCount={4} />
      </section>

      {/* ── 4. Featured artists (§6.5) ──────────────────────────────────── */}
      <section className="page section">
        <div className="section-head">
          <h2 className="section-title">Artists on Curio</h2>
          <Link href="/artists" className="btn btn-ghost btn-compact">All 10 artists →</Link>
        </div>
        <div className="artist-grid">
          {featuredArtists.map((a) => (
            <ArtistCard key={a.id} artist={a} works={worksOf(a.id).slice(0, 3)} />
          ))}
        </div>
      </section>

      {/* ── 5. Mystery Art ──────────────────────────────────────────────── */}
      <section className="section mystery-strip">
        <div className="page mystery-strip-inner">
          <div>
            <p className="eyebrow">Mystery Art</p>
            <h2 className="section-title">Tell us what you love. We’ll choose the art.</h2>
            <p className="lede">
              A personalised surprise for your walls — curated from our library or created
              for you by an emerging artist. New pieces every three months, automatically.
            </p>
            <Link href="/mystery" className="btn btn-primary">Try Mystery Art</Link>
          </div>
          <ul className="mystery-types">
            {([
              ['curated', 'Curated', 'Chosen from our library.'],
              ['surprise', 'Surprise me', 'We decide which side of the line it lands on.'],
              ['custom', 'Custom', 'Newly commissioned for your brief.'],
            ] as const).map(([type, label, body]) => (
              <li key={type} className="mystery-type">
                <p className="mystery-type-label">{label}</p>
                <p className="mystery-type-body">{body}</p>
                <p className="mystery-type-price tnum">
                  from {dollars(startingPriceCents(type))}<span aria-hidden="true">/mo</span>
                  <span className="sr-only"> per month</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 6. How pricing works (§34.2 item 6, §6.7) ───────────────────── */}
      <section className="page section">
        <p className="eyebrow">How pricing works</p>
        <div className="pricing-block">
          <div className="pricing-col">
            <h3 className="pricing-col-title">Rent it</h3>
            <dl className="pricing-rows">
              <div><dt>1 month</dt><dd className="tnum">{dollars(bh.rental_1m_cents)}</dd></div>
              <div><dt>3 months</dt><dd className="tnum">{dollars(bh.rental_3m_cents)}</dd></div>
              <div><dt>12 months</dt><dd className="tnum">{dollars(bh.rental_12m_cents)}</dd></div>
            </dl>
            <p className="pricing-note">Charged once, up front, for the whole term.</p>
          </div>
          <div className="pricing-col">
            <h3 className="pricing-col-title">Own it</h3>
            <p className="pricing-own tnum">{dollars(bh.purchase_price_cents)}</p>
            <p className="pricing-note">Yours permanently.</p>
          </div>
          <div className="pricing-col pricing-col-notes">
            <p>{SHIPPING_COPY}</p>
            {/* §7.4 — required, and it prevents the demo being contradicted. */}
            <p>{NO_CREDIT_COPY}</p>
            <p className="pricing-example">
              Prices shown for <Link href="/artwork/blue-horizon" className="inline-link">“{bh.title}”</Link>,
              a {bh.width_in} × {bh.height_in} in piece by Maya Chen.
            </p>
          </div>
        </div>
      </section>

      {/* ── 7. For artists (§7.3, §49 step 11) ──────────────────────────── */}
      <section className="section artists-strip">
        <div className="page artists-strip-inner">
          <div>
            <p className="eyebrow">For artists</p>
            <h2 className="section-title">
              {Math.round(ARTIST_RENTAL_SHARE * 100)}% of every rental.{' '}
              {Math.round(ARTIST_SALE_SHARE * 100)}% of every sale.
            </h2>
            <p className="lede">{ARTIST_PITCH}</p>
            <Link href="/for-artists" className="btn btn-secondary">See how it works</Link>
          </div>
        </div>
      </section>

      {/* ── 8. Closing CTA ──────────────────────────────────────────────── */}
      <section className="page section closing">
        <h2 className="closing-title">Find the piece that makes the room yours.</h2>
        <Link href="/onboarding" className="btn btn-primary">Discover My Art</Link>
      </section>
    </>
  )
}

export const revalidate = 300
void getArtist
