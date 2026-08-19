/**
 * CUSTOM ARTIST MATCHING — PRD §27.1.
 *
 *   artist_match(artist, brief) =
 *     mean( top 3 §12 scores among that artist's artworks, scored against the brief )
 *
 * "Eligible artists: commission_available = true and AT LEAST 3 PUBLISHED
 *  ARTWORKS. Display as a whole percentage. v1.0 showed '94% match' with NO
 *  DEFINITION BEHIND IT." (§27.1)
 */

import { scoreArtwork, type ScoreProfile } from './score'
import type { Artist, Artwork } from '../db/types'
import { comparisonPriceDollars } from '../pricing/rental'

export interface ArtistMatch {
  artist: Artist
  score: number
  topWorks: Artwork[]
}

export function matchArtists(
  brief: ScoreProfile,
  artists: readonly Artist[],
  worksOf: (artistId: string) => readonly Artwork[],
  k = 3,
): ArtistMatch[] {
  const eligible = artists.filter((a) => a.commission_available && worksOf(a.id).length >= 3)

  return eligible
    .map((artist) => {
      const scored = worksOf(artist.id)
        .map((w) => ({
          w,
          s: scoreArtwork(brief, { ...w, comparison_price: comparisonPriceDollars(w) }).adjusted_score,
        }))
        .sort((x, y) => y.s - x.s || x.w.id.localeCompare(y.w.id))

      const top3 = scored.slice(0, 3)
      const mean = top3.reduce((sum, x) => sum + x.s, 0) / Math.max(1, top3.length)

      return { artist, score: Math.round(mean * 100), topWorks: top3.map((x) => x.w) }
    })
    // Deterministic — never random (§12.10).
    .sort((a, b) => b.score - a.score || a.artist.id.localeCompare(b.artist.id))
    .slice(0, k)
}
