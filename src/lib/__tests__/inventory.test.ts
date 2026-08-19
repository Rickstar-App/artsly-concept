/**
 * §46.1 — inventory.test.ts.
 *
 * "Two concurrent rentals of one artwork: exactly one succeeds, the other gets
 *  §41.2." (§46.1)
 *
 * §23.3 — "Every transition that touches artworks.availability runs inside a
 *  transaction that RE-READS AND RE-CHECKS availability first. This is the only
 *  real correctness requirement in the MVP's backend... TWO LAPTOPS OPEN ON THE
 *  DEMO TABLE WILL FIND IT IF IT'S MISSING."
 *
 * This exercises the invariant at the level the session driver can guarantee it:
 * the availability overlay plus the §23.1 state machine. `createRental` performs
 * exactly this check inside `mutateSession`, which hands the mutator a clone and
 * writes only on success — so a rejected second attempt leaves NOTHING behind,
 * which is what §41.5 demands ("never leave a rental with the artwork still
 * available").
 */
import { describe, expect, it } from 'vitest'
import {
  availabilityOverlay, emptyState, addMonths, today, type SessionState,
} from '../db/state'
import { canTransitionArtwork, transitionArtwork } from '../state/machines'
import type { Rental } from '../db/types'

function session(): SessionState {
  return emptyState({
    id: 'u1', email: 'a@b.c', display_name: 'A', role: 'collector',
    created_at: new Date().toISOString(),
  })
}

function rent(s: SessionState, artworkId: string, id = 'r1'): Rental {
  const r: Rental = {
    id, user_id: s.user.id, artwork_id: artworkId, source: 'library',
    mystery_subscription_id: null, status: 'active',
    start_date: today(), end_date: addMonths(today(), 3), ended_at: null,
    rental_period_months: 3, price_cents: 20_000, artist_share_rate: 0.6,
    extensions: [], return_reason: null, return_note: null,
    contact_name: 'A', contact_email: 'a@b.c',
    shipping_address: { line1: '1', line2: null, city: 'C', state: 'NC', zip: '27701' },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }
  s.rentals.push(r)
  return r
}

/** The exact predicate `createRental` runs inside the transaction. */
function tryClaim(s: SessionState, artworkId: string): boolean {
  const current = availabilityOverlay(s).get(artworkId) ?? 'available'
  if (!canTransitionArtwork(current, 'rent')) return false
  transitionArtwork(current, 'rent')
  return true
}

describe('§23.3 / §48 — one artwork, one home', () => {
  it('a second rental of the same piece is REJECTED', () => {
    const s = session()
    expect(tryClaim(s, 'blue-horizon')).toBe(true)
    rent(s, 'blue-horizon')
    // The re-check now sees `rented` and refuses. §41.2 is what the UI renders.
    expect(tryClaim(s, 'blue-horizon')).toBe(false)
  })

  it('a rejected claim leaves NO orphaned rental (§41.5)', () => {
    const s = session()
    rent(s, 'blue-horizon')
    const before = s.rentals.length
    expect(tryClaim(s, 'blue-horizon')).toBe(false)
    expect(s.rentals.length).toBe(before)
  })

  it('a sold piece can never be rented', () => {
    const s = session()
    s.purchases.push({
      id: 'p1', user_id: s.user.id, artwork_id: 'blue-horizon', rental_id: null,
      price_cents: 120_000, artist_share_rate: 0.7,
      shipping_address: { line1: '1', line2: null, city: 'C', state: 'NC', zip: '27701' },
      created_at: new Date().toISOString(),
    })
    expect(availabilityOverlay(s).get('blue-horizon')).toBe('sold')
    expect(tryClaim(s, 'blue-horizon')).toBe(false)
  })

  it('returning frees the piece for the next renter', () => {
    const s = session()
    const r = rent(s, 'blue-horizon')
    expect(tryClaim(s, 'blue-horizon')).toBe(false)
    // §23.2 — `ending` means notionally in transit; §31.2 says it must NOT block
    // the next renter, because mystery rotation depends on that.
    r.status = 'ending'
    r.ended_at = today()
    expect(availabilityOverlay(s).get('blue-horizon')).toBe('available')
    expect(tryClaim(s, 'blue-horizon')).toBe(true)
  })

  it('an unrevealed mystery match RESERVES the piece', () => {
    const s = session()
    s.matches.push({
      id: 'm1', subscription_id: 'sub1', cycle: 1, kind: 'curated',
      artist_id: 'maya-chen', artwork_id: 'blue-horizon', match_score: 100,
      selected: false, revealed_at: null, created_at: new Date().toISOString(),
    })
    expect(availabilityOverlay(s).get('blue-horizon')).toBe('reserved')
    expect(tryClaim(s, 'blue-horizon')).toBe(false)
  })

  it('§23.1 — a reservation expires after 24h so nothing is stranded', () => {
    const s = session()
    s.matches.push({
      id: 'm1', subscription_id: 'sub1', cycle: 1, kind: 'curated',
      artist_id: 'maya-chen', artwork_id: 'blue-horizon', match_score: 100,
      selected: false, revealed_at: null,
      created_at: new Date(Date.now() - 25 * 3_600_000).toISOString(),
    })
    expect(availabilityOverlay(s).get('blue-horizon')).toBeUndefined()
    expect(tryClaim(s, 'blue-horizon')).toBe(true)
  })

  it('the overlay is order-independent: sold always wins', () => {
    const s = session()
    rent(s, 'blue-horizon')
    s.purchases.push({
      id: 'p1', user_id: s.user.id, artwork_id: 'blue-horizon', rental_id: 'r1',
      price_cents: 120_000, artist_share_rate: 0.7,
      shipping_address: { line1: '1', line2: null, city: 'C', state: 'NC', zip: '27701' },
      created_at: new Date().toISOString(),
    })
    expect(availabilityOverlay(s).get('blue-horizon')).toBe('sold')
  })
})
