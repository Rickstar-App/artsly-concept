/**
 * FEED CONSTRUCTION — PRD §12.9, §12.10, §12.11, §14.
 *
 * Filters, scoring, diversity, and cold start, assembled. Pure with respect to
 * I/O: callers pass the candidate set in, so this stays unit-testable and the
 * same code runs server-side and in a client filter preview (§43.2).
 */

import type { Artwork } from '../db/types'
import {
  affinityBonusFor, exceedsHardBudget, rankAndDiversify, scoreArtwork,
  type AffinityMap, type RankedItem, type ScoreProfile, type ScoreResult,
} from './score'
import { comparisonPriceDollars } from '../pricing/rental'
import { BUDGET_HARD_CUTOFF_MULTIPLE } from '../pricing/config'
import { SIZE_INDEX } from '../taxonomy'
import type { ArtworkAvailability, Color, Room, Size, Style } from '../taxonomy'

export interface FeedFilters {
  styles?: Style[]
  colors?: Color[]
  rooms?: Room[]
  sizes?: Size[]
  budgets?: string[]
  mediums?: string[]
  artists?: string[]
  availability?: ArtworkAvailability[]
  query?: string
  /** §12.9 filter 3 — user cleared the hard budget cutoff for this session. */
  showOverBudget?: boolean
  /** Companion escape hatch for the §12.9a size constraint below. */
  showOtherSizes?: boolean
}

export interface FeedItem {
  artwork: Artwork
  result: ScoreResult | null
}

export interface FeedResult {
  items: FeedItem[]
  /** §12.9 — "12 pieces hidden by your budget. [Show them anyway]" */
  hiddenByBudget: number
  /** §12.9a — "9 pieces hidden because they won't fit. [Show them anyway]" */
  hiddenBySize: number
  total: number
  coldStart: boolean
}

export interface FeedInput {
  candidates: readonly Artwork[]
  profile: ScoreProfile | null
  affinity?: AffinityMap
  /** Availability overlaid by the current session (§23). */
  availabilityOf?: (id: string) => ArtworkAvailability
  /** §12.9 filter 2 — artworks the user currently rents or owns. */
  excludeIds?: ReadonlySet<string>
  filters?: FeedFilters
  limit?: number
  maxPerArtist?: number
  searchBlob?: (id: string) => string
}

/**
 * §12.9 — filters applied BEFORE scoring, as predicates rather than post-hoc.
 * Order matters: availability first, because it is the cheapest and the most
 * exclusionary.
 */
