/**
 * SESSION STORE — cookie I/O for the mutable half of the model.
 *
 * §32.3 — "Every mutation goes through a Next.js server action that re-derives
 * `auth.uid()` server-side. NEVER TRUST A `user_id` SENT FROM THE CLIENT."
 *
 * That constraint is enforced structurally here: the only way to obtain a
 * session is `readSession()`, which decodes an HMAC-signed httpOnly cookie the
 * client cannot forge. No function in this module accepts a user id.
 *
 * Node runtime only.
 */

import 'server-only'
import { cookies } from 'next/headers'
import { seal, unseal, newId } from '../auth/crypto'
import { emptyState, isValidState, type SessionState } from './state'
import type { UserRole } from '../taxonomy'

export const SESSION_COOKIE = 'artsly_session'

/** Browsers cap a cookie at ~4 KB including name and attributes. */
const MAX_COOKIE_BYTES = 3_800

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
} as const

export async function readSession(): Promise<SessionState | null> {
  const jar = await cookies()
  const raw = jar.get(SESSION_COOKIE)?.value
  const state = unseal<SessionState>(raw)
  return isValidState(state) ? state : null
}

/**
 * Persist a session. Callable only from server actions and route handlers —
 * Next.js forbids writing cookies during a server-component render, which is
 * also why §20.4's auto-return is DERIVED at read time (see `state.ts`) rather
 * than written during a page render.
 */
export async function writeSession(state: SessionState): Promise<void> {
  let token = seal(state)

  // Under pressure, shed the event log before anything the user can see.
  // §40 makes the log P0 and reporting P2, so a truncated log is the correct
  // thing to lose; a dropped rental is not.
  if (token.length > MAX_COOKIE_BYTES && state.events.length > 0) {
    const trimmed: SessionState = { ...state, events: state.events.slice(-20) }
    token = seal(trimmed)
    if (token.length > MAX_COOKIE_BYTES) token = seal({ ...trimmed, events: [] })
  }

  if (token.length > MAX_COOKIE_BYTES) {
    // Never silently drop a write. Loud, and still best-effort.
    console.warn(`[artsly] session cookie is ${token.length}B, above the ${MAX_COOKIE_BYTES}B budget.`)
  }

  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, COOKIE_OPTIONS)
}

export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export interface NewSessionInput {
  id?: string
  email: string
  display_name: string
  role: UserRole
  artist_id?: string
}

export function freshState(input: NewSessionInput): SessionState {
  return emptyState({
    id: input.id ?? newId('u_'),
    email: input.email,
    display_name: input.display_name,
    role: input.role,
    artist_id: input.artist_id,
    created_at: new Date().toISOString(),
  })
}

/**
 * Read → mutate → write, in one call.
 *
 * Every mutation in the product goes through this function, which is the
 * closest a cookie-backed store gets to §17.3's "server action, in one
 * transaction". The mutator receives the CURRENT state; if it throws, nothing
 * is written, which is what §41.5 requires ("roll the transaction back fully;
 * never leave a rental with the artwork still available").
 */
export async function mutateSession<T>(
  fn: (state: SessionState) => T | Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const state = await readSession()
  if (!state) return { ok: false, error: 'not-signed-in' }

  // Deep clone so a throwing mutator cannot leave a half-applied state behind.
  const draft: SessionState = structuredClone(state)
  try {
    const value = await fn(draft)
    draft.user = state.user // identity is never mutable from a mutator
    await writeSession(draft)
    return { ok: true, value }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown-error' }
  }
}

/** Thrown by mutators to abort with a message the UI can render. */
export class MutationError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = 'MutationError'
  }
}
