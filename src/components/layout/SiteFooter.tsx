/**
 * SITE FOOTER — PRD §37.4 and §38.3.
 *
 * §37.4 is NON-NEGOTIABLE: "Site footer, ALWAYS VISIBLE — 'Demo build. Artists
 * shown are fictional; artwork imagery is generated or licensed for this
 * prototype.'"
 *
 * "This costs one line of markup and removes the only genuinely embarrassing
 *  question the demo could face."
 *
 * §38.3 puts the two demo sign-in buttons here.
 */
import Link from 'next/link'
import type { ViewerSummary } from '@/lib/session'
import { DemoSignIn } from './DemoSignIn'
import { ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE } from '@/lib/pricing/config'

export function SiteFooter({ viewer }: { viewer: ViewerSummary }) {
  return (
    <footer className="site-footer">
      <div className="page">
        <div className="footer-grid">
          <div>
            <p className="wordmark footer-wordmark">Curio</p>
            <p className="footer-tagline">
              Discover, rent, and rotate original art from emerging artists.
              Shipping included, both ways.
            </p>
          </div>

          <nav aria-label="Browse">
            <p className="eyebrow">Browse</p>
            <Link href="/discover">Discover</Link>
            <Link href="/mystery">Mystery Art</Link>
            <Link href="/artists">Artists</Link>
          </nav>

          <nav aria-label="Your account">
            <p className="eyebrow">You</p>
            <Link href="/my-space">My Space</Link>
            <Link href="/my-space/saved">Saved</Link>
            <Link href="/profile/taste">Taste profile</Link>
          </nav>

          <div>
            <p className="eyebrow">For artists</p>
            <p className="footer-share tnum">
              {Math.round(ARTIST_RENTAL_SHARE * 100)}% of every rental
              <br />
              {Math.round(ARTIST_SALE_SHARE * 100)}% of every sale
            </p>
            <Link href="/for-artists">How it works</Link>
          </div>
        </div>

        <DemoSignIn viewer={viewer} />

        {/* §37.4 — required disclosure. Always visible, on every page. */}
        <p className="footer-disclosure">
          Demo build. Artist profiles, biographies and artworks are invented for this
          prototype, and all imagery is procedurally generated.
          {' '}<Link href="/attribution">Full attribution</Link>.
        </p>
      </div>
    </footer>
  )
}