export function buildFeed(input: FeedInput): FeedResult {
  const {
    candidates, profile, affinity, availabilityOf, excludeIds,
    filters = {}, limit = 12, maxPerArtist = 2, searchBlob,
  } = input

  const avail = (a: Artwork): ArtworkAvailability => availabilityOf?.(a.id) ?? a.availability
  const allowedAvailability = filters.availability

  let hiddenByBudget = 0
  let hiddenBySize = 0
  const pool: Artwork[] = []

  for (const a of candidates) {
    const state = avail(a)

    // 1 — never surface rented / reserved / sold pieces in the feed (§12.9).
    if (allowedAvailability) {
      if (!allowedAvailability.includes(state)) continue
    } else if (state !== 'available') continue

    // 2 — exclude what the user already rents or owns.
    if (excludeIds?.has(a.id)) continue

    // 4 — facet filters. AND across facets, OR within a facet (§29.2).
    if (filters.styles?.length && !a.styles.some((s) => filters.styles!.includes(s))) continue
    if (filters.colors?.length && !a.colors.some((c) => filters.colors!.includes(c))) continue
    if (filters.rooms?.length && !a.rooms.some((r) => filters.rooms!.includes(r))) continue
    if (filters.sizes?.length && !filters.sizes.includes(a.size_category)) continue
    if (filters.mediums?.length && !filters.mediums.includes(a.medium)) continue
    if (filters.artists?.length && !filters.artists.includes(a.artist_id)) continue
    if (filters.budgets?.length) {
      const c = comparisonPriceDollars(a)
      if (!filters.budgets.some((b) => inBand(c, b))) continue
    }
    if (filters.query && searchBlob) {
      if (!searchBlob(a.id).includes(filters.query.trim().toLowerCase())) continue
    }

    // 3 — hard budget cutoff. Counted, not silently dropped: the UI has to be
    // able to say "12 pieces hidden by your budget" honestly (§12.9).
    if (profile && !filters.showOverBudget) {
      if (exceedsHardBudget(comparisonPriceDollars(a), profile.budget_max, BUDGET_HARD_CUTOFF_MULTIPLE)) {
        hiddenByBudget++
        continue
      }
    }

    // 3a — SIZE FIT. Exclude anything more than one bucket from the user's
    // stated size, unless they explicitly ask to see it.
    //
    // ---- SPEC GAP, resolved deliberately. Reasoning, because this is an
    // ---- addition to §12.9 and not a transcription of it:
    //
    // §48 requires that "changing size preference from Large to Small changes
    // at least 6 of the top 12 results." Under §12.1's normative weights that
    // is unreachable: size carries 0.10, so switching preference moves any
    // score by at most 0.067, while style+colour+mood+room carry 0.75. A piece
    // that matches a user's taste scores 0.90+ at EVERY size preference and can
    // never be dislodged. Verified empirically against this seed: raw scoring
    // turns over 1–3 of 12, never 6.
    //
    // Changing the weights was rejected — §12.1 is normative and §12.7's two
    // worked examples must return exactly 100 and 49.
    //
    // The resolution comes from §13.1, which draws the distinction itself:
    // "Size and room are NOT in this table — they are PHYSICAL FACTS ABOUT THE
    // USER'S WALL, not taste." A physical fact is a constraint, not a
    // preference. A wall that fits a Small piece cannot hold an Oversized one,
    // and no amount of style affinity changes that.
    //
    // The mechanism mirrors §12.9's own budget cutoff exactly: a soft bound,
    // counted rather than silently applied, with an honest one-click override.
    // Nothing is hidden without saying so.
    if (profile && !filters.showOtherSizes && !filters.sizes?.length) {
      if (Math.abs(SIZE_INDEX[a.size_category] - SIZE_INDEX[profile.size_preference]) >= 2) {
        hiddenBySize++
        continue
      }
    }

    pool.push(a)
  }

  // §12.11 — cold start. No preferences, so do not claim personalisation.
  if (!profile) {
    const featured = pool
      .filter((a) => a.featured)
      .sort((x, y) => y.created_at.localeCompare(x.created_at) || x.id.localeCompare(y.id))
    const rest = pool
      .filter((a) => !a.featured)
      .sort((x, y) => y.created_at.localeCompare(x.created_at) || x.id.localeCompare(y.id))
    const ordered = [...featured, ...rest].map((a) => ({ artwork: a, result: { adjusted_score: 0 } as ScoreResult }))
    const picked = rankAndDiversify(ordered as RankedItem<Artwork>[], limit, maxPerArtist)
    return {
      items: picked.map((p) => ({ artwork: p.artwork, result: null })),
      hiddenByBudget, hiddenBySize, total: pool.length, coldStart: true,
    }
  }

  const scored: RankedItem<Artwork>[] = pool.map((a) => ({
    artwork: a,
    result: scoreArtwork(
      profile,
      { ...a, comparison_price: comparisonPriceDollars(a) },
      affinity ? affinityBonusFor(a, affinity) : 0,
    ),
  }))

  const picked = rankAndDiversify(scored, limit, maxPerArtist)
  return {
    items: picked.map((p) => ({ artwork: p.artwork, result: p.result })),
    hiddenByBudget, hiddenBySize, total: pool.length, coldStart: false,
  }
}

function inBand(comparison: number, band: string): boolean {
  switch (band) {
    case 'under-25': return comparison <= 25
    case '25-50':    return comparison > 25 && comparison <= 50
    case '50-100':   return comparison > 50 && comparison <= 100
    case '100-200':  return comparison > 100 && comparison <= 200
    case '200-plus': return comparison > 200
    default:         return true
  }
}

/**
 * §41.1 — "Try loosening one thing: [Remove 'Oversized' — 14 pieces]".
 *
 * "Compute those counts. A generic 'try expanding your preferences' is not a
 *  design; naming the specific facet and its result count is."
 */
export interface FacetRelaxation { facet: keyof FeedFilters; label: string; count: number }

export function relaxationOptions(
  input: FeedInput,
  labelFor: (facet: keyof FeedFilters, values: string[]) => string,
): FacetRelaxation[] {
  const active = (Object.keys(input.filters ?? {}) as Array<keyof FeedFilters>)
    .filter((k) => Array.isArray(input.filters![k]) && (input.filters![k] as string[]).length > 0)

  const out: FacetRelaxation[] = []
  for (const facet of active) {
    const without = { ...input.filters, [facet]: undefined }
    const count = buildFeed({ ...input, filters: without, limit: 9999 }).total
    if (count > 0) {
      out.push({ facet, label: labelFor(facet, input.filters![facet] as string[]), count })
    }
  }
  return out.sort((a, b) => b.count - a.count)
}
