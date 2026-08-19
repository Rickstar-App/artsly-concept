import type { Metadata } from 'next'
import Link from 'next/link'
import { ARTIST_PITCH, ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE } from '@/lib/pricing/config'
import { getArtworkBySlug } from '@/lib/db/catalog'
import { dollars } from '@/components/ui/Money'
import { artistRentalEarningsCents, artistSaleEarningsCents } from '@/lib/pricing/rental'

export const metadata: Metadata = { title: 'For artists' }

export default function ForArtistsPage() {
  // Worked from a real catalogue row so the page can never contradict a price
  // shown anywhere else (§7.2, §52.4).
  const bh = getArtworkBySlug('blue-horizon')!
  return (
    <div className="page section-top narrow-wide">
      <p className="eyebrow">For artists</p>
      <h1 className="page-title">
        {Math.round(ARTIST_RENTAL_SHARE * 100)}% of every rental.{' '}
        {Math.round(ARTIST_SALE_SHARE * 100)}% of every sale.
      </h1>
      <p className="lede">{ARTIST_PITCH}</p>

      <section className="section">
        <h2 className="section-title">What that looks like on one piece</h2>
        <div className="pricing-block">
          <div className="pricing-col">
            <h3 className="pricing-col-title">Rented</h3>
            <dl className="pricing-rows">
              <div><dt>Collector pays, 3 months</dt><dd className="tnum">{dollars(bh.rental_3m_cents)}</dd></div>
              <div><dt>You receive</dt><dd className="tnum">{dollars(artistRentalEarningsCents(bh.rental_3m_cents))}</dd></div>
              <div><dt>Every year it hangs</dt><dd className="tnum">{dollars(artistRentalEarningsCents(bh.rental_12m_cents))}</dd></div>
            </dl>
          </div>
          <div className="pricing-col">
            <h3 className="pricing-col-title">Sold</h3>
            <dl className="pricing-rows">
              <div><dt>Collector pays</dt><dd className="tnum">{dollars(bh.purchase_price_cents)}</dd></div>
              <div><dt>You receive</dt><dd className="tnum">{dollars(artistSaleEarningsCents(bh.purchase_price_cents))}</dd></div>
              <div><dt>A gallery would keep</dt><dd className="tnum">{dollars(bh.purchase_price_cents / 2)}</dd></div>
            </dl>
          </div>
          <div className="pricing-col pricing-col-notes">
            <p>Our 40% on rentals covers shipping in both directions, packaging, handling and the platform.</p>
            <p>Our 30% on sales covers the same, once.</p>
            <p className="pricing-example">
              Figures for “{bh.title}”, a real piece in the library.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How it works</h2>
        <ol className="how-grid">
          {[
            ['Upload', 'Dimensions and a purchase price. We derive the size class and all four rental rungs; you can override any of them.'],
            ['Get matched', 'Your work is scored against every collector’s taste profile — style, colour, mood, room, size, boldness, budget.'],
            ['Earn monthly', 'You’re paid every month a piece is on someone’s wall, not only when it sells.'],
            ['Take commissions', 'Turn commissions on and you become eligible for custom Mystery matching.'],
          ].map(([t, b], i) => (
            <li key={t} className="how-step">
              <span className="how-num tnum">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="how-title">{t}</h3>
              <p className="how-body">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section">
        <h2 className="section-title">Honest about what isn’t built</h2>
        <ul className="gap-list">
          <li>Payouts are not executed. The split is defined; disbursement is not.</li>
          <li>There is no moderation queue for uploads.</li>
          <li>Artist onboarding is not open — the ten artists here are seeded.</li>
        </ul>
      </section>

      <div className="extend-actions">
        <Link href="/artist-dashboard" className="btn btn-primary">See the artist dashboard</Link>
        <Link href="/artists" className="btn btn-secondary">Meet the artists</Link>
      </div>
    </div>
  )
}
