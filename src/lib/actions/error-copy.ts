/**
 * USER-FACING ERROR COPY.
 *
 * Deliberately NOT a `'use server'` module: it holds a synchronous helper, and a
 * server-action file may only export async functions. Keeping it separate also
 * lets `state-machine.test.ts` assert that no internals reach a user.
 */

/**
 * §41.5 — an error must state what happened, what it cost the user, and what to
 * do next. `IllegalTransition` messages read like
 * `rental: cannot "extend" from "ending"` — accurate, and useless to a person.
 * They are internals, so they are translated here rather than rendered.
 */
export function friendly(error?: string): string {
  if (!error || error === 'unknown-error') return 'Something went wrong. Nothing was charged. Try again.'
  if (error === 'not-signed-in') return 'Sign in first — rentals belong to an account.'

  const illegal = /^(rental|artwork|mystery): cannot "(\w+)" from "(\w+)"$/.exec(error)
  if (illegal) {
    const [, , event, from] = illegal
    switch (from) {
      case 'ending':    return 'That piece is already on its way back to the artist.'
      case 'returned':  return 'That rental has already ended.'
      case 'purchased': return 'You own that piece — there’s nothing left to change.'
      case 'cancelled': return 'That rental was cancelled.'
      case 'sold':      return 'That piece has sold.'
      case 'rented':    return 'That piece is in someone’s home right now.'
      default:          return `You can’t ${event} this right now.`
    }
  }
  // MutationError messages are authored for the user and pass through.
  return error
}

/** Test-only alias, so the intent of importing this is obvious in the suite. */
export const __friendlyForTest = friendly
