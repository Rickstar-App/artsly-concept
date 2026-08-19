/**
 * STATE MACHINES — PRD §23
 *
 * v1.0 used the column name `status` for two different enums on two different
 * tables and never specified transitions for either. These are now
 * `artworks.availability` and `rentals.status`, both fully specified.
 *
 * Pure module. Every transition that touches artwork availability must run
 * inside a transaction that re-reads and re-checks first (§23.3) — that is the
 * repository's job; this module only says what is legal.
 */

import type { ArtworkAvailability, MysteryStatus, RentalStatus } from '../taxonomy'

// ---------------------------------------------------------------------------
// §23.1 — artworks.availability
// Each artwork is ONE UNIQUE PHYSICAL PIECE. It can be in exactly one place at
// a time. `sold` is terminal.
// ---------------------------------------------------------------------------

export type ArtworkEvent =
  | 'rent'          // available -> rented
  | 'mystery_match' // available -> reserved
  | 'buy'           // available -> sold  |  rented -> sold (renter only)
  | 'return'        // rented -> available
  | 'swap_out'      // rented -> available
  | 'reveal'        // reserved -> rented
  | 'reserve_expire'// reserved -> available  (24h, §23.1)

const ARTWORK_TRANSITIONS: Record<ArtworkAvailability, Partial<Record<ArtworkEvent, ArtworkAvailability>>> = {
  available: { rent: 'rented', mystery_match: 'reserved', buy: 'sold' },
  rented:    { return: 'available', swap_out: 'available', buy: 'sold' },
  reserved:  { reveal: 'rented', reserve_expire: 'available' },
  sold:      {}, // terminal
}

export function canTransitionArtwork(from: ArtworkAvailability, event: ArtworkEvent): boolean {
  return ARTWORK_TRANSITIONS[from][event] !== undefined
}

export function transitionArtwork(from: ArtworkAvailability, event: ArtworkEvent): ArtworkAvailability {
  const to = ARTWORK_TRANSITIONS[from][event]
  if (!to) throw new IllegalTransition(`artwork: cannot "${event}" from "${from}"`)
  return to
}

// ---------------------------------------------------------------------------
// §23.2 — rentals.status
//
// `ending` means "user is done with it, it's notionally in transit back".
// "EXPIRING SOON" IS NOT A STATUS — it is `end_date - today <= 14` computed at
// render time (§18.2). v1.0 conflated the two.
// ---------------------------------------------------------------------------

export type RentalEvent =
  | 'extend'    // active -> active (end_date moves)
  | 'return'    // active -> ending
  | 'swap'      // active -> ending
  | 'buy'       // active -> purchased (terminal)
  | 'cancel'    // active -> cancelled (terminal, <24h only)
  | 'confirm_returned' // ending -> returned (terminal)

const RENTAL_TRANSITIONS: Record<RentalStatus, Partial<Record<RentalEvent, RentalStatus>>> = {
  active:    { extend: 'active', return: 'ending', swap: 'ending', buy: 'purchased', cancel: 'cancelled' },
  ending:    { confirm_returned: 'returned' },
  returned:  {},
  purchased: {},
  cancelled: {},
}

export function canTransitionRental(from: RentalStatus, event: RentalEvent): boolean {
  return RENTAL_TRANSITIONS[from][event] !== undefined
}

export function transitionRental(from: RentalStatus, event: RentalEvent): RentalStatus {
  const to = RENTAL_TRANSITIONS[from][event]
  if (!to) throw new IllegalTransition(`rental: cannot "${event}" from "${from}"`)
  return to
}

export const TERMINAL_RENTAL_STATUSES: readonly RentalStatus[] = ['returned', 'purchased', 'cancelled']

// ---------------------------------------------------------------------------
// §7.5 / §26 — mystery_subscriptions.status
// ---------------------------------------------------------------------------

export type MysteryEvent = 'reveal' | 'activate' | 'rotate' | 'cancel' | 'complete'

const MYSTERY_TRANSITIONS: Record<MysteryStatus, Partial<Record<MysteryEvent, MysteryStatus>>> = {
  matching:  { reveal: 'matched', cancel: 'cancelled' },
  matched:   { activate: 'active', rotate: 'matching', cancel: 'cancelled' },
  active:    { rotate: 'matching', cancel: 'cancelled', complete: 'completed' },
  cancelled: {},
  completed: {},
}

export function canTransitionMystery(from: MysteryStatus, event: MysteryEvent): boolean {
  return MYSTERY_TRANSITIONS[from][event] !== undefined
}

export function transitionMystery(from: MysteryStatus, event: MysteryEvent): MysteryStatus {
  const to = MYSTERY_TRANSITIONS[from][event]
  if (!to) throw new IllegalTransition(`mystery: cannot "${event}" from "${from}"`)
  return to
}

// ---------------------------------------------------------------------------

export class IllegalTransition extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IllegalTransition'
  }
}

/** All legal (from, event, to) triples — enumerated for `state-machine.test.ts`. */
export function legalArtworkTriples(): Array<[ArtworkAvailability, ArtworkEvent, ArtworkAvailability]> {
  return enumerate(ARTWORK_TRANSITIONS)
}
export function legalRentalTriples(): Array<[RentalStatus, RentalEvent, RentalStatus]> {
  return enumerate(RENTAL_TRANSITIONS)
}
export function legalMysteryTriples(): Array<[MysteryStatus, MysteryEvent, MysteryStatus]> {
  return enumerate(MYSTERY_TRANSITIONS)
}

function enumerate<S extends string, E extends string>(
  table: Record<S, Partial<Record<E, S>>>,
): Array<[S, E, S]> {
  const out: Array<[S, E, S]> = []
  for (const from of Object.keys(table) as S[]) {
    for (const [event, to] of Object.entries(table[from]) as Array<[E, S]>) {
      out.push([from, event, to])
    }
  }
  return out
}
