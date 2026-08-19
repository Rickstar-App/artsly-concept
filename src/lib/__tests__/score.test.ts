/**
 * §46.1 / §12.7 — The two worked examples are the ACCEPTANCE TEST for §12.
 * Blue Horizon must return exactly 100. Ferry Light must return exactly 49.
 */
import { describe, expect, it } from 'vitest'
import {
  WEIGHTS, COMPONENTS, overlap, roomMatch, sizeMatch, boldnessMatch, budgetMatch,
  scoreArtwork, similar, rankAndDiversify, affinityBonusFor, affinityKey,
  exceedsHardBudget,
  type ScoreArtwork, type ScoreProfile,
} from '../recommend/score'

// §12.7 — User: Alex
const ALEX: ScoreProfile = {
  room: 'living-room',
  styles: ['abstract', 'contemporary', 'minimalist'],
  colors: ['blue', 'neutral'],
  moods:  ['calm', 'sophisticated'],
  boldness: 4,
  size_preference: 'large',
  budget_min: 50,
  budget_max: 100,
}

// §12.7 — Artwork A: "Blue Horizon" (Maya Chen), purchase $1,200
const BLUE_HORIZON: ScoreArtwork = {
  id: 'a', artist_id: 'maya',
  styles: ['abstract', 'contemporary'],
  colors: ['blue', 'neutral'],
  moods:  ['calm'],
  rooms:  ['living-room', 'bedroom', 'office'],
  boldness: 4,
  size_category: 'large',
  comparison_price: 20000 / 3 / 100, // rental_3m $200 / 3 = $66.67
}

// §12.7 — Artwork B: "Ferry Light" (Layla Thompson), purchase $600
const FERRY_LIGHT: ScoreArtwork = {
  id: 'b', artist_id: 'layla',
  styles: ['photography', 'landscape'],
  colors: ['blue', 'monochrome'],
  moods:  ['calm'],
  rooms:  ['bedroom', 'hallway'],
  boldness: 3,
  size_category: 'medium',
  comparison_price: 10000 / 3 / 100, // rental_3m $100 / 3 = $33.33
}

describe('§12.1 weights', () => {
  it('sum to exactly 1.00', () => {
    const sum = COMPONENTS.reduce((s, k) => s + WEIGHTS[k], 0)
    expect(sum).toBeCloseTo(1.0, 10)
  })
})

describe('§12.2 overlap coefficient', () => {
  it('returns the NEUTRAL 0.5 on an empty set, not zero', () => {
    expect(overlap([], ['abstract'])).toBe(0.5)
    expect(overlap(['abstract'], [])).toBe(0.5)
    expect(overlap([], [])).toBe(0.5)
  })
  it('divides by the SMALLER set so a 3-pick user can still score 1.0', () => {
    expect(overlap(['abstract', 'contemporary', 'minimalist'], ['abstract', 'contemporary'])).toBe(1.0)
  })
  it('scores partial overlap correctly', () => {
    expect(overlap(['blue', 'neutral'], ['blue', 'monochrome'])).toBe(0.5)
    expect(overlap(['a', 'b', 'c'], ['x', 'y'])).toBe(0)
  })
  it('is bounded to [0,1] for any input', () => {
    expect(overlap(['a'], ['a', 'a'])).toBeLessThanOrEqual(1)
  })
})

describe('§12.3 roomMatch', () => {
  it('wildcard "any" is neutral 0.5', () => expect(roomMatch('any', ['bedroom'])).toBe(0.5))
  it('hit is 1.0', () => expect(roomMatch('living-room', ['living-room', 'office'])).toBe(1.0))
  it('miss floors at 0.25, never zero', () => expect(roomMatch('living-room', ['hallway'])).toBe(0.25))
})

