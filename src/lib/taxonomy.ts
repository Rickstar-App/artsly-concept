/**
 * CANONICAL TAXONOMY — PRD §9
 *
 * This module is the single source of truth for every enumerated value in the
 * product. The survey, artwork tags, filters, the Mystery form, the seed script,
 * and the database all use these exact slugs.
 *
 * NO COMPONENT MAY DEFINE ITS OWN OPTION LIST. (§9)
 *
 * Human-readable labels are a presentation concern and live only in the *_LABEL
 * maps below. `taxonomy.test.ts` is the regression test for v1.0's defect #1,
 * where survey strings and artwork tags silently disagreed and three of twelve
 * styles scored a permanent zero.
 *
 * Pure module: no I/O, no React, no database. (§43.2)
 */

// ---------------------------------------------------------------------------
// §9.1 Styles (12)
// ---------------------------------------------------------------------------
export const STYLES = [
  'abstract', 'minimalist', 'contemporary', 'impressionist',
  'photography', 'pop', 'landscape', 'portrait',
  'street', 'surreal', 'traditional', 'mixed-media',
] as const
export type Style = (typeof STYLES)[number]

export const STYLE_LABEL: Record<Style, string> = {
  'abstract': 'Abstract',
  'minimalist': 'Minimalist',
  'contemporary': 'Contemporary',
  'impressionist': 'Impressionist',
  'photography': 'Photography',
  'pop': 'Pop art',
  'landscape': 'Landscape',
  'portrait': 'Portrait',
  'street': 'Street art',
  'surreal': 'Surrealist',
  'traditional': 'Traditional',
  'mixed-media': 'Mixed media',
}

// ---------------------------------------------------------------------------
// §9.2 Colors (10)
// v1.0 had "Black & white" on the survey and "Black" + "White" on artwork.
// `monochrome` replaces all three.
// ---------------------------------------------------------------------------
export const COLORS = [
  'neutral', 'monochrome', 'blue', 'green', 'red',
  'orange', 'yellow', 'purple', 'earth', 'vibrant',
] as const
export type Color = (typeof COLORS)[number]

export const COLOR_LABEL: Record<Color, string> = {
  'neutral': 'Neutral',
  'monochrome': 'Black & white',
  'blue': 'Blue',
  'green': 'Green',
  'red': 'Red',
  'orange': 'Orange',
  'yellow': 'Yellow',
  'purple': 'Purple',
  'earth': 'Earth tones',
  'vibrant': 'Vibrant',
}

/** Swatches for survey/filter chips. Presentation only — never used in scoring. */
export const COLOR_SWATCH: Record<Color, string> = {
  'neutral': '#CFC7BC',
  'monochrome': 'linear-gradient(135deg,#1A1815 0 50%,#FFFFFF 50% 100%)',
  'blue': '#3E6B95',
  'green': '#4E7A55',
  'red': '#9C3B33',
  'orange': '#C97A38',
  'yellow': '#D6B24A',
  'purple': '#6B5591',
  'earth': '#8B6B4A',
  'vibrant': 'linear-gradient(120deg,#C0392B,#D6B24A,#3E6B95)',
}

// ---------------------------------------------------------------------------
// §9.3 Moods (7)
// v1.0's survey mood "Minimal" is DELETED — it is a style, not a mood, and it
// had no corresponding artwork tag.
// ---------------------------------------------------------------------------
export const MOODS = [
  'calm', 'energetic', 'sophisticated', 'cozy',
  'playful', 'dramatic', 'inspiring',
] as const
export type Mood = (typeof MOODS)[number]

export const MOOD_LABEL: Record<Mood, string> = {
  'calm': 'Calm',
  'energetic': 'Energetic',
  'sophisticated': 'Sophisticated',
  'cozy': 'Cozy',
  'playful': 'Playful',
  'dramatic': 'Dramatic',
  'inspiring': 'Inspiring',
}

// ---------------------------------------------------------------------------
// §9.4 Rooms (5 + wildcard)
// `any` is USER-SIDE ONLY. Never a valid artwork tag. Scores 0.5 (§12.3).
// ---------------------------------------------------------------------------
export const ROOMS = [
  'living-room', 'bedroom', 'office', 'dining-room', 'hallway',
] as const
export type Room = (typeof ROOMS)[number]

export const ROOM_WILDCARD = 'any' as const
export type UserRoom = Room | typeof ROOM_WILDCARD

/** Options for the survey and the Mystery form — includes the wildcard. */
export const USER_ROOMS = [...ROOMS, ROOM_WILDCARD] as const

