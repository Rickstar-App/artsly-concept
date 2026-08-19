/**
 * RECOMMENDATION ENGINE — PRD §12
 *
 * NO MACHINE LEARNING. A deterministic weighted score, fully specified.
 * v1.0 named seven match components and defined none of them. All seven are
 * here, plus the filters, the diversity rule, cold start, and similarity.
 *
 * Pure functions, no I/O — so §12.7's worked examples are unit-testable and the
 * same code runs on the server and in a client-side filter preview. (§43.2)
 */

import { SIZE_INDEX, ROOM_WILDCARD } from '../taxonomy'
import type { Size, UserRoom } from '../taxonomy'

// ---------------------------------------------------------------------------
// §12.1 — Weights. Sum to exactly 1.00.
// Budget carries only 0.05 because it is enforced structurally by the hard
// filter in §12.9 — it is a tiebreaker, not a gate.
// ---------------------------------------------------------------------------
export const WEIGHTS = {
  style:    0.25,
  color:    0.20,
  mood:     0.15,
  room:     0.15,
  size:     0.10,
  boldness: 0.10,
  budget:   0.05,
} as const

export type Component = keyof typeof WEIGHTS
export const COMPONENTS = Object.keys(WEIGHTS) as Component[]

// ---------------------------------------------------------------------------
// §12.2 — Multi-value components: the overlap coefficient.
//
// Dividing by the SMALLER set is deliberate. A user who picks 3 styles and an
// artwork carrying 2 styles can still score 1.0 by matching both of the
// artwork's styles. Dividing by the user's set instead would cap most artworks
// at 0.33 and flatten the entire feed.
// ---------------------------------------------------------------------------
export function overlap(userTags: readonly string[], artTags: readonly string[]): number {
  // Deduplicate both sides. The DB enforces unique tags, but a duplicate in
  // seed or user data would otherwise push the ratio above 1.0 and break
  // §12.1's guarantee that score_raw lies in [0, 1].
  const user = new Set(userTags)
  const art = new Set(artTags)
  if (user.size === 0 || art.size === 0) return 0.5 // neutral, not zero
  let hits = 0
  for (const t of art) if (user.has(t)) hits++
  return hits / Math.min(user.size, art.size)
}

/** The tags that actually matched — drives reason chips and "Why this piece". */
export function overlapHits(userTags: readonly string[], artTags: readonly string[]): string[] {
  const user = new Set(userTags)
  const seen = new Set<string>()
  return artTags.filter((t) => {
    if (!user.has(t) || seen.has(t)) return false
    seen.add(t)
    return true
  })
}

// ---------------------------------------------------------------------------
// §12.3 — room_match. Floor is 0.25, not 0: a superb abstract piece should not
// be zeroed out because nobody tagged it for hallways.
// ---------------------------------------------------------------------------
export function roomMatch(userRoom: UserRoom, artRooms: readonly string[]): number {
  if (userRoom === ROOM_WILDCARD) return 0.5
  return artRooms.includes(userRoom) ? 1.0 : 0.25
}

// ---------------------------------------------------------------------------
// §12.4 — size_match. Exact 1.00 / one off 0.67 / two off 0.33 / three off 0.00
// ---------------------------------------------------------------------------
export function sizeMatch(userSize: Size, artSize: Size): number {
  return 1 - Math.abs(SIZE_INDEX[userSize] - SIZE_INDEX[artSize]) / 3
}

// ---------------------------------------------------------------------------
// §12.5 — boldness_match
// ---------------------------------------------------------------------------
export function boldnessMatch(userBoldness: number, artBoldness: number): number {
  return 1 - Math.abs(userBoldness - artBoldness) / 9
}

// ---------------------------------------------------------------------------
// §12.6 — budget_match. Compares comparison_price (§7.2) against the band.
// Under-budget scores 0.9 rather than 1.0 so that, all else equal, a user gets
// pieces at the TOP of their range rather than the bottom.
// ---------------------------------------------------------------------------
export function budgetMatch(comparisonPrice: number, min: number, max: number): number {
  if (comparisonPrice >= min && comparisonPrice <= max) return 1.0
  if (comparisonPrice < min)                            return 0.9
  if (comparisonPrice <= max * 1.25)                    return 0.6
  if (comparisonPrice <= max * 1.50)                    return 0.3
  return 0.0 // also excluded by §12.9
}

