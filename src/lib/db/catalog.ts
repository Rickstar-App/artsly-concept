/**
 * CATALOGUE — the immutable half of the data model.
 *
 * Artists and artworks are committed seed data (`src/data/catalog.json`),
 * produced by `scripts/seed/build.ts` and gated by `scripts/validate-seed.ts`.
 * Loaded once per server process.
 *
 * §44 — the feed must never `select *` across 60 artworks with full
 * descriptions; `cardFields()` is the projection every grid uses.
 */

import catalogJson from '@/data/catalog.json'
import type { Artist, Artwork, ArtworkWithArtist } from './types'
import { comparisonPriceDollars, fromPriceCents } from '../pricing/rental'
import type { ScoreArtwork } from '../recommend/score'

interface BaselineRental {
  id: string; artwork_id: string; artist_id: string; collector: string
  months: number; start_date: string; end_date: string
  price_cents: number; artist_share_rate: number; source: string
}
interface BaselinePurchase {
  id: string; artwork_id: string; artist_id: string; collector: string
  price_cents: number; artist_share_rate: number; created_at: string
}

const raw = catalogJson as unknown as {
  generated_at: string
  artists: Artist[]
  artworks: Artwork[]
  baseline_rentals: BaselineRental[]
  baseline_purchases: BaselinePurchase[]
}

export const ARTISTS: readonly Artist[] = Object.freeze(raw.artists)
export const ARTWORKS: readonly Artwork[] = Object.freeze(raw.artworks)
export const BASELINE_RENTALS: readonly BaselineRental[] = Object.freeze(raw.baseline_rentals)
export const BASELINE_PURCHASES: readonly BaselinePurchase[] = Object.freeze(raw.baseline_purchases)

const artistById = new Map(ARTISTS.map((a) => [a.id, a]))
const artistBySlug = new Map(ARTISTS.map((a) => [a.slug, a]))
const artworkById = new Map(ARTWORKS.map((a) => [a.id, a]))
const artworkBySlug = new Map(ARTWORKS.map((a) => [a.slug, a]))
const worksByArtist = new Map<string, Artwork[]>()
for (const a of ARTWORKS) {
  if (!worksByArtist.has(a.artist_id)) worksByArtist.set(a.artist_id, [])
  worksByArtist.get(a.artist_id)!.push(a)
}

export const getArtist = (id: string) => artistById.get(id)
export const getArtistBySlug = (slug: string) => artistBySlug.get(slug)
export const getArtwork = (id: string) => artworkById.get(id)
export const getArtworkBySlug = (slug: string) => artworkBySlug.get(slug)
export const worksOf = (artistId: string): readonly Artwork[] => worksByArtist.get(artistId) ?? []

/** Public artist projection carried on every artwork card (§6.5). */
export function artistBrief(artistId: string): ArtworkWithArtist['artist'] {
  const a = artistById.get(artistId)
  if (!a) throw new Error(`Unknown artist "${artistId}"`)
  return {
    id: a.id, name: a.name, slug: a.slug, location: a.location,
    profile_image_url: a.profile_image_url, commission_available: a.commission_available,
    is_fictional: a.is_fictional, tagline: a.tagline,
  }
}

export function withArtist(a: Artwork): ArtworkWithArtist {
  return { ...a, artist: artistBrief(a.artist_id) }
}

/** The shape §12 scores against. `comparison_price` is in DOLLARS (§7.2). */
export function scorable(a: Artwork): ScoreArtwork {
  return {
    id: a.id, artist_id: a.artist_id,
    styles: a.styles, colors: a.colors, moods: a.moods, rooms: a.rooms,
    boldness: a.boldness, size_category: a.size_category,
    comparison_price: comparisonPriceDollars(a),
  }
}

/** §14.2 — the "From $49/mo" figure. */
export const fromPrice = (a: Artwork) => fromPriceCents(a)

/** §29.1 — case-insensitive substring across title, artist, medium, tag labels. */
export function searchIndex(a: Artwork): string {
  const artist = artistById.get(a.artist_id)
  return [
    a.title, artist?.name, a.medium, a.materials,
    ...a.styles, ...a.colors, ...a.moods, ...a.rooms, a.size_category,
  ].filter(Boolean).join(' ').toLowerCase()
}

const searchCache = new Map(ARTWORKS.map((a) => [a.id, searchIndex(a)]))
export const searchBlob = (id: string) => searchCache.get(id) ?? ''

export const CATALOG_GENERATED_AT = raw.generated_at
