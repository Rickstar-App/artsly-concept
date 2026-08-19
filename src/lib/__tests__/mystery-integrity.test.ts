/**
 * §48 — "MYSTERY INTEGRITY. No revealed piece contradicts the stated brief on
 *        style, color, or size (§24.2)."
 *
 * §24.2 is THE ONE RULE of the feature: "The surprise is the specific artwork,
 * NEVER the user's stated preferences... They never get a red portrait 'as a
 * surprise.' Violating this is the fastest way to make the feature feel like a
 * gimmick."
 *
 * REGRESSION: ranking by the §12 weighted score alone does not hold this line.
 * A brief for blue/neutral abstract returned two pieces tagged `red`, because
 * style, room, size and boldness together outweighed a total colour miss. This
 * suite sweeps every plausible brief and asserts the promise holds.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scoreArtwork } from '../recommend/score'
import { comparisonPriceDollars } from '../pricing/rental'
import { COLORS, SIZES, STYLES, BUDGET_RANGE, type Color, type Size, type Style } from '../taxonomy'

interface Row {
  id: string; slug: string; artist_id: string; availability: string
  styles: Style[]; colors: Color[]; moods: string[]; rooms: string[]
  boldness: number; size_category: Size
  rental_1m_cents: number; rental_3m_cents: number
  rental_6m_cents: number; rental_12m_cents: number
}
const cat = JSON.parse(readFileSync(join(process.cwd(), 'src/data/catalog.json'), 'utf8')) as { artworks: Row[] }

/**
 * Mirrors `matchPieces` in `lib/actions/mystery.ts`: the hard brief constraint,
 * then §12 ranking, then one-per-artist, then size widening.
 */
function match(brief: { styles: Style[]; colors: Color[]; size: Size; pieces: number; boldness: number }) {
  const band = BUDGET_RANGE['200-plus']
  const profile = {
    room: 'any' as const, styles: brief.styles, colors: brief.colors, moods: [] as string[],
    size_preference: brief.size, boldness: brief.boldness,
    budget_min: band.min, budget_max: band.max,
  }
  const wantColors = new Set<string>(brief.colors)
  const wantStyles = new Set<string>(brief.styles)
  const sizeIdx = SIZES.indexOf(brief.size)

  const pick = (dist: number) => {
    const used = new Set<string>()
    const out: Row[] = []
    const ranked = cat.artworks
      .filter((a) => a.availability === 'available')
      .filter((a) => Math.abs(SIZES.indexOf(a.size_category) - sizeIdx) <= dist)
      .filter((a) => a.colors.some((c) => wantColors.has(c)) && a.styles.some((s) => wantStyles.has(s)))
      .map((a) => ({
        a,
        score: scoreArtwork(profile, { ...a, comparison_price: comparisonPriceDollars(a) }).match_score,
        dominant: wantColors.has(a.colors[0]) ? 1 : 0,
        styleHits: a.styles.filter((st) => wantStyles.has(st)).length,
      }))
      .sort((x, y) =>
        y.dominant - x.dominant || y.styleHits - x.styleHits ||
        y.score - x.score || x.a.id.localeCompare(y.a.id))
    for (const r of ranked) {
      if (out.length >= brief.pieces) break
      if (used.has(r.a.artist_id)) continue
      used.add(r.a.artist_id)
      out.push(r.a)
    }
    return out
  }

  let m = pick(0)
  for (const d of [1, 2]) {
    if (m.length >= brief.pieces) break
    const wider = pick(d)
    if (wider.length > m.length) m = wider
  }
  return m
}