// ---------------------------------------------------------------------------
// The scoring surface.
// ---------------------------------------------------------------------------

/** The user-side inputs the scorer needs. Mystery briefs adapt to this shape (§26.2). */
export interface ScoreProfile {
  room: UserRoom
  styles: readonly string[]
  colors: readonly string[]
  moods: readonly string[]
  size_preference: Size
  boldness: number
  budget_min: number   // dollars/month
  budget_max: number   // dollars/month
}

/** The artwork-side inputs. A structural subset of the §31 `artworks` row. */
export interface ScoreArtwork {
  id: string
  artist_id: string
  styles: readonly string[]
  colors: readonly string[]
  moods: readonly string[]
  rooms: readonly string[]
  boldness: number
  size_category: Size
  /** §7.2 comparison_price = rental_3m / 3, in DOLLARS. */
  comparison_price: number
}

export interface ComponentScores {
  style: number; color: number; mood: number; room: number
  size: number; boldness: number; budget: number
}

export interface ScoreResult {
  /** 0–1 before affinity. */
  score_raw: number
  /** 0–1 after the ±20% affinity swing (§13.3). */
  adjusted_score: number
  /** 0–100, the only number the UI is allowed to show (§39.1). */
  match_score: number
  components: ComponentScores
  /** weight × component, used to pick the reason chip (§39.2). */
  contributions: ComponentScores
  /** Which tags actually matched — for plain-language explanation (§39.3). */
  matched: { styles: string[]; colors: string[]; moods: string[]; room: boolean }
  affinity_bonus: number
}

/**
 * §12.1 + §13.3.
 *
 * `affinityBonus` is the clamped mean of the user's affinity weights across
 * every style/color/mood tag on this artwork. Maximum swing is ±20%: behaviour
 * nudges the ranking, it never overrides a stated preference.
 */
