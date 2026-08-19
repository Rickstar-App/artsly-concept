/**
 * MYSTERY LANDING — PRD §24.1.
 *
 * "TREAT IT AS A PRODUCT, NOT A FORM." (§24)
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { dollars } from '@/components/ui/Money'
import { startingPriceCents } from '@/lib/pricing/mystery'
import { MYSTERY_ROTATION_MONTHS, MYSTERY_MINIMUM_TERM_MONTHS, MYSTERY_RATE_CENTS } from '@/lib/pricing/config'
import { PIECE_TYPES, PIECE_TYPE_DESC, PIECE_TYPE_LABEL, SIZES, SIZE_LABEL } from '@/lib/taxonomy'

export const metadata: Metadata = {
  title: 'Mystery Art',
  description: 'Tell us what you love. We’ll choose the art.',
}

export default function MysteryLanding() {
  return (
    <div className="page section-top mystery-page">
      <header className="mystery-hero">
        <h1 className="mystery-hero-title">Mystery Art</h1>
        <p className="mystery-hero-sub">Tell us what you love. We’ll choose the art.</p>
        <p className="lede">
          A personalised surprise for your walls — curated from our library or created for
          you by an emerging artist.
        </p>
        <Link href="/mystery/new" className="btn btn-primary">Build my brief</Link>
      </header>

      {/* §24.1 — how it works in three beats. */}
      <section className="section">
        <ol className="how-grid mystery-beats">
          {[
            ['Tell us', 'Nine quick questions: style, colour, size, how many, how bold, and your budget.'],
            ['We match', 'We score every available piece against your brief and pick the best fits — one per artist.'],
            ['It arrives', `New pieces every ${MYSTERY_ROTATION_MONTHS} months, automatically. Shipping included, both ways.`],
          ].map(([t, b], i) => (
            <li key={t} className="how-step">
              <span className="how-num tnum">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="how-title">{t}</h3>
              <p className="how-body">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* §24.2 — THE ONE RULE, stated to the user, not just to the engineer. */}
      <section className="section mystery-rule">
        <p className="eyebrow">The one rule</p>
        <p className="mystery-rule-copy">
          The surprise is the <em>artwork</em> — never your preferences. If you ask for
          calm, blue and large, that is exactly what arrives. You just won’t know which
          pieces until they do.
        </p>
      </section>

      {/* §24.1 — the three piece types side by side with their price ranges. */}
      <section className="section">
        <h2 className="section-title">Three ways to be surprised</h2>
        <div style={{ height: 20 }} />
        <div className="piece-type-grid">
          {PIECE_TYPES.map((t) => (
            <article key={t} className="piece-type-card">
              <h3 className="piece-type-title">{PIECE_TYPE_LABEL[t]}</h3>
              <p className="piece-type-desc">{PIECE_TYPE_DESC[t]}</p>
              <p className="piece-type-from tnum">
                from {dollars(startingPriceCents(t))}<span aria-hidden="true">/mo</span>
                <span className="sr-only"> per month</span>
              </p>
              <table className="rate-table">
                <caption className="sr-only">{PIECE_TYPE_LABEL[t]} rate per piece, per month</caption>
                <tbody>
                  {SIZES.map((s) => (
                    <tr key={s}>
                      <th scope="row">{SIZE_LABEL[s]}</th>
                      <td className="tnum">{dollars(MYSTERY_RATE_CENTS[t][s])}<span aria-hidden="true">/mo</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
        <p className="rate-note">
          Per piece, per month. Bundles are cheaper: 10% off two pieces, 15% off three,
          20% off four. {MYSTERY_MINIMUM_TERM_MONTHS}-month minimum, then cancel anytime.
        </p>
      </section>

      <section className="section closing">
        <h2 className="closing-title">Don’t feel like browsing?</h2>
        <Link href="/mystery/new" className="btn btn-primary">Build my brief</Link>
      </section>
    </div>
  )
}
