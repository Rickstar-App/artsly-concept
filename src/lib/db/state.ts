/**
 * SESSION STATE — the mutable half of the data model.
 *
 * ARCHITECTURE NOTE (read this before changing anything here)
 * ----------------------------------------------------------
 * The PRD specifies Supabase Postgres (§43.1) and `supabase/migrations/0001_init.sql`
 * implements §31 and §32 in full — schema, CHECK constraints, RLS, and the
 * `claim_artwork` concurrency function.
 *
 * This module is the *other* driver: it holds the same rows in a signed,
 * gzipped, httpOnly session cookie so the deployed demo runs on Vercel with
 * ZERO configuration. That is a deliberate decision, not a shortcut:
 *
 *   - §37.2's own reasoning — "an external URL that 404s on demo day is an
 *     avoidable, fatal failure" — applies with equal force to a database that
 *     is not provisioned on demo day.
 *   - §38.4 requires the demo to run twice in a row from a reset. A per-session
 *     store makes `demo:reset` instantaneous and makes two browsers genuinely
 *     independent, which is exactly what §46.2's two-browser inventory test
 *     wants to observe.
 *   - The row shapes here are structurally identical to §31, so the Supabase
 *     driver is a swap at `src/lib/db/index.ts`, not a rewrite.
 *
 * The catalogue half (artists, artworks) is static committed data and is shared
 * by both drivers — see `catalog.ts`.
 *
 * This file is PURE. Cookie I/O lives in `store.ts`.
 */

import type {
  EventType, Favorite, MysteryMatch, MysterySubscription, Purchase,
  Rental, UserAffinityRow, UserPreferences,
} from './types'
import { AUTO_RETURN_AFTER_DAYS, RESERVE_EXPIRY_HOURS } from '../pricing/config'
import type { UserRole } from '../taxonomy'

/** Bumped when the shape changes; an older cookie is discarded, not migrated. */
export const STATE_VERSION = 1

/** §40 — the log is P0, reporting is P2. Bounded so the cookie cannot grow without limit. */
export const MAX_EVENTS = 60

export interface SessionState {
  v: number
  user: {
    id: string
    email: string
    display_name: string
    role: UserRole
    /** Set when this session signed in as a seeded artist (§32.2). */
    artist_id?: string
    created_at: string
  }
  preferences: UserPreferences | null
  affinity: UserAffinityRow[]
  rentals: Rental[]
  purchases: Purchase[]
  favorites: Favorite[]
  /** §13.2 explicit dismissals in the feed. */
  skipped: string[]
  subscriptions: MysterySubscription[]
  matches: MysteryMatch[]
  events: Array<{ id: number; t: EventType; a?: string | null; ar?: string | null; p?: Record<string, unknown>; at: string }>
  /** §13.4 — shifts the user has already been shown, so a toast never repeats. */
  announced: string[]
  /** Monotonic counter for event ids. */
  seq: number
}

export function emptyState(user: SessionState['user']): SessionState {
  return {
    v: STATE_VERSION,
    user,
    preferences: null,
    affinity: [],
    rentals: [],
    purchases: [],
    favorites: [],
    skipped: [],
    subscriptions: [],
    matches: [],
    events: [],
    announced: [],
    seq: 0,
  }
}

export function isValidState(s: unknown): s is SessionState {
  if (!s || typeof s !== 'object') return false
  const st = s as SessionState
  return st.v === STATE_VERSION && !!st.user?.id && Array.isArray(st.rentals)
}