export function scoreArtwork(
  profile: ScoreProfile,
  art: ScoreArtwork,
  affinityBonus = 0,
): ScoreResult {
  const components: ComponentScores = {
    style:    overlap(profile.styles, art.styles),
    color:    overlap(profile.colors, art.colors),
    mood:     overlap(profile.moods,  art.moods),
    room:     roomMatch(profile.room, art.rooms),
    size:     sizeMatch(profile.size_preference, art.size_category),
    boldness: boldnessMatch(profile.boldness, art.boldness),
    budget:   budgetMatch(art.comparison_price, profile.budget_min, profile.budget_max),
  }

  const contributions = {
    style:    WEIGHTS.style    * components.style,
    color:    WEIGHTS.color    * components.color,
    mood:     WEIGHTS.mood     * components.mood,
    room:     WEIGHTS.room     * components.room,
    size:     WEIGHTS.size     * components.size,
    boldness: WEIGHTS.boldness * components.boldness,
    budget:   WEIGHTS.budget   * components.budget,
  }

  const score_raw = COMPONENTS.reduce((sum, k) => sum + contributions[k], 0)
  const bonus = clamp(affinityBonus, -1, 1)
  const adjusted_score = clamp(score_raw * (1 + 0.20 * bonus), 0, 1)

  return {
    score_raw,
    adjusted_score,
    match_score: Math.round(adjusted_score * 100),
    components,
    contributions,
    matched: {
      styles: overlapHits(profile.styles, art.styles),
      colors: overlapHits(profile.colors, art.colors),
      moods:  overlapHits(profile.moods,  art.moods),
      room:   profile.room !== ROOM_WILDCARD && art.rooms.includes(profile.room),
    },
    affinity_bonus: bonus,
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

// ---------------------------------------------------------------------------
// §13.3 — affinity_bonus for one artwork, from the user's affinity map.
// ---------------------------------------------------------------------------
export type AffinityMap = Map<string, number> // key: `${tag_type}:${tag}`

export function affinityKey(tagType: 'style' | 'color' | 'mood', tag: string): string {
  return `${tagType}:${tag}`
}

export function affinityBonusFor(art: Pick<ScoreArtwork, 'styles' | 'colors' | 'moods'>, affinity: AffinityMap): number {
  if (affinity.size === 0) return 0
  const weights: number[] = []
  for (const t of art.styles) weights.push(affinity.get(affinityKey('style', t)) ?? 0)
  for (const t of art.colors) weights.push(affinity.get(affinityKey('color', t)) ?? 0)
  for (const t of art.moods)  weights.push(affinity.get(affinityKey('mood',  t)) ?? 0)
  if (weights.length === 0) return 0
  return clamp(weights.reduce((a, b) => a + b, 0) / weights.length, -1, 1)
}

// ---------------------------------------------------------------------------
// §12.8 — Similarity. Used by the "just rented" error state (§41.2), the detail
// page "More like this" rail, and post-return recommendations.
// ---------------------------------------------------------------------------
export interface SimilarCandidate extends Pick<ScoreArtwork, 'id' | 'artist_id' | 'styles' | 'colors' | 'moods' | 'size_category'> {
  availability?: string
}

export function similarityScore(a: SimilarCandidate, b: SimilarCandidate): number {
  return (
    0.40 * overlap(a.styles, b.styles) +
    0.30 * overlap(a.colors, b.colors) +
    0.20 * overlap(a.moods,  b.moods) +
    0.10 * sizeMatch(a.size_category, b.size_category)
  )
}

/**
 * Top k similar pieces. Only `available` inventory, never the piece itself.
 * ON TIES, PREFER A DIFFERENT ARTIST (§12.8) — otherwise "three similar pieces"
 * is three pieces by the person whose work the user just failed to get.
 */
export function similar<T extends SimilarCandidate>(art: SimilarCandidate, pool: readonly T[], k = 3): T[] {
  return pool
    .filter((b) => b.id !== art.id && (b.availability ?? 'available') === 'available')
    .map((b) => ({ b, s: similarityScore(art, b), sameArtist: b.artist_id === art.artist_id }))
    .sort((x, y) =>
      y.s - x.s ||
      Number(x.sameArtist) - Number(y.sameArtist) ||
      x.b.id.localeCompare(y.b.id),                 // deterministic final tiebreak
    )
    .slice(0, k)
    .map((r) => r.b)
}

// ---------------------------------------------------------------------------
// §12.10 — Diversity and result shape.
// ---------------------------------------------------------------------------

export interface RankedItem<T> {
  artwork: T
  result: ScoreResult
}

/**
 * Sort by adjusted_score desc, then featured desc, then created_at desc.
 * THE FINAL TIEBREAKER MUST BE DETERMINISTIC — never random() — or the feed
 * reshuffles on every render and the demo looks broken. (§12.10)
 */
export function rankAndDiversify<T extends { id: string; artist_id: string; featured?: boolean; created_at?: string }>(
  items: RankedItem<T>[],
  limit: number,
  maxPerArtist = 2,
): RankedItem<T>[] {
  const sorted = [...items].sort((a, b) =>
    b.result.adjusted_score - a.result.adjusted_score ||
    Number(b.artwork.featured ?? false) - Number(a.artwork.featured ?? false) ||
    String(b.artwork.created_at ?? '').localeCompare(String(a.artwork.created_at ?? '')) ||
    a.artwork.id.localeCompare(b.artwork.id),
  )

  // Cap per artist, then backfill from the next-highest scorers (§12.10).
  const perArtist = new Map<string, number>()
  const picked: RankedItem<T>[] = []
  const overflow: RankedItem<T>[] = []

  for (const item of sorted) {
    if (picked.length >= limit) break
    const n = perArtist.get(item.artwork.artist_id) ?? 0
    if (n < maxPerArtist) {
      perArtist.set(item.artwork.artist_id, n + 1)
      picked.push(item)
    } else {
      overflow.push(item)
    }
  }

  // Only if the cap starved the result set do we relax it — an under-filled
  // feed is worse than a third piece by one artist, and §41.1 is for genuinely
  // empty results, not for a diversity rule eating its own inventory.
  for (const item of overflow) {
    if (picked.length >= limit) break
    picked.push(item)
  }

  return picked
}

/**
 * §12.9 filter 3 — hard budget cutoff.
 * Exposed separately so the UI can honestly report "12 pieces hidden by your
 * budget. [Show them anyway]" rather than silently shrinking the feed.
 */
export function exceedsHardBudget(comparisonPrice: number, budgetMax: number, multiple = 1.5): boolean {
  return comparisonPrice > budgetMax * multiple
}