export const ROOM_LABEL: Record<Room, string> = {
  'living-room': 'Living room',
  'bedroom': 'Bedroom',
  'office': 'Office',
  'dining-room': 'Dining room',
  'hallway': 'Hallway',
}

export const USER_ROOM_LABEL: Record<UserRoom, string> = {
  ...ROOM_LABEL,
  'any': 'Somewhere else / not sure',
}

// ---------------------------------------------------------------------------
// §9.5 Sizes (4) — defined by longest edge, in inches. MVP is 2D wall art only.
// ---------------------------------------------------------------------------
export const SIZES = ['small', 'medium', 'large', 'oversized'] as const
export type Size = (typeof SIZES)[number]

export const SIZE_LABEL: Record<Size, string> = {
  'small': 'Small',
  'medium': 'Medium',
  'large': 'Large',
  'oversized': 'Oversized',
}

/** Inch ranges shown inline on Q6 — most users do not know what "Large" means. */
export const SIZE_RANGE: Record<Size, string> = {
  'small': 'up to 18 in',
  'medium': '19–30 in',
  'large': '31–48 in',
  'oversized': '49 in and up',
}

/** Concrete wall guidance (§10, "Size guidance"). */
export const SIZE_HINT: Record<Size, string> = {
  'small': 'A shelf, a desk, a gallery cluster.',
  'medium': 'Above a console or a bedside table.',
  'large': 'Fills the wall above a sofa.',
  'oversized': 'A statement wall, floor to eye level.',
}

/** §9.5 — size_category is DERIVED from dimensions, never entered. */
export function sizeCategory(widthIn: number, heightIn: number): Size {
  const edge = Math.max(widthIn, heightIn)
  if (edge <= 18) return 'small'
  if (edge <= 30) return 'medium'
  if (edge <= 48) return 'large'
  return 'oversized'
}

/** Ordinal index for distance scoring (§9.5, §12.4). */
export const SIZE_INDEX: Record<Size, number> = {
  small: 0, medium: 1, large: 2, oversized: 3,
}

// ---------------------------------------------------------------------------
// §9.6 Boldness (1–10)
// ---------------------------------------------------------------------------
export const BOLDNESS_MIN = 1
export const BOLDNESS_MAX = 10
export const BOLDNESS_DEFAULT = 5

/** Drives `aria-valuetext` on the slider (§45). */
export function boldnessLabel(v: number): string {
  if (v <= 2) return 'very subtle'
  if (v <= 4) return 'fairly subtle'
  if (v <= 6) return 'balanced'
  if (v <= 8) return 'bold'
  return 'a statement piece'
}

// ---------------------------------------------------------------------------
// §9.7 Budget bands (5) — monthly.
// Compared against `comparison_price` (§7.2), never a term total.
// ---------------------------------------------------------------------------
export const BUDGET_BANDS = [
  'under-25', '25-50', '50-100', '100-200', '200-plus',
] as const
export type BudgetBand = (typeof BUDGET_BANDS)[number]

export const BUDGET_RANGE: Record<BudgetBand, { min: number; max: number; label: string }> = {
  'under-25': { min: 0,   max: 25,     label: 'Under $25/mo' },
  '25-50':    { min: 25,  max: 50,     label: '$25–$50/mo' },
  '50-100':   { min: 50,  max: 100,    label: '$50–$100/mo' },
  '100-200':  { min: 100, max: 200,    label: '$100–$200/mo' },
  '200-plus': { min: 200, max: 999999, label: '$200+/mo' },
}

export const BUDGET_LABEL: Record<BudgetBand, string> =
  Object.fromEntries(
    BUDGET_BANDS.map((b) => [b, BUDGET_RANGE[b].label]),
  ) as Record<BudgetBand, string>

/** Which band a monthly-equivalent dollar figure falls into. */
export function bandForMonthly(monthlyDollars: number): BudgetBand {
  for (const b of BUDGET_BANDS) {
    const { min, max } = BUDGET_RANGE[b]
    if (monthlyDollars >= min && monthlyDollars <= max) return b
  }
  return '200-plus'
}

// ---------------------------------------------------------------------------
// §9.8 Change frequency (5). Copy tone + nudge timing. NOT used in scoring.
// ---------------------------------------------------------------------------
export const CHANGE_FREQUENCIES = [
  'monthly', 'quarterly', 'biannual', 'annual', 'when-i-find-something',
] as const
export type ChangeFrequency = (typeof CHANGE_FREQUENCIES)[number]

export const CHANGE_FREQUENCY_LABEL: Record<ChangeFrequency, string> = {
  'monthly': 'Every month',
  'quarterly': 'Every 3 months',
  'biannual': 'Twice a year',
  'annual': 'Once a year',
  'when-i-find-something': 'When I find something I love',
}

