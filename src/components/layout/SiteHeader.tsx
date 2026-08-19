/**
 * §33.1 — Desktop navigation.
 *   [logo]  Discover  Mystery Art  Artists  |  My Space  Profile  ♡
 */
import Link from 'next/link'
import type { ViewerSummary } from '@/lib/session'
import { NavLink } from './NavLink'

export function SiteHeader({ viewer }: { viewer: ViewerSummary }) {
  return (
    <header className="site-header">
      <div className="page site-header-inner">
        <Link href="/" className="wordmark" aria-label="Artsly, home">
          Artsly
        </Link>

        <nav className="nav-primary" aria-label="Primary">
          <NavLink href="/discover">Discover</NavLink>
          <NavLink href="/mystery">Mystery Art</NavLink>
          <NavLink href="/artists">Artists</NavLink>
        </nav>

        <nav className="nav-account" aria-label="Account">
          {viewer.signedIn ? (
            <>
              {viewer.isArtist ? (
                <NavLink href="/artist-dashboard">Your work</NavLink>
              ) : (
                <NavLink href="/my-space">
                  My Space
                  {viewer.atHome > 0 ? (
                    <span className="nav-count tnum" aria-label={`${viewer.atHome} pieces at home`}>
                      {viewer.atHome}
                    </span>
                  ) : null}
                </NavLink>
              )}
              <NavLink href="/profile">Profile</NavLink>
              <NavLink href="/my-space/saved" aria-label="Saved art" className="nav-icon">
                <HeartGlyph />
              </NavLink>
            </>
          ) : (
            <Link href="/onboarding" className="btn btn-primary btn-compact">Discover My Art</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function HeartGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 1 1 7.1 7L12 20.5Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  )
}