describe('§12.4 sizeMatch', () => {
  it('exact / one / two / three buckets off', () => {
    expect(sizeMatch('large', 'large')).toBe(1)
    expect(sizeMatch('large', 'medium')).toBeCloseTo(0.667, 3)
    expect(sizeMatch('large', 'small')).toBeCloseTo(0.333, 3)
    expect(sizeMatch('oversized', 'small')).toBe(0)
  })
  it('is symmetric', () => expect(sizeMatch('small', 'large')).toBe(sizeMatch('large', 'small')))
})

describe('§12.5 boldnessMatch', () => {
  it('boundaries', () => {
    expect(boldnessMatch(5, 5)).toBe(1)
    expect(boldnessMatch(1, 10)).toBe(0)
    expect(boldnessMatch(4, 3)).toBeCloseTo(0.889, 3)
  })
})

describe('§12.6 budgetMatch', () => {
  it('in band = 1.0; under budget = 0.9 (top of range preferred)', () => {
    expect(budgetMatch(67, 50, 100)).toBe(1.0)
    expect(budgetMatch(50, 50, 100)).toBe(1.0)
    expect(budgetMatch(100, 50, 100)).toBe(1.0)
    expect(budgetMatch(33.33, 50, 100)).toBe(0.9)
  })
  it('graduated overage, then zero', () => {
    expect(budgetMatch(125, 50, 100)).toBe(0.6)   // <= max*1.25
    expect(budgetMatch(150, 50, 100)).toBe(0.3)   // <= max*1.50
    expect(budgetMatch(151, 50, 100)).toBe(0.0)
  })
})

describe('§12.7 worked examples — THE acceptance test', () => {
  it('Alex × Blue Horizon = 100', () => {
    const r = scoreArtwork(ALEX, BLUE_HORIZON)
    expect(r.components.style).toBe(1)
    expect(r.components.color).toBe(1)
    expect(r.components.mood).toBe(1)
    expect(r.components.room).toBe(1)
    expect(r.components.size).toBe(1)
    expect(r.components.boldness).toBe(1)
    expect(r.components.budget).toBe(1)
    expect(r.score_raw).toBeCloseTo(1.0, 6)
    expect(r.match_score).toBe(100)
  })

  it('Alex × Ferry Light = 49', () => {
    const r = scoreArtwork(ALEX, FERRY_LIGHT)
    expect(r.components.style).toBe(0)
    expect(r.components.color).toBe(0.5)
    expect(r.components.mood).toBe(1)
    expect(r.components.room).toBe(0.25)
    expect(r.components.size).toBeCloseTo(0.667, 3)
    expect(r.components.boldness).toBeCloseTo(0.889, 3)
    expect(r.components.budget).toBe(0.9)
    expect(r.score_raw).toBeCloseTo(0.488, 3)
    expect(r.match_score).toBe(49)
  })

  it('reports which tags matched, for §39.3', () => {
    const r = scoreArtwork(ALEX, BLUE_HORIZON)
    expect(r.matched.styles).toEqual(['abstract', 'contemporary'])
    expect(r.matched.colors).toEqual(['blue', 'neutral'])
    expect(r.matched.moods).toEqual(['calm'])
    expect(r.matched.room).toBe(true)
  })

  it('score_raw is always within [0,1] for arbitrary inputs', () => {
    const r = scoreArtwork(
      { ...ALEX, styles: [], colors: [], moods: [], room: 'any' },
      { ...FERRY_LIGHT, comparison_price: 9999 },
    )
    expect(r.score_raw).toBeGreaterThanOrEqual(0)
    expect(r.score_raw).toBeLessThanOrEqual(1)
  })
})

