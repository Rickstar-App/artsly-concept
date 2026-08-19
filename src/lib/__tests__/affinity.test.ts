/**
 * §46.1 — affinity.test.ts
 * "Three saves of blue abstract crosses +0.45 and triggers promotion.
 *  Clamping at ±1.0."
 *
 * This is the demo moment (§13.4). Three saves × 0.15 = 0.45 exactly, which is
 * intentional: the presenter can trigger it live in about fifteen seconds.
 */
import { describe, expect, it } from 'vitest'
import {
  AFFINITY_DELTA, PROMOTE_THRESHOLD, DEMOTE_THRESHOLD,
  applyInteraction, detectPreferenceShifts, tagTypesFor,
  affinityActionForReturnReason, returnReasonPromptsSizeChange,
  type AffinityRow,
} from '../recommend/affinity'

const BLUE_ABSTRACT = { styles: ['abstract'], colors: ['blue'], moods: ['calm'] }
const CAPS = { styles: 5, colors: 4, moods: 3 }

/** Replay N interactions, threading the accumulated map through each. */
function replay(n: number, action: Parameters<typeof applyInteraction>[1], art = BLUE_ABSTRACT) {
  let rows: AffinityRow[] = []
  let last: ReturnType<typeof applyInteraction> = []
  for (let i = 0; i < n; i++) {
    last = applyInteraction(rows, action, art)
    const byKey = new Map(rows.map((r) => [`${r.tag_type}:${r.tag}`, r]))
    for (const u of last) byKey.set(`${u.tag_type}:${u.tag}`, { tag_type: u.tag_type, tag: u.tag, weight: u.weight })
    rows = [...byKey.values()]
  }
  return { rows, last }
}

describe('§13.2 deltas', () => {
  it('match the specified table exactly', () => {
    expect(AFFINITY_DELTA).toEqual({
      view: 0.02, save: 0.15, unsave: -0.15, skip: -0.10,
      rent: 0.25, purchase: 0.35, return_style: -0.20,
    })
  })
  it('apply to every style, colour and mood tag on the piece', () => {
    const out = applyInteraction([], 'save', { styles: ['abstract', 'contemporary'], colors: ['blue'], moods: ['calm'] })
    expect(out).toHaveLength(4)
    expect(out.every((r) => r.weight === 0.15)).toBe(true)
  })
  it('return reason "style" touches STYLES ONLY (§13.2)', () => {
    expect(tagTypesFor('return_style')).toEqual(['style'])
    const out = applyInteraction([], 'return_style', BLUE_ABSTRACT)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ tag_type: 'style', tag: 'abstract', weight: -0.2 })
  })
  it('return reasons different/price/other/space move NOTHING', () => {
    for (const r of ['different', 'price', 'other', 'space'] as const) {
      expect(affinityActionForReturnReason(r)).toBeNull()
    }
    expect(affinityActionForReturnReason('style')).toBe('return_style')
  })
  it('"space" triggers the size-preference prompt instead — explicit beats silent', () => {
    expect(returnReasonPromptsSizeChange('space')).toBe(true)
    expect(returnReasonPromptsSizeChange('style')).toBe(false)
  })
})

describe('§13.4 THE DEMO MOMENT — three saves crosses +0.45', () => {
  it('two saves is 0.30 and does NOT promote', () => {
    const { rows, last } = replay(2, 'save')
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBeCloseTo(0.30, 6)
    expect(detectPreferenceShifts(last, { styles: ['photography'], colors: [], moods: [] }, CAPS, rows)).toEqual([])
  })

  it('the third save lands exactly on 0.45 and promotes', () => {
    const { rows, last } = replay(3, 'save')
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBeCloseTo(PROMOTE_THRESHOLD, 6)
    const shifts = detectPreferenceShifts(last, { styles: ['photography'], colors: [], moods: [] }, CAPS, rows)
    expect(shifts.some((s) => s.kind === 'added' && s.tag === 'abstract')).toBe(true)
  })

  it('does not re-promote a tag the user has already declared', () => {
    const { rows, last } = replay(3, 'save')
    const shifts = detectPreferenceShifts(last, { styles: ['abstract'], colors: ['blue'], moods: ['calm'] }, CAPS, rows)
    expect(shifts).toEqual([])
  })

  it('fires only ON the crossing, never again on later saves', () => {
    const four = replay(4, 'save')
    const shifts = detectPreferenceShifts(four.last, { styles: [], colors: [], moods: [] }, CAPS, four.rows)
    expect(shifts.filter((s) => s.tag === 'abstract')).toEqual([])
  })

  it('displaces the LOWEST-affinity declared tag when at the §10 cap', () => {
    const { rows, last } = replay(3, 'save')
    const all = [...rows,
      { tag_type: 'style' as const, tag: 'pop', weight: 0.30 },
      { tag_type: 'style' as const, tag: 'traditional', weight: -0.20 },
    ]
    const shifts = detectPreferenceShifts(
      last,
      { styles: ['pop', 'traditional', 'surreal', 'street', 'landscape'], colors: [], moods: [] },
      CAPS, all,
    )
    const add = shifts.find((s) => s.kind === 'added')!
    expect(add.tag).toBe('abstract')
    expect(add.displaced).toBe('traditional') // -0.20 is the lowest
  })
})

