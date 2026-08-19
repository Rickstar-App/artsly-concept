'use server'

/**
 * AUTH SERVER ACTIONS — PRD §32, §38.3.
 *
 * §32.1 — "Demo mode is a REAL SIGN-IN. The homepage carries a 'Sign in as
 * Alex (demo)' button that authenticates a genuine seeded account with a known
 * password from an env var. Nothing is bypassed... and the demo can't be
 * derailed by an auth bug that only exists on the demo path."
 *
 * There is therefore no `signInWithoutPassword`, no `?demo=1` query parameter,
 * and no bypass branch anywhere in this file.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkPassword } from './crypto'
import { clearSession, freshState, readSession, writeSession } from '../db/store'
import { demoAccountByEmail, ALEX_PREFERENCES, ALEX_SAVED_SLUGS, ALEX_PAST_RENTAL_SLUG } from '../demo/accounts'
import { pushEvent, addMonths, addDays, today } from '../db/state'
import { getArtworkBySlug } from '../db/catalog'
import { newId } from './crypto'
import type { SessionState } from '../db/state'

export interface AuthResult { ok: boolean; error?: string }

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const account = demoAccountByEmail(email)
  // Constant-shape failure: never reveal whether the address exists.
  if (!account || !checkPassword(password)) {
    return { ok: false, error: 'That email and password don’t match an account.' }
  }

  const state = freshState({
    id: account.id,
    email: account.email,
    display_name: account.display_name,
    role: account.role,
    artist_id: account.artist_id,
  })

  if (account.role === 'collector') seedAlex(state)
  pushEvent(state, 'onboarding_started', { payload: { source: 'demo-signin' } })

  await writeSession(state)
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function signOut(): Promise<void> {
  await clearSession()
  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * §38.4 — `demo:reset` "restores both accounts to their starting state... Run it
 * between every rehearsal. A demo that only works on a fresh database is a demo
 * that fails the second time it's given."
 *
 * In the session driver this is instantaneous and scoped to the current
 * browser, which is exactly right: two laptops on the demo table stay
 * independent, which is what §46.2's two-browser inventory test wants.
 */
export async function resetDemo(): Promise<void> {
  const current = await readSession()
  if (!current) redirect('/')

  const account = demoAccountByEmail(current.user.email)
  const state = freshState({
    id: current.user.id,
    email: current.user.email,
    display_name: current.user.display_name,
    role: current.user.role,
    artist_id: current.user.artist_id,
  })
  if (account?.role === 'collector') seedAlex(state)

  await writeSession(state)
  revalidatePath('/', 'layout')
  redirect('/my-space')
}

/**
 * §38.1 — "Seed 3 saved pieces and 1 returned rental so Past Art and Saved
 * aren't empty on first view, but LEAVE THE CURRENT RENTAL EMPTY — the demo's
 * first act is renting Blue Horizon, and a pre-filled dashboard steals that
 * beat."
 */
function seedAlex(state: SessionState): void {
  state.preferences = {
    id: newId('pref_'),
    user_id: state.user.id,
    ...ALEX_PREFERENCES,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  for (const slug of ALEX_SAVED_SLUGS) {
    const art = getArtworkBySlug(slug)
    if (!art) continue
    state.favorites.push({
      id: newId('fav_'), user_id: state.user.id, artwork_id: art.id,
      created_at: new Date(Date.now() - 86_400_000 * (3 + state.favorites.length)).toISOString(),
    })
  }

  const past = getArtworkBySlug(ALEX_PAST_RENTAL_SLUG)
  if (past) {
    const start = addDays(today(), -190)
    state.rentals.push({
      id: newId('rent_'),
      user_id: state.user.id,
      artwork_id: past.id,
      source: 'library',
      mystery_subscription_id: null,
      status: 'returned',
      start_date: start,
      end_date: addMonths(start, 3),
      ended_at: addMonths(start, 3),
      rental_period_months: 3,
      price_cents: past.rental_3m_cents,
      artist_share_rate: 0.6,
      extensions: [],
      return_reason: 'different',
      return_note: null,
      contact_name: state.user.display_name,
      contact_email: state.user.email,
      shipping_address: { line1: '414 Rosewood Ave', line2: 'Apt 3B', city: 'Durham', state: 'NC', zip: '27701' },
      created_at: new Date(Date.parse(start)).toISOString(),
      updated_at: new Date(Date.parse(addMonths(start, 3))).toISOString(),
    })
  }
}
