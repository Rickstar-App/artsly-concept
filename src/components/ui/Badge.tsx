/**
 * Availability and status badges — PRD §14.3, §18.1, DESIGN.md §9.
 *
 * §45 — "NEVER RELY ON COLOUR ALONE. Availability badges carry text, not just
 * a dot." Every badge below is a word.
 */

import type { ArtworkAvailability } from '@/lib/taxonomy'

export function Badge({
  tone = 'neutral', children, className,
}: {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  className?: string
}) {
  return <span className={`badge badge-${tone} ${className ?? ''}`}>{children}</span>
}

/** §14.3 — the two states reachable by direct link but never in the feed. */
export function AvailabilityBadge({ availability }: { availability: ArtworkAvailability }) {
  switch (availability) {
    case 'rented':   return <Badge tone="neutral">In someone’s home</Badge>
    case 'sold':     return <Badge tone="neutral">Sold</Badge>
    case 'reserved': return <Badge tone="accent">Reserved</Badge>
    default:         return null
  }
}

/** §7.6 — Mystery pieces are differentiated by a small badge, not a separate page. */
export const MysteryBadge = () => <Badge tone="accent">Mystery</Badge>
export const OwnedBadge   = () => <Badge tone="success">Owned</Badge>
export const DemoArtistBadge = () => <Badge tone="neutral">Demo artist</Badge>
