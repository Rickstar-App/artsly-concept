/**
 * §46.1 — state-machine.test.ts
 * "Every legal transition in §23 succeeds; every illegal one is rejected."
 *
 * §0.1 defect #19: v1.0 used the column name `status` for two different enums
 * on two different tables and specified transitions for neither.
 */
import { describe, expect, it } from 'vitest'
import {
  canTransitionArtwork, transitionArtwork, legalArtworkTriples,
  canTransitionRental, transitionRental, legalRentalTriples, TERMINAL_RENTAL_STATUSES,
  canTransitionMystery, transitionMystery, legalMysteryTriples,
  IllegalTransition,
  type ArtworkEvent, type RentalEvent, type MysteryEvent,
} from '../state/machines'
import { ARTWORK_AVAILABILITY, RENTAL_STATUSES, MYSTERY_STATUSES } from '../taxonomy'

const ARTWORK_EVENTS: ArtworkEvent[] = ['rent', 'mystery_match', 'buy', 'return', 'swap_out', 'reveal', 'reserve_expire']
const RENTAL_EVENTS: RentalEvent[] = ['extend', 'return', 'swap', 'buy', 'cancel', 'confirm_returned']
const MYSTERY_EVENTS: MysteryEvent[] = ['reveal', 'activate', 'rotate', 'cancel', 'complete']

describe('§23.1 artworks.availability', () => {
  it('implements exactly the specified transition table', () => {
    expect(legalArtworkTriples().sort()).toEqual([
      ['available', 'buy', 'sold'],
      ['available', 'mystery_match', 'reserved'],
      ['available', 'rent', 'rented'],
      ['rented', 'buy', 'sold'],
      ['rented', 'return', 'available'],
      ['rented', 'swap_out', 'available'],
      ['reserved', 'reserve_expire', 'available'],
      ['reserved', 'reveal', 'rented'],
    ].sort())
  })

  it('sold is terminal — nothing escapes it', () => {
    for (const e of ARTWORK_EVENTS) {
      expect(canTransitionArtwork('sold', e), `sold + ${e}`).toBe(false)
      expect(() => transitionArtwork('sold', e)).toThrow(IllegalTransition)
    }
  })

  it('rejects every transition not in the table', () => {
    const legal = new Set(legalArtworkTriples().map(([f, e]) => `${f}|${e}`))
    for (const from of ARTWORK_AVAILABILITY) for (const e of ARTWORK_EVENTS) {
      if (legal.has(`${from}|${e}`)) continue
      expect(canTransitionArtwork(from, e), `${from} + ${e}`).toBe(false)
      expect(() => transitionArtwork(from, e)).toThrow()
    }
  })

  it('an already-rented piece cannot be rented again — the inventory invariant', () => {
    expect(canTransitionArtwork('rented', 'rent')).toBe(false)
    expect(canTransitionArtwork('reserved', 'rent')).toBe(false)
    expect(canTransitionArtwork('sold', 'rent')).toBe(false)
  })

  it('reserved auto-expires back to available so an abandoned Mystery flow strands nothing', () => {
    expect(transitionArtwork('reserved', 'reserve_expire')).toBe('available')
  })

  it('the full library round trip returns to available', () => {
    let s = transitionArtwork('available', 'rent')
    expect(s).toBe('rented')
    s = transitionArtwork(s, 'return')
    expect(s).toBe('available')
  })

  it('the full mystery round trip: available -> reserved -> rented -> available', () => {
    let s = transitionArtwork('available', 'mystery_match')
    expect(s).toBe('reserved')
    s = transitionArtwork(s, 'reveal')
    expect(s).toBe('rented')
    s = transitionArtwork(s, 'swap_out')
    expect(s).toBe('available')
  })
})

describe('§23.2 rentals.status', () => {
  it('implements exactly the specified transition table', () => {
    expect(legalRentalTriples().sort()).toEqual([
      ['active', 'buy', 'purchased'],
      ['active', 'cancel', 'cancelled'],
      ['active', 'extend', 'active'],
      ['active', 'return', 'ending'],
      ['active', 'swap', 'ending'],
      ['ending', 'confirm_returned', 'returned'],
    ].sort())
  })

  it('extend is a SELF-transition — the row stays active, end_date moves', () => {
    expect(transitionRental('active', 'extend')).toBe('active')
  })

  it('every terminal status is genuinely terminal', () => {
    for (const t of TERMINAL_RENTAL_STATUSES) {
      for (const e of RENTAL_EVENTS) expect(canTransitionRental(t, e), `${t} + ${e}`).toBe(false)
    }
  })

  it('rejects every transition not in the table', () => {
    const legal = new Set(legalRentalTriples().map(([f, e]) => `${f}|${e}`))
    for (const from of RENTAL_STATUSES) for (const e of RENTAL_EVENTS) {
      if (legal.has(`${from}|${e}`)) continue
      expect(canTransitionRental(from, e), `${from} + ${e}`).toBe(false)
    }
  })

  it('an ending rental cannot be extended, bought, or returned again', () => {
    for (const e of ['extend', 'buy', 'return', 'swap', 'cancel'] as RentalEvent[]) {
      expect(canTransitionRental('ending', e)).toBe(false)
    }
  })

  it('"expiring soon" is NOT a status — it is not in the enum at all (§18.2)', () => {
    expect(RENTAL_STATUSES as readonly string[]).not.toContain('expiring')
    expect(RENTAL_STATUSES as readonly string[]).not.toContain('expiring-soon')
    expect(RENTAL_STATUSES).toEqual(['active', 'ending', 'returned', 'purchased', 'cancelled'])
  })
})

describe('§7.5 / §26 mystery_subscriptions.status', () => {
  it('matching -> matched on reveal; matched/active -> matching on rotate', () => {
    expect(transitionMystery('matching', 'reveal')).toBe('matched')
    expect(transitionMystery('matched', 'rotate')).toBe('matching')
    expect(transitionMystery('active', 'rotate')).toBe('matching')
  })
  it('cancelled and completed are terminal', () => {
    for (const t of ['cancelled', 'completed'] as const) {
      for (const e of MYSTERY_EVENTS) expect(canTransitionMystery(t, e), `${t} + ${e}`).toBe(false)
    }
  })
  it('rejects every transition not in the table', () => {
    const legal = new Set(legalMysteryTriples().map(([f, e]) => `${f}|${e}`))
    for (const from of MYSTERY_STATUSES) for (const e of MYSTERY_EVENTS) {
      if (legal.has(`${from}|${e}`)) continue
      expect(canTransitionMystery(from, e), `${from} + ${e}`).toBe(false)
    }
  })
})

describe('the two enums remain genuinely distinct (§0.1 defect #19)', () => {
  it('share no member', () => {
    const a = new Set<string>(ARTWORK_AVAILABILITY)
    for (const r of RENTAL_STATUSES) expect(a.has(r), `"${r}" appears in both enums`).toBe(false)
  })
})
