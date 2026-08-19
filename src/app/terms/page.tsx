import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE, AUTO_RETURN_AFTER_DAYS, CANCEL_WINDOW_HOURS,
  MAX_CUMULATIVE_RENTAL_MONTHS, MYSTERY_MINIMUM_TERM_MONTHS, MYSTERY_ROTATION_MONTHS,
  NO_CREDIT_COPY, SHIPPING_COPY, URGENCY_DAYS,
} from '@/lib/pricing/config'

export const metadata: Metadata = { title: 'How renting works' }

export default function TermsPage() {
  return (
    <div className="page section-top narrow-wide">
      <h1 className="page-title">How renting works</h1>
      <p className="lede">
        Every rule that affects what you pay, in the order you’ll meet them.
      </p>

      <div className="prose-block">
        <h2>Paying</h2>
        <ul className="gap-list">
          <li>A library rental is <strong>prepaid in full for the term</strong>. “3 months — $200” is one charge of $200 today.</li>
          <li>Any “/mo” figure is a derived monthly equivalent, shown so you can compare terms. It is never what gets charged.</li>
          <li>{SHIPPING_COPY} There is never a shipping line item.</li>
          <li>{NO_CREDIT_COPY} Rent and purchase are separate transactions.</li>
        </ul>

        <h2>Changing your mind</h2>
        <ul className="gap-list">
          <li>You can cancel within {CANCEL_WINDOW_HOURS} hours of checkout, while the piece hasn’t shipped.</li>
          <li>After that, you return it. We’ll remind you {URGENCY_DAYS} days before the term ends.</li>
          <li><strong>Swapping mid-term forfeits the remaining time.</strong> No proration, no refund — and we say so on the confirmation screen, with the option to extend instead.</li>
          <li>Once a piece is marked as going back, it’s treated as returned after {AUTO_RETURN_AFTER_DAYS} days.</li>
        </ul>

        <h2>Extending</h2>
        <ul className="gap-list">
          <li>Extension is priced at the standalone rate for the added term — no discount stacking, no credit for time already served.</li>
          <li>The new end date is added to your <em>old</em> end date, not to today. Extending early costs you nothing.</li>
          <li>Maximum cumulative term is {MAX_CUMULATIVE_RENTAL_MONTHS} months.</li>
        </ul>

        <h2>Buying</h2>
        <ul className="gap-list">
          <li>You can buy any available piece, or any piece you’re currently renting.</li>
          <li>While a piece is out on loan, only the person living with it can buy it. Everyone else joins a waitlist.</li>
          <li>Buying ends your rental. Nothing goes back.</li>
        </ul>

        <h2>Mystery Art</h2>
        <ul className="gap-list">
          <li>Billed monthly, unlike library rentals.</li>
          <li>{MYSTERY_MINIMUM_TERM_MONTHS}-month minimum, then cancel anytime, effective at the end of the period.</li>
          <li>Pieces rotate every {MYSTERY_ROTATION_MONTHS} months. You can rotate early.</li>
          <li>You can change the brief anytime; it takes effect at the next rotation, and we re-quote first.</li>
          <li>The surprise is which artwork arrives — never what you asked for.</li>
        </ul>

        <h2>Artists</h2>
        <ul className="gap-list">
          <li>Artists keep {Math.round(ARTIST_RENTAL_SHARE * 100)}% of rental revenue and {Math.round(ARTIST_SALE_SHARE * 100)}% of a sale.</li>
          <li>The rate is recorded on each transaction, so historical earnings never shift.</li>
        </ul>

        <h2>This build</h2>
        <p>
          Nothing here is charged, shipped, or delivered — it is a demonstration.
          See <Link href="/attribution" className="inline-link">attribution</Link> for how
          the artwork and artists were produced.
        </p>
      </div>
    </div>
  )
}
