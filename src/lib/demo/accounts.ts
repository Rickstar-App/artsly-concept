/**
 * DEMO ACCOUNTS — PRD §38.
 *
 * §32.1 resolves v1.0's contradiction between "demo mode is acceptable" (§26)
 * and "users can only modify their own profile/rentals/preferences" (§44):
 *
 *   DEMO MODE IS A REAL SIGN-IN.
 *
 * The homepage buttons authenticate genuine seeded accounts with a password
 * from `DEMO_USER_PASSWORD`. Nothing is bypassed, ownership checks stay on, and
 * the demo cannot be derailed by an auth bug that only exists on the demo path.
 */

import type { UserPreferences } from '../db/types'
import { BUDGET_RANGE } from '../taxonomy'

export const DEMO_EMAILS = {
  collector: 'alex@demo.art',
  artist: 'maya@demo.art',
} as const

export interface DemoAccount {
  id: string
  email: string
  display_name: string
  role: 'collector' | 'artist'
  /** Set for the artist account — links to the `artists` row (§32.2). */
  artist_id?: string
  label: string
  sublabel: string
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-alex',
    email: DEMO_EMAILS.collector,
    display_name: 'Alex Rivera',
    role: 'collector',
    label: 'Sign in as Alex (demo)',
    sublabel: 'Collector · living room, abstract, $50–$100/mo',
  },
  {
    id: 'demo-maya',
    email: DEMO_EMAILS.artist,
    display_name: 'Maya Puterman',
    role: 'artist',
    artist_id: 'maya-puterman',
    label: 'Sign in as Maya (artist demo)',
    sublabel: 'Artist · rental and sale earnings at the 60/70 split',
  },
]

/**
 * §38.1 — Alex's taste profile.
 *
 * The budget band is `50-100`, a REAL band. v1.0's "$25–$75" matched none of
 * the five bands in its own survey (§0.1 defect #24).
 *
 * These values must score "Blue Horizon" at 100 and "Ferry Light" at 49
 * (§12.7). `seed.test.ts` asserts it against the committed catalogue.
 */
export const ALEX_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  room: 'living-room',
  styles: ['abstract', 'contemporary', 'minimalist'],
  colors: ['blue', 'neutral'],
  moods: ['calm', 'sophisticated'],
  size_preference: 'large',
  boldness: 4,
  budget_band: '50-100',
  budget_min_cents: BUDGET_RANGE['50-100'].min * 100,
  budget_max_cents: BUDGET_RANGE['50-100'].max * 100,
  change_frequency: 'quarterly',
}

/**
 * §38.1 — "Seed 3 saved pieces and 1 returned rental so Past Art and Saved
 * aren't empty on first view, but LEAVE THE CURRENT RENTAL EMPTY — the demo's
 * first act is renting Blue Horizon, and a pre-filled dashboard steals that
 * beat."
 */
export const ALEX_SAVED_SLUGS = ['tidal-register', 'margin', 'ridge-5-40'] as const
export const ALEX_PAST_RENTAL_SLUG = 'verdigris'

export function demoAccountByEmail(email: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
}
