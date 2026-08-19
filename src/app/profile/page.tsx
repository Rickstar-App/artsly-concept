import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer, pastRentals } from '@/lib/session'
import { dollars } from '@/components/ui/Money'
import { getArtwork } from '@/lib/db/catalog'
import { EVENT_TYPES } from '@/lib/db/types'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')
  const state = viewer.state!

  const spent = state.rentals.reduce((n, r) => n + r.price_cents, 0)
    + state.purchases.reduce((n, p) => n + p.price_cents, 0)
  const past = pastRentals(state)

  return (
    <div className="page section-top narrow">
      <h1 className="page-title">Profile</h1>

      <dl className="taste-list">
        <div className="taste-row"><dt className="taste-label">Name</dt><dd className="taste-value">{state.user.display_name}</dd></div>
        <div className="taste-row"><dt className="taste-label">Email</dt><dd className="taste-value">{state.user.email}</dd></div>
        <div className="taste-row"><dt className="taste-label">Account</dt><dd className="taste-value" style={{ textTransform: 'capitalize' }}>{state.user.role}</dd></div>
      </dl>

      <section className="section">
        <h2 className="section-title">Your history</h2>
        <div className="profile-stats">
          <Stat label="Pieces lived with" value={String(state.rentals.length)} />
          <Stat label="Owned" value={String(state.purchases.length)} />
          <Stat label="Saved" value={String(state.favorites.length)} />
          <Stat label="Total spent" value={dollars(spent)} />
        </div>
        {past.length > 0 ? (
          <p className="hint">
            Most recently: {getArtwork(past[0].artwork_id)?.title}.{' '}
            <Link href="/my-space" className="inline-link">See your full history</Link>.
          </p>
        ) : null}
      </section>

      <section className="section">
        <h2 className="section-title">Elsewhere</h2>
        <div className="profile-links">
          <Link href="/profile/taste" className="btn btn-secondary">Your taste profile</Link>
          <Link href="/my-space/saved" className="btn btn-secondary">Saved art</Link>
          <Link href="/my-space" className="btn btn-secondary">My Space</Link>
          {viewer.isArtist ? <Link href="/artist-dashboard" className="btn btn-secondary">Artist dashboard</Link> : null}
        </div>
      </section>

      {/* §40 — the log is P0. Showing it is honest about what we record. */}
      <section className="section">
        <h2 className="section-title">What we’ve recorded</h2>
        <p className="hint">
          {state.events.length} events this session, out of {EVENT_TYPES.length} kinds we track.
          IDs only — never personal details.
        </p>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <p className="stat-value tnum">{value}</p>
      <p className="stat-label">{label}</p>
    </div>
  )
}