// ---------------------------------------------------------------------------
// Date helpers. Everything is ISO `YYYY-MM-DD` in UTC so a rental's countdown
// never jitters across a timezone boundary during a demo.
// ---------------------------------------------------------------------------

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const targetMonth = dt.getUTCMonth() + months
  const probe = new Date(Date.UTC(y, targetMonth, 1))
  // Clamp the day so 31 Jan + 1 month is 28/29 Feb, not 2/3 March.
  const lastDay = new Date(Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), Math.min(d, lastDay)))
    .toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`)
  const b = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** §18.2 — days_remaining = end_date − today. May be negative. */
export function daysRemaining(endDate: string): number {
  return daysBetween(today(), endDate)
}

export function hoursSince(iso: string): number {
  return (Date.now() - Date.parse(iso)) / 3_600_000
}

// ---------------------------------------------------------------------------
// §20.4 / §23.1 — lazy reconciliation.
//
// The MVP has no scheduler (§52.3). Rather than writing during a render — which
// React server components forbid and which would make reads non-idempotent —
// these transitions are DERIVED at read time. A subsequent server action
// persists the derived value.
// ---------------------------------------------------------------------------

/** §20.4 — `ending` becomes `returned` automatically 7 days after `ended_at`. */
export function reconcileRental(r: Rental): Rental {
  if (r.status === 'ending' && r.ended_at && daysBetween(r.ended_at, today()) >= AUTO_RETURN_AFTER_DAYS) {
    return { ...r, status: 'returned' }
  }
  return r
}

/** §23.1 — a `reserved` artwork auto-expires after 24h so an abandoned Mystery
 *  flow does not strand inventory. */
export function reservationExpired(match: MysteryMatch): boolean {
  return match.revealed_at === null && hoursSince(match.created_at) >= RESERVE_EXPIRY_HOURS
}

// ---------------------------------------------------------------------------
// Derived reads. These are the only way the app should ask "what is on this
// user's walls" — the rules live here once, not in every page.
// ---------------------------------------------------------------------------

export function activeRentals(s: SessionState): Rental[] {
  return s.rentals.map(reconcileRental).filter((r) => r.status === 'active')
}

/** §20.2 step 6 — an outgoing swap stays visible, badged "On its way back". */
export function inTransitRentals(s: SessionState): Rental[] {
  return s.rentals.map(reconcileRental).filter((r) => r.status === 'ending')
}

/** §18.3 — Past Art. Owned pieces show permanently, with no countdown. */
export function pastRentals(s: SessionState): Rental[] {
  return s.rentals
    .map(reconcileRental)
    .filter((r) => r.status === 'returned' || r.status === 'purchased')
    .sort((a, b) => String(b.ended_at ?? b.updated_at).localeCompare(String(a.ended_at ?? a.updated_at)))
}

export function rentalFor(s: SessionState, artworkId: string): Rental | undefined {
  return activeRentals(s).find((r) => r.artwork_id === artworkId)
}

export function ownsArtwork(s: SessionState, artworkId: string): boolean {
  return s.purchases.some((p) => p.artwork_id === artworkId)
}

export function isFavorited(s: SessionState, artworkId: string): boolean {
  return s.favorites.some((f) => f.artwork_id === artworkId)
}

/**
 * The set of artworks THIS session has taken out of general availability.
 *
 * §23.1 says an artwork is one unique physical piece. In the session driver the
 * catalogue is shared and immutable, so availability is the catalogue's base
 * state overlaid with this session's own holdings. Two browsers therefore each
 * see a consistent world, and §17.3's re-check still runs against the overlay.
 */
export function availabilityOverlay(s: SessionState): Map<string, 'rented' | 'sold' | 'reserved' | 'available'> {
  const m = new Map<string, 'rented' | 'sold' | 'reserved' | 'available'>()

  // Reserved: matched but not yet revealed, and not expired.
  for (const match of s.matches) {
    if (match.artwork_id && !match.revealed_at && !reservationExpired(match)) {
      m.set(match.artwork_id, 'reserved')
    }
  }
  // Rented: an active rental by this user.
  for (const r of activeRentals(s)) m.set(r.artwork_id, 'rented')
  // Returned/ending pieces come back to available (§23.1) — the artwork is
  // notionally in transit, but it must not block the next renter (§31.2).
  for (const r of inTransitRentals(s)) if (!m.has(r.artwork_id)) m.set(r.artwork_id, 'available')
  // Sold is terminal and wins over everything.
  for (const p of s.purchases) m.set(p.artwork_id, 'sold')

  return m
}

export function subscriptionsActive(s: SessionState): MysterySubscription[] {
  return s.subscriptions.filter((x) => x.status !== 'cancelled' && x.status !== 'completed')
}

export function matchesForCycle(s: SessionState, subscriptionId: string, cycle: number): MysteryMatch[] {
  return s.matches.filter((m) => m.subscription_id === subscriptionId && m.cycle === cycle)
}

/** Every artwork this subscription has ever delivered — excluded on rotation (§26.5). */
export function allMatchedArtworkIds(s: SessionState, subscriptionId: string): string[] {
  return s.matches
    .filter((m) => m.subscription_id === subscriptionId && m.artwork_id)
    .map((m) => m.artwork_id!)
}

export function affinityMap(s: SessionState): Map<string, number> {
  return new Map(s.affinity.map((a) => [`${a.tag_type}:${a.tag}`, a.weight]))
}

/** §18.1 "3 pieces at home" — library rentals AND mystery pieces, one collection (§7.6). */
export function piecesAtHome(s: SessionState): number {
  return activeRentals(s).length
}

// ---------------------------------------------------------------------------
// §40 — event log.
// ---------------------------------------------------------------------------

export function pushEvent(
  s: SessionState,
  type: EventType,
  opts: { artwork_id?: string | null; artist_id?: string | null; payload?: Record<string, unknown> } = {},
): void {
  s.seq += 1
  s.events.push({
    id: s.seq,
    t: type,
    a: opts.artwork_id ?? null,
    ar: opts.artist_id ?? null,
    p: opts.payload,
    at: new Date().toISOString(),
  })
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS)
}