// ---------------------------------------------------------------------------
// §9.9 Mystery piece type (3)
// ---------------------------------------------------------------------------
export const PIECE_TYPES = ['curated', 'custom', 'surprise'] as const
export type PieceType = (typeof PIECE_TYPES)[number]

export const PIECE_TYPE_LABEL: Record<PieceType, string> = {
  'curated': 'Curated',
  'custom': 'Custom',
  'surprise': 'Surprise me',
}

export const PIECE_TYPE_DESC: Record<PieceType, string> = {
  'curated': 'Chosen from our library of existing work by emerging artists.',
  'custom': 'Newly commissioned. An artist creates it for your brief.',
  'surprise': "We decide — existing or commissioned — whichever fits your brief best.",
}

// ---------------------------------------------------------------------------
// §22 Return reasons
// ---------------------------------------------------------------------------
export const RETURN_REASONS = ['different', 'space', 'style', 'price', 'other'] as const
export type ReturnReason = (typeof RETURN_REASONS)[number]

export const RETURN_REASON_LABEL: Record<ReturnReason, string> = {
  'different': 'I want something different',
  'space': "Didn't fit my space",
  'style': "Didn't like the style",
  'price': 'Too expensive',
  'other': 'Other',
}

// ---------------------------------------------------------------------------
// §23 State machines
// ---------------------------------------------------------------------------
export const ARTWORK_AVAILABILITY = ['available', 'reserved', 'rented', 'sold'] as const
export type ArtworkAvailability = (typeof ARTWORK_AVAILABILITY)[number]

export const RENTAL_STATUSES = ['active', 'ending', 'returned', 'purchased', 'cancelled'] as const
export type RentalStatus = (typeof RENTAL_STATUSES)[number]

export const RENTAL_SOURCES = ['library', 'swap', 'mystery'] as const
export type RentalSource = (typeof RENTAL_SOURCES)[number]

export const MYSTERY_STATUSES = ['matching', 'matched', 'active', 'cancelled', 'completed'] as const
export type MysteryStatus = (typeof MYSTERY_STATUSES)[number]

export const USER_ROLES = ['collector', 'artist', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

// ---------------------------------------------------------------------------
// §10 Selection caps.
// These are a PRODUCT decision, not a UI nicety: the overlap coefficient in
// §12.2 degrades toward noise if a user selects all twelve styles.
// ---------------------------------------------------------------------------
export const SURVEY_CAPS = {
  styles: { min: 1, max: 5 },
  colors: { min: 1, max: 4 },
  moods:  { min: 1, max: 3 },
} as const

export const MYSTERY_CAPS = {
  styles: { min: 1, max: 4 },
  colors: { min: 1, max: 4 },
} as const

// ---------------------------------------------------------------------------
// Rental terms (§7.2)
// ---------------------------------------------------------------------------
export const RENTAL_TERMS = [1, 3, 6, 12] as const
export type RentalTerm = (typeof RENTAL_TERMS)[number]

// ---------------------------------------------------------------------------
// Validators — used by Zod refinements, the seed validator, and the DB CHECKs.
// ---------------------------------------------------------------------------
const styleSet = new Set<string>(STYLES)
const colorSet = new Set<string>(COLORS)
const moodSet  = new Set<string>(MOODS)
const roomSet  = new Set<string>(ROOMS)

export const isStyle = (v: string): v is Style => styleSet.has(v)
export const isColor = (v: string): v is Color => colorSet.has(v)
export const isMood  = (v: string): v is Mood  => moodSet.has(v)
export const isRoom  = (v: string): v is Room  => roomSet.has(v)
export const isUserRoom = (v: string): v is UserRoom => roomSet.has(v) || v === ROOM_WILDCARD
export const isSize  = (v: string): v is Size  => (SIZES as readonly string[]).includes(v)

/** Generic label resolution for reason chips and "Why this piece" (§39). */
export function labelFor(kind: 'style' | 'color' | 'mood' | 'room' | 'size', slug: string): string {
  switch (kind) {
    case 'style': return STYLE_LABEL[slug as Style] ?? slug
    case 'color': return COLOR_LABEL[slug as Color] ?? slug
    case 'mood':  return MOOD_LABEL[slug as Mood] ?? slug
    case 'room':  return USER_ROOM_LABEL[slug as UserRoom] ?? slug
    case 'size':  return SIZE_LABEL[slug as Size] ?? slug
  }
}

/** Lowercase natural-language join: "Abstract and Contemporary". */
export function joinLabels(labels: string[], conj = 'and'): string {
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} ${conj} ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} ${conj} ${labels[labels.length - 1]}`
}
