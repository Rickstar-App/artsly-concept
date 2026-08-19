/**
 * §46.1 — "validate-seed.ts runs in CI against the seed."
 *
 * Plus the two §12.7 scoring fixtures, verified against the ACTUAL committed
 * catalogue rather than against hand-written literals. §48 makes this an
 * acceptance criterion: "Alex's profile scores Blue Horizon at 100 and Ferry
 * Light at 49."
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateCatalog } from '../../../scripts/validate-seed'
import { scoreArtwork, type ScoreProfile } from '../recommend/score'
import { buildFeed } from '../recommend/feed'
import { comparisonPriceDollars } from '../pricing/rental'
import { ALEX_PREFERENCES } from '../demo/accounts'

const cat = JSON.parse(readFileSync(join(process.cwd(), 'src/data/catalog.json'), 'utf8'))

const ALEX: ScoreProfile = {
  room: ALEX_PREFERENCES.room,
  styles: ALEX_PREFERENCES.styles,
  colors: ALEX_PREFERENCES.colors,
  moods: ALEX_PREFERENCES.moods,
  size_preference: ALEX_PREFERENCES.size_preference,
  boldness: ALEX_PREFERENCES.boldness,
  budget_min: ALEX_PREFERENCES.budget_min_cents / 100,
  budget_max: ALEX_PREFERENCES.budget_max_cents / 100,
}

const find = (slug: string) => {
  const a = cat.artworks.find((x: { slug: string }) => x.slug === slug)
  expect(a, `artwork "${slug}" missing from the catalogue`).toBeTruthy()
  return { ...a, comparison_price: comparisonPriceDollars(a) }
}

describe('§37.5 seed validation', () => {
  it('passes every rule with zero errors', () => {
    expect(validateCatalog(cat)).toEqual([])
  })
})

describe('§12.7 / §48 acceptance — scored against the real catalogue', () => {
  it('Alex scores "Blue Horizon" at exactly 100', () => {
    expect(scoreArtwork(ALEX, find('blue-horizon')).match_score).toBe(100)
  })
  it('Alex scores "Ferry Light" at exactly 49', () => {
    expect(scoreArtwork(ALEX, find('ferry-light')).match_score).toBe(49)
  })
  it('Blue Horizon is the $1,200 / 48×36 large piece §0.3 specifies', () => {
    const a = find('blue-horizon')
    expect(a.purchase_price_cents).toBe(120_000)
    expect(a.width_in).toBe(48)
    expect(a.height_in).toBe(36)
    expect(a.size_category).toBe('large')
    expect(a.rental_1m_cents).toBe(8_000)
    expect(a.rental_3m_cents).toBe(20_000)
    expect(a.rental_6m_cents).toBe(35_000)
    expect(a.rental_12m_cents).toBe(59_000)
  })
})

describe('§48 — changing size preference reshapes the feed', () => {
  // "Changing size preference from Large to Small changes at least 6 of the
  //  top 12 results." Tested against the REAL feed, which applies §12.10's
  //  two-per-artist diversity cap — that cap is part of what makes the feed
  //  turn over, so testing a raw sort would test the wrong thing.
  const feedFor = (size: ScoreProfile['size_preference']) =>
    buildFeed({
      candidates: cat.artworks as never,
      profile: { ...ALEX, size_preference: size },
      limit: 12,
    }).items.map((i) => i.artwork.slug)

  it('Large → Small changes at least 6 of the top 12', () => {
    const large = feedFor('large')
    const small = feedFor('small')
    expect(large).toHaveLength(12)
    expect(small).toHaveLength(12)
    const changed = large.filter((id) => !small.includes(id)).length
    expect(changed, `only ${changed} of 12 changed:\n  large: ${large.join(' ')}\n  small: ${small.join(' ')}`)
      .toBeGreaterThanOrEqual(6)
  })

  it('§12.10 — no artist appears more than twice in any result set', () => {
    for (const size of ['small', 'medium', 'large', 'oversized'] as const) {
      const items = buildFeed({ candidates: cat.artworks as never, profile: { ...ALEX, size_preference: size }, limit: 12 }).items
      const counts = new Map<string, number>()
      for (const i of items) counts.set(i.artwork.artist_id, (counts.get(i.artwork.artist_id) ?? 0) + 1)
      for (const [artist, n] of counts) expect(n, `${artist} appears ${n}× at size ${size}`).toBeLessThanOrEqual(2)
    }
  })

  it('§12.10 — the feed is deterministic; ten builds give one order', () => {
    const runs = Array.from({ length: 10 }, () => feedFor('large').join(','))
    expect(new Set(runs).size).toBe(1)
  })

  it('§12.9 — the feed never contains rented or sold inventory', () => {
    const items = buildFeed({ candidates: cat.artworks as never, profile: ALEX, limit: 24 }).items
    for (const i of items) expect(i.artwork.availability).toBe('available')
  })

  it('§12.9a — far-off sizes are HIDDEN AND COUNTED, never silently dropped', () => {
    const r = buildFeed({ candidates: cat.artworks as never, profile: { ...ALEX, size_preference: 'small' }, limit: 12 })
    expect(r.hiddenBySize).toBeGreaterThan(0)
    for (const i of r.items) expect(['small', 'medium']).toContain(i.artwork.size_category)
  })

  it('§12.9a — the override restores every size', () => {
    const hidden = buildFeed({ candidates: cat.artworks as never, profile: { ...ALEX, size_preference: 'small' }, limit: 99 })
    const shown = buildFeed({
      candidates: cat.artworks as never, profile: { ...ALEX, size_preference: 'small' },
      filters: { showOtherSizes: true }, limit: 99,
    })
    expect(shown.total).toBe(hidden.total + hidden.hiddenBySize)
    expect(shown.hiddenBySize).toBe(0)
  })

  it('§12.9a — an explicit size FILTER overrides the preference constraint', () => {
    const r = buildFeed({
      candidates: cat.artworks as never, profile: { ...ALEX, size_preference: 'small' },
      filters: { sizes: ['oversized'] }, limit: 99,
    })
    expect(r.items.length).toBeGreaterThan(0)
    for (const i of r.items) expect(i.artwork.size_category).toBe('oversized')
  })

  it('§12.11 — a user with no preferences gets a cold-start feed', () => {
    const r = buildFeed({ candidates: cat.artworks as never, profile: null, limit: 12 })
    expect(r.coldStart).toBe(true)
    expect(r.items.every((i) => i.result === null)).toBe(true)
    expect(r.items.slice(0, 8).every((i) => i.artwork.featured)).toBe(true)
  })
})