describe('§13.4 demotion', () => {
  it('four skips is −0.40 and does NOT demote', () => {
    const { rows, last } = replay(4, 'skip')
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBeCloseTo(-0.40, 6)
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBeGreaterThan(DEMOTE_THRESHOLD)
    expect(detectPreferenceShifts(last, { styles: ['abstract'], colors: [], moods: [] }, CAPS, rows)).toEqual([])
  })

  it('the fifth skip crosses −0.45 and removes the declared tag', () => {
    const { rows, last } = replay(5, 'skip')
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBeCloseTo(-0.50, 6)
    const shifts = detectPreferenceShifts(last, { styles: ['abstract'], colors: [], moods: [] }, CAPS, rows)
    expect(shifts.some((s) => s.kind === 'removed' && s.tag === 'abstract')).toBe(true)
  })

  it('never removes a tag the user never declared', () => {
    const { rows, last } = replay(6, 'skip')
    expect(detectPreferenceShifts(last, { styles: [], colors: [], moods: [] }, CAPS, rows)).toEqual([])
  })
})

describe('REGRESSION — the float bug that would have killed the demo', () => {
  it('three saves land on EXACTLY 0.45, not 0.44999999999999996', () => {
    const { rows } = replay(3, 'save')
    const w = rows.find((r) => r.tag === 'abstract')!.weight
    expect(w).toBe(0.45)                       // strict equality, not toBeCloseTo
    expect(w >= PROMOTE_THRESHOLD).toBe(true)  // the comparison the shift detector makes
    expect(0.15 + 0.15 + 0.15 >= 0.45).toBe(false) // ...which naive float arithmetic fails
  })
  it('no accumulated weight ever carries float noise', () => {
    for (const action of ['save', 'skip', 'view', 'rent'] as const) {
      for (let n = 1; n <= 12; n++) {
        for (const r of replay(n, action).rows) {
          expect(Number.isInteger(Math.round(r.weight * 10_000)), `${action} x${n}`).toBe(true)
          expect(r.weight).toBe(Math.round(r.weight * 10_000) / 10_000)
        }
      }
    }
  })
})

describe('clamping at ±1.0', () => {
  it('saves cannot push a weight above 1.0', () => {
    const { rows } = replay(30, 'save')
    for (const r of rows) expect(r.weight).toBeLessThanOrEqual(1.0)
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBe(1.0)
  })
  it('skips cannot push a weight below −1.0', () => {
    const { rows } = replay(30, 'skip')
    for (const r of rows) expect(r.weight).toBeGreaterThanOrEqual(-1.0)
    expect(rows.find((r) => r.tag === 'abstract')!.weight).toBe(-1.0)
  })
  it('reports no update once a weight is pinned at the clamp', () => {
    const { rows } = replay(30, 'save')
    expect(applyInteraction(rows, 'save', BLUE_ABSTRACT)).toEqual([])
  })
})

describe('§13.1 — size and room are NOT taste', () => {
  it('no action can ever write a size or room affinity row', () => {
    for (const a of Object.keys(AFFINITY_DELTA) as Array<keyof typeof AFFINITY_DELTA>) {
      for (const t of tagTypesFor(a)) expect(['style', 'color', 'mood']).toContain(t)
    }
  })
})

describe('§13.3 — NO TIME DECAY in the MVP', () => {
  it('replaying the same interaction is purely additive and order-independent', () => {
    const a = replay(3, 'save').rows.find((r) => r.tag === 'abstract')!.weight
    const b = replay(3, 'save').rows.find((r) => r.tag === 'abstract')!.weight
    expect(a).toBe(b)
  })
  it('a save then an unsave returns exactly to zero', () => {
    const saved = applyInteraction([], 'save', BLUE_ABSTRACT)
    const rows = saved.map(({ tag_type, tag, weight }) => ({ tag_type, tag, weight }))
    const unsaved = applyInteraction(rows, 'unsave', BLUE_ABSTRACT)
    for (const u of unsaved) expect(u.weight).toBeCloseTo(0, 10)
  })
})