describe('§24.2 / §48 — a revealed piece never contradicts the brief', () => {
  it('the exact failing case: blue+neutral, abstract+contemporary, medium', () => {
    const m = match({ styles: ['abstract', 'contemporary'], colors: ['blue', 'neutral'], size: 'medium', pieces: 3, boldness: 4 })
    expect(m.length).toBeGreaterThan(0)
    // §11.1 — the dominant colour is listed first, and the reveal should lead
    // with pieces whose dominant colour is one the user actually asked for.
    for (const a of m) {
      expect(['blue', 'neutral'], `"${a.slug}" leads with ${a.colors[0]}`).toContain(a.colors[0])
    }
    for (const a of m) {
      expect(a.colors.some((c) => ['blue', 'neutral'].includes(c)), `"${a.slug}" is ${a.colors.join('/')} — no blue or neutral`).toBe(true)
      expect(a.styles.some((s) => ['abstract', 'contemporary'].includes(s)), `"${a.slug}" is ${a.styles.join('/')}`).toBe(true)
    }
  })

  it('holds across every single-style × single-colour × size brief', () => {
    const violations: string[] = []
    for (const style of STYLES) {
      for (const color of COLORS) {
        for (const size of SIZES) {
          for (const a of match({ styles: [style], colors: [color], size, pieces: 3, boldness: 5 })) {
            if (!a.colors.includes(color)) violations.push(`${style}/${color}/${size} → "${a.slug}" (${a.colors.join(',')})`)
            if (!a.styles.includes(style)) violations.push(`${style}/${color}/${size} → "${a.slug}" (${a.styles.join(',')})`)
          }
        }
      }
    }
    expect(violations.slice(0, 8)).toEqual([])
  })

  it('§26.2 — never more than one piece per artist', () => {
    for (const style of STYLES) {
      for (const size of SIZES) {
        const m = match({ styles: [style], colors: ['blue', 'neutral', 'monochrome', 'earth'], size, pieces: 4, boldness: 5 })
        const artists = m.map((a) => a.artist_id)
        expect(new Set(artists).size, `${style}/${size} repeated an artist`).toBe(artists.length)
      }
    }
  })

  it('§41.5 — delivers FEWER pieces rather than a contradicting one', () => {
    // A deliberately narrow brief. Whatever comes back must honour it, even if
    // that means fewer than four pieces.
    const m = match({ styles: ['surreal'], colors: ['purple'], size: 'oversized', pieces: 4, boldness: 9 })
    expect(m.length).toBeLessThanOrEqual(4)
    for (const a of m) {
      expect(a.colors).toContain('purple')
      expect(a.styles).toContain('surreal')
    }
  })

  it('is deterministic — the same brief matches the same pieces every time', () => {
    const brief = { styles: ['abstract'] as Style[], colors: ['blue'] as Color[], size: 'large' as Size, pieces: 3, boldness: 4 }
    const runs = Array.from({ length: 8 }, () => match(brief).map((a) => a.slug).join(','))
    expect(new Set(runs).size).toBe(1)
  })

  it('REALISTIC briefs — 2 styles × 2 colours — are essentially always fillable', () => {
    // The form requires 1–4 styles and 1–4 colours (§24.3), and real users pick
    // more than one of each. This is the coverage number that actually matters.
    const styleP: Array<[Style, Style]> = []
    for (let i = 0; i < STYLES.length; i++) {
      for (let j = i + 1; j < STYLES.length; j++) styleP.push([STYLES[i], STYLES[j]])
    }
    const colorP: Array<[Color, Color]> = []
    for (let i = 0; i < COLORS.length; i++) {
      for (let j = i + 1; j < COLORS.length; j++) colorP.push([COLORS[i], COLORS[j]])
    }

    let total = 0
    let dead = 0
    for (const styles of styleP) {
      for (const colors of colorP) {
        total++
        const filled = SIZES.some((size) => match({ styles: [...styles], colors: [...colors], size, pieces: 1, boldness: 5 }).length > 0)
        if (!filled) dead++
      }
    }
    const coverage = 1 - dead / total
    expect(coverage, `only ${(coverage * 100).toFixed(1)}% of 2×2 briefs are fillable`).toBeGreaterThan(0.97)
  })

  it('single-tag briefs mostly fill; the rest are combinations no catalogue would hold', () => {
    // A 65-piece catalogue cannot contain every one of the 120 style×colour
    // pairs, and several are self-contradictory as art: a MINIMALIST piece is
    // not `vibrant`, a SURREAL piece is rarely `monochrome`. §41.5's
    // fewer-pieces path exists for exactly this, so the honest bound is "most
    // fill", not "all".
    const dead: string[] = []
    for (const style of STYLES) {
      for (const color of COLORS) {
        const any = SIZES.some((size) => match({ styles: [style], colors: [color], size, pieces: 1, boldness: 5 }).length > 0)
        if (!any) dead.push(`${style}+${color}`)
      }
    }
    const total = STYLES.length * COLORS.length
    expect(1 - dead.length / total, `only ${total - dead.length}/${total} single-tag briefs fill`).toBeGreaterThan(0.6)
  })
})
