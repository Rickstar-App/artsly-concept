/**
 * ROW TYPES — mirrors `supabase/migrations/0001_init.sql` exactly (PRD §31).
 *
 * ONE canonical schema. v1.0's §9 artwork model and §25 `artworks` table
 * disagreed on nearly every field name — `style`+`genres[]` vs `styles[]`,
 * `room_types[]` vs `rooms[]`, `boldness_score` vs `boldness`,
 * `rental_price_1_month` vs `rental_price_1m`, `availability_status` vs
 * `status`. There is exactly one name for each column here, and it is the SQL
 * name. `genres[]` and `depth` are deleted (§0.1 #5).
 */

import type {
  ArtworkAvailability, BudgetBand, ChangeFrequency, Color, Mood, MysteryStatus,
  PieceType, RentalSource, RentalStatus, ReturnReason, Room, Size, Style,
  UserRole, UserRoom,
} from '../taxonomy'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface UserPreferences {
  id: string
  user_id: string
  room: UserRoom              // §10 Q1 is SINGLE-select. `text`, not `text[]`.
  styles: Style[]
  colors: Color[]
  moods: Mood[]
  size_preference: Size
  boldness: number
  budget_band: BudgetBand
  budget_min_cents: number
  budget_max_cents: number
  change_frequency: ChangeFrequency
  created_at: string
  updated_at: string
}

export interface UserAffinityRow {
  user_id: string
  tag_type: 'style' | 'color' | 'mood'
  tag: string
  weight: number
  updated_at: string
}

export interface Artist {
  id: string
  user_id: string | null      // §32.2 null for seeded fictional artists
  name: string
  slug: string
  tagline: string | null
  bio: string | null
  location: string | null
  profile_image_url: string | null
  mediums: string[]
  styles: Style[]
  commission_available: boolean
  is_fictional: boolean       // drives the §37.4 disclosure
  created_at: string
  updated_at: string
}

export interface Artwork {
  id: string
  artist_id: string
  title: string
  slug: string
  description: string | null
  artist_note: string | null
  image_url: string
  thumbnail_url: string
  blur_data_url: string | null
  image_credit: string | null   // required when the image is licensed, not generated
  alt_text: string              // §45 "{title} by {artist} — {medium}, {styles}"
  medium: string
  materials: string | null
  year_created: number | null
  styles: Style[]
  colors: Color[]
  moods: Mood[]
  rooms: Room[]                 // §9.4 never empty, NEVER 'any'
  boldness: number
  width_in: number
  height_in: number
  size_category: Size           // §9.5 derived, not entered
  rental_1m_cents: number
  rental_3m_cents: number
  rental_6m_cents: number
  rental_12m_cents: number
  purchase_price_cents: number
  availability: ArtworkAvailability
  featured: boolean
  created_at: string
  updated_at: string
}

export interface ShippingAddress {
  line1: string
  line2?: string | null
  city: string
  state: string
  zip: string
}

export interface RentalExtension {
  months: number
  price_cents: number
  extended_at: string
}

export interface Rental {
  id: string
  user_id: string
  artwork_id: string
  source: RentalSource
  mystery_subscription_id: string | null
  status: RentalStatus
  start_date: string           // ISO date
  end_date: string             // ISO date
  ended_at: string | null
  rental_period_months: number // cumulative; extensions sum (§19.4)
  price_cents: number          // 0 for source='mystery' (§26.3)
  artist_share_rate: number    // snapshotted (§7.3)
  extensions: RentalExtension[]
  return_reason: ReturnReason | null
  return_note: string | null
  contact_name: string
  contact_email: string
  shipping_address: ShippingAddress
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  artwork_id: string
  rental_id: string | null
  price_cents: number
  artist_share_rate: number
  shipping_address: ShippingAddress
  created_at: string
}

export interface Favorite {
  id: string
  user_id: string
  artwork_id: string
  created_at: string
}

export interface MysterySubscription {
  id: string
  user_id: string
  piece_type: PieceType
  number_of_pieces: number
  size: Size                   // resolved from custom dims if given
  custom_width_in: number | null
  custom_height_in: number | null
  styles: Style[]
  colors: Color[]
  room: UserRoom
  boldness: number
  budget_band: BudgetBand
  budget_min_cents: number
  budget_max_cents: number
  special_requests: string | null
  monthly_price_cents: number
  pricing_config_version: string
  status: MysteryStatus
  cycle: number
  minimum_term_months: number
  current_period_start: string
  current_period_end: string
  next_rotation_at: string
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface MysteryMatch {
  id: string
  subscription_id: string
  cycle: number
  kind: 'curated' | 'commission'
  artist_id: string
  artwork_id: string | null    // null for commissions (§27.3)
  match_score: number
  selected: boolean
  revealed_at: string | null
  created_at: string
}

/** §40 — the single analytics + behaviour log. NO PII in the payload (§42). */
export interface EventRow {
  id: number
  user_id: string | null
  artwork_id: string | null
  artist_id: string | null
  event_type: EventType
  payload: Record<string, unknown>
  created_at: string
}

/** §40 — the complete event vocabulary. */
export const EVENT_TYPES = [
  'onboarding_started', 'onboarding_completed', 'preferences_updated',
  'preference_auto_added', 'preference_auto_removed',
  'artwork_viewed', 'artwork_saved', 'artwork_unsaved',
  'artwork_skipped', 'search_performed', 'filter_applied',
  'rental_started', 'rental_extended', 'rental_cancelled',
  'swap_started', 'swap_completed',
  'purchase_started', 'purchase_completed',
  'return_started', 'return_completed',
  'mystery_form_started', 'mystery_form_step_completed', 'mystery_quote_viewed',
  'mystery_subscription_created', 'mystery_revealed', 'mystery_rotated',
  'mystery_subscription_cancelled',
  'artist_viewed', 'artist_commission_requested',
  'artwork_published', 'artwork_price_updated',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

// ---------------------------------------------------------------------------
// View models — what pages actually receive.
// §44: the feed query returns only the columns a card needs, never `select *`
// across 60 artworks with full descriptions.
// ---------------------------------------------------------------------------

export interface ArtworkWithArtist extends Artwork {
  artist: Pick<Artist, 'id' | 'name' | 'slug' | 'location' | 'profile_image_url' | 'commission_available' | 'is_fictional' | 'tagline'>
}