describe('§13.3 affinity adjustment', () => {
  it('swings at most ±20% and clamps to [0,1]', () => {
    const base = scoreArtwork(ALEX, FERRY_LIGHT).score_raw
    const up = scoreArtwork(ALEX, FERRY_LIGHT, +1).adjusted_score
    const down = scoreArtwork(ALEX, FERRY_LIGHT, -1).adjusted_score
    expect(up).toBeCloseTo(base * 1.2, 6)
    expect(down).toBeCloseTo(base * 0.8, 6)
  })
  it('a perfect score cannot exceed 100 even at maximum affinity', () => {
    expect(scoreArtwork(ALEX, BLUE_HORIZON, +1).match_score).toBe(100)
  })
  it('affinityBonusFor averages every style/color/mood weight on the piece', () => {
    const map = new Map([
      [affinityKey('style', 'abstract'), 0.6],
      [affinityKey('color', 'blue'), 0.3],
    ])
    // abstract .6, contemporary 0, blue .3, neutral 0, calm 0 => 0.9/5 = 0.18
    expect(affinityBonusFor(BLUE_HORIZON, map)).toBeCloseTo(0.18, 6)
  })
  it('an empty affinity map contributes nothing', () => {
    expect(affinityBonusFor(BLUE_HORIZON, new Map())).toBe(0)
  })
})

describe('§12.8 similarity', () => {
  const pool: ScoreArtwork[] = [
    BLUE_HORIZON,
    { ...BLUE_HORIZON, id: 'c', artist_id: 'maya' },              // same artist, identical
    { ...BLUE_HORIZON, id: 'd', artist_id: 'noah' },              // other artist, identical
    { ...FERRY_LIGHT,  id: 'e', artist_id: 'layla' },
  ]
  it('excludes the piece itself and prefers a DIFFERENT artist on ties', () => {
    const got = similar(BLUE_HORIZON, pool as never, 2)
    expect(got.map((x) => x.id)).not.toContain('a')
    expect(got[0].id).toBe('d') // different artist wins the tie
  })
  it('never returns unavailable inventory', () => {
    const withSold = pool.map((p) => ({ ...p, availability: p.id === 'd' ? 'sold' : 'available' }))
    const got = similar(BLUE_HORIZON, withSold as never, 3)
    expect(got.map((x) => x.id)).not.toContain('d')
  })
  it('is deterministic across repeated calls', () => {
    const a = similar(BLUE_HORIZON, pool as never, 3).map((x) => x.id)
    const b = similar(BLUE_HORIZON, pool as never, 3).map((x) => x.id)
    expect(a).toEqual(b)
  })
})

describe('§12.10 diversity and determinism', () => {
  const mk = (id: string, artist: string, score: number) => ({
    artwork: { id, artist_id: artist, featured: false, created_at: '2026-01-01' },
    result: { adjusted_score: score } as never,
  })

  it('caps at 2 artworks per artist', () => {
    const items = [
      mk('1', 'maya', 0.99), mk('2', 'maya', 0.98), mk('3', 'maya', 0.97),
      mk('4', 'noah', 0.96), mk('5', 'ava', 0.95), mk('6', 'leo', 0.94),
    ]
    const out = rankAndDiversify(items, 4)
    const mayaCount = out.filter((x) => x.artwork.artist_id === 'maya').length
    expect(mayaCount).toBe(2)
    expect(out.map((x) => x.artwork.id)).toEqual(['1', '2', '4', '5'])
  })

  it('backfills from overflow rather than returning an under-filled feed', () => {
    const items = [mk('1', 'maya', 0.9), mk('2', 'maya', 0.8), mk('3', 'maya', 0.7)]
    expect(rankAndDiversify(items, 3)).toHaveLength(3)
  })

  it('NEVER reshuffles — identical input yields identical order (no random())', () => {
    const items = [mk('a', 'x', 0.5), mk('b', 'y', 0.5), mk('c', 'z', 0.5)]
    const runs = Array.from({ length: 25 }, () => rankAndDiversify(items, 3).map((i) => i.artwork.id))
    for (const r of runs) expect(r).toEqual(runs[0])
  })
})

describe('§12.9 hard budget cutoff', () => {
  it('excludes above 1.5× the band max', () => {
    expect(exceedsHardBudget(150, 100)).toBe(false)
    expect(exceedsHardBudget(151, 100)).toBe(true)
  })
})
