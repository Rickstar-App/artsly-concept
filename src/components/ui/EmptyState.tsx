/** §41.4 — every empty state has copy and a way out. */
import Link from 'next/link'

export function EmptyState({
  title, body, ctaLabel, ctaHref, compact,
}: {
  title: string
  body?: string
  ctaLabel?: string
  ctaHref?: string
  compact?: boolean
}) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}`}>
      <p className="empty-title">{title}</p>
      {body ? <p className="empty-body">{body}</p> : null}
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="btn btn-secondary">{ctaLabel}</Link>
      ) : null}
    </div>
  )
}

/** §41.4 — the exact copy the PRD specifies, in one place so it cannot drift. */
export const EMPTY = {
  saved:   { title: 'You haven’t saved anything yet.', body: 'Start with the pieces that stop you.', ctaLabel: 'Discover Art', ctaHref: '/discover' },
  history: { title: 'Your walls are waiting.', ctaLabel: 'Find Your First Piece', ctaHref: '/discover' },
  current: { title: 'Nothing on your walls right now.', ctaLabel: 'Explore Art', ctaHref: '/discover' },
  mystery: { title: 'Don’t feel like browsing?', body: 'Tell us what you love and we’ll choose.', ctaLabel: 'Try Mystery Art', ctaHref: '/mystery' },
  artist:  { title: 'No pieces yet.', body: 'Add your first.', ctaLabel: 'Add Artwork', ctaHref: '/artist-dashboard' },
} as const
