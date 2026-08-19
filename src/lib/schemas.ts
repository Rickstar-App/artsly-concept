/**
 * INPUT SCHEMAS — PRD §42.
 *
 * "Validate every input SERVER-SIDE with a schema validator (Zod). Client
 *  validation is UX, NEVER enforcement."
 *
 * These live outside `lib/actions/` because a `'use server'` module may only
 * export async functions — a schema object is not one. Keeping them here also
 * lets client components import the same shapes for optimistic validation,
 * which is exactly the "shared between client and server" §43.1 asks for.
 *
 * Every enum below is DERIVED from §9 rather than restated, so a taxonomy change
 * cannot leave a validator behind.
 */

import { z } from 'zod'
import {
  BUDGET_BANDS, CHANGE_FREQUENCIES, COLORS, MOODS, MYSTERY_CAPS, PIECE_TYPES,
  RENTAL_TERMS, ROOMS, ROOM_WILDCARD, SIZES, STYLES, SURVEY_CAPS,
  type RentalTerm,
} from './taxonomy'

/** §10 — the eight-question survey. Caps are a PRODUCT decision (§10). */
export const preferencesSchema = z.object({
  room: z.enum([...ROOMS, ROOM_WILDCARD]),
  styles: z.array(z.enum(STYLES)).min(SURVEY_CAPS.styles.min).max(SURVEY_CAPS.styles.max),
  colors: z.array(z.enum(COLORS)).min(SURVEY_CAPS.colors.min).max(SURVEY_CAPS.colors.max),
  moods: z.array(z.enum(MOODS)).min(SURVEY_CAPS.moods.min).max(SURVEY_CAPS.moods.max),
  boldness: z.coerce.number().int().min(1).max(10),
  size_preference: z.enum(SIZES),
  change_frequency: z.enum(CHANGE_FREQUENCIES),
  budget_band: z.enum(BUDGET_BANDS),
})
export type PreferencesInput = z.infer<typeof preferencesSchema>

/** §17.1 — checkout. */
export const checkoutSchema = z.object({
  contact_name: z.string().trim().min(2, 'Enter a name of at least 2 characters').max(80, 'Keep it under 80 characters'),
  contact_email: z.string().trim().email('Enter a valid email address'),
  line1: z.string().trim().min(1, 'Enter a street address'),
  line2: z.string().trim().max(80).optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Enter a city'),
  state: z.string().trim().length(2, 'Use the 2-letter state code').transform((s) => s.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
  term: z.coerce.number().refine(
    (n): n is RentalTerm => (RENTAL_TERMS as readonly number[]).includes(n),
    'Choose a rental term',
  ),
})
export type CheckoutInput = z.infer<typeof checkoutSchema>

/** §21 — purchase reuses the address half of checkout. */
export const purchaseAddressSchema = checkoutSchema.omit({
  term: true, contact_name: true, contact_email: true,
})

/** §24.3 — the nine-step Mystery brief. */
export const briefSchema = z.object({
  piece_type: z.enum(PIECE_TYPES),
  // A STEPPER capped at 4, not v1.0's "4+" — the pricing formula multiplies by
  // this value and "4+" is not a number (§0.1 defect #13).
  number_of_pieces: z.coerce.number().int().min(1).max(4),
  size: z.enum([...SIZES, 'custom']),
  custom_width_in: z.coerce.number().positive().max(400).optional().nullable(),
  custom_height_in: z.coerce.number().positive().max(400).optional().nullable(),
  colors: z.array(z.enum(COLORS)).min(MYSTERY_CAPS.colors.min).max(MYSTERY_CAPS.colors.max),
  styles: z.array(z.enum(STYLES)).min(MYSTERY_CAPS.styles.min).max(MYSTERY_CAPS.styles.max),
  room: z.enum([...ROOMS, ROOM_WILDCARD]),
  boldness: z.coerce.number().int().min(1).max(10),
  budget_band: z.enum(BUDGET_BANDS),
  special_requests: z.string().max(500).optional().nullable(),
  preferred_artist: z.string().optional().nullable(),
})
export type BriefInput = z.infer<typeof briefSchema>

/** §41.3 — "Name the field, state what's wrong." One shared shape. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
