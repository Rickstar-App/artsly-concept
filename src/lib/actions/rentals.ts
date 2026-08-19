'use server'

/**
 * RENTAL LIFECYCLE — PRD §17, §19, §20, §21, §22, §23.
 *
 * §23.3 CONCURRENCY: "Every transition that touches artworks.availability runs
 * inside a transaction that RE-READS AND RE-CHECKS availability first. This is
 * the only real correctness requirement in the MVP's backend, and it takes about
 * six lines. TWO LAPTOPS OPEN ON THE DEMO TABLE WILL FIND IT IF IT'S MISSING."
 *
 * `mutateSession` is that transaction: it reads the current state, hands a deep
 * clone to the mutator, and writes only if the mutator returns. A mutator that
 * throws leaves nothing behind — which is what §41.5 demands ("roll the
 * transaction back fully; never leave a rental with the artwork still
 * available").
 *
 * §32.3 — identity is derived server-side. NO FUNCTION HERE ACCEPTS A user_id.
 */

import { revalidatePath } from 'next/cache'
import { checkoutSchema, purchaseAddressSchema, fieldErrorsFrom } from '../schemas'
import { mutateSession, MutationError } from '../db/store'
import {
  addMonths, addDays, availabilityOverlay, daysRemaining, pushEvent, today,
} from '../db/state'
import { getArtwork } from '../db/catalog'
import { newId } from '../auth/crypto'
import { applyAffinity } from '../recommend/apply'
import { rentalTotalCents } from '../pricing/rental'
import { processPayment } from '../payments'
import {
  ARTIST_RENTAL_SHARE, ARTIST_SALE_SHARE, CANCEL_WINDOW_HOURS,
  EXTEND_GRACE_DAYS, MAX_CUMULATIVE_RENTAL_MONTHS,
} from '../pricing/config'
import { transitionArtwork, transitionRental } from '../state/machines'
import { friendly } from './error-copy'
import { RENTAL_TERMS, RETURN_REASONS, type RentalTerm } from '../taxonomy'
import type { Rental, ShippingAddress } from '../db/types'

export interface ActionResult<T = undefined> {
  ok: boolean
  error?: string
  /** §41.2 — the caller renders "This piece was just rented" instead of apologising after the fact. */
  code?: 'unavailable' | 'not-signed-in' | 'invalid' | 'illegal'
  fieldErrors?: Record<string, string>
  value?: T
}

// ---------------------------------------------------------------------------
// §17.3 — create a rental. THE availability re-check lives inside the mutation.
// ---------------------------------------------------------------------------

export async function createRental(
  artworkId: string,
  form: unknown,
  swapFromRentalId?: string | null,
): Promise<ActionResult<{ rentalId: string }>> {
  const parsed = checkoutSchema.safeParse(form)
  if (!parsed.success) {
    return { ok: false, code: 'invalid', error: 'Some details need another look.', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const art = getArtwork(artworkId)
  if (!art) return { ok: false, code: 'invalid', error: 'Unknown artwork.' }

  const f = parsed.data
  const priceCents = rentalTotalCents(art, f.term)

  // §43.6 — the payment seam. In the MVP this returns immediately; swapping in
  // Stripe later touches exactly this function and nothing else.
  const payment = await processPayment(priceCents, { kind: 'rental', artworkId, months: f.term })
  if (!payment.ok) {
    return { ok: false, error: 'Something went wrong — your rental was not created and you weren’t charged. Try again.' }
  }

  const res = await mutateSession((s) => {
    // ---- STEP 1 (§17.3): re-check availability INSIDE the transaction. -----
    // "It is the only thing preventing two demo browsers from renting the same
    //  piece." The state machine is consulted rather than an ad-hoc comparison,
    //  so an illegal transition is impossible by construction.
    const overlay = availabilityOverlay(s)
    const current = overlay.get(art.id) ?? art.availability
    try {
      transitionArtwork(current, 'rent')
    } catch {
      throw new MutationError('unavailable')
    }

    const address: ShippingAddress = {
      line1: f.line1, line2: f.line2 || null, city: f.city, state: f.state, zip: f.zip,
    }

    let outgoing: Rental | undefined
    if (swapFromRentalId) {
      // §20.2 — the swap transaction, in the SAME mutation as the new rental.
      outgoing = s.rentals.find((r) => r.id === swapFromRentalId && r.status === 'active')
      if (!outgoing) throw new MutationError('That rental is no longer active.')
      outgoing.status = transitionRental(outgoing.status, 'swap')
      outgoing.ended_at = today()
      outgoing.updated_at = new Date().toISOString()
      pushEvent(s, 'swap_completed', { artwork_id: outgoing.artwork_id, payload: { to: art.id } })
      pushEvent(s, 'return_started', { artwork_id: outgoing.artwork_id })
    }

    const start = today()
    const rental: Rental = {
      id: newId('rent_'),
      user_id: s.user.id,
      artwork_id: art.id,
      source: swapFromRentalId ? 'swap' : 'library',
      mystery_subscription_id: null,
      status: 'active',
      start_date: start,
      end_date: addMonths(start, f.term),
      ended_at: null,
      rental_period_months: f.term,
      price_cents: priceCents,
      artist_share_rate: ARTIST_RENTAL_SHARE,
      extensions: [],
      return_reason: null,
      return_note: null,
      contact_name: f.contact_name,
      contact_email: f.contact_email,
      shipping_address: address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    s.rentals.push(rental)

    pushEvent(s, 'rental_started', {
      artwork_id: art.id, artist_id: art.artist_id,
      payload: { months: f.term, price_cents: priceCents, source: rental.source },
    })
    // §13.2 — rent is +0.25 on every style/colour/mood tag.
    applyAffinity(s, 'rent', art)

    return { rentalId: rental.id }
  })

  if (!res.ok) {
    if (res.error === 'unavailable') {
      // §41.2 — "Must also fire on a checkout race. NEVER create the rental and
      // then apologise."
      return { ok: false, code: 'unavailable', error: 'This piece was just rented.' }
    }
    if (res.error === 'not-signed-in') return { ok: false, code: 'not-signed-in', error: 'Sign in to rent.' }
    return { ok: false, error: res.error }
  }

  revalidateAll()
  return { ok: true, value: res.value }
}

// ---------------------------------------------------------------------------
// §19 — Extend.
// ---------------------------------------------------------------------------

export async function extendRental(rentalId: string, months: RentalTerm): Promise<ActionResult> {
  if (!(RENTAL_TERMS as readonly number[]).includes(months)) {
    return { ok: false, code: 'invalid', error: 'Choose a term.' }
  }

  const res = await mutateSession((s) => {
    const rental = s.rentals.find((r) => r.id === rentalId)
    if (!rental) throw new MutationError('That rental no longer exists.')
    if (rental.source === 'mystery') throw new MutationError('Mystery pieces rotate — they can’t be extended.')

    // §19.1 — active only, up to 30 days past end_date.
    rental.status = transitionRental(rental.status, 'extend')
    if (daysRemaining(rental.end_date) < -EXTEND_GRACE_DAYS) {
      throw new MutationError('This rental ended more than 30 days ago.')
    }

    // §19.3 — cumulative cap.
    if (rental.rental_period_months + months > MAX_CUMULATIVE_RENTAL_MONTHS) {
      throw new MutationError(`Two years is the maximum. Maybe it should be yours.`)
    }

    const art = getArtwork(rental.artwork_id)
    if (!art) throw new MutationError('Unknown artwork.')

    // §19.2 — the STANDALONE ladder rate. No discount stacking, no proration,
    // no credit for the term already served.
    const priceCents = rentalTotalCents(art, months)

    // §19.2 — extends from the OLD END DATE, never from today. That is what
    // makes early extension safe: extending on day 2 doesn't lose 28 days.
    rental.end_date = addMonths(rental.end_date, months)
    rental.rental_period_months += months
    rental.price_cents += priceCents
    rental.extensions.push({ months, price_cents: priceCents, extended_at: new Date().toISOString() })
    rental.updated_at = new Date().toISOString()

    pushEvent(s, 'rental_extended', {
      artwork_id: rental.artwork_id, artist_id: art.artist_id,
      payload: { months, price_cents: priceCents, new_end_date: rental.end_date },
    })
  })

  if (!res.ok) return { ok: false, error: friendly(res.error) }
  revalidateAll()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// §22 — Return.
// ---------------------------------------------------------------------------

export async function returnRental(
  rentalId: string,
  reason?: string | null,
  note?: string | null,
): Promise<ActionResult> {
  const validReason = reason && (RETURN_REASONS as readonly string[]).includes(reason)
    ? (reason as (typeof RETURN_REASONS)[number])
    : null

  const res = await mutateSession((s) => {
    const rental = s.rentals.find((r) => r.id === rentalId)
    if (!rental) throw new MutationError('That rental no longer exists.')

    rental.status = transitionRental(rental.status, 'return')
    rental.ended_at = today()
    rental.return_reason = validReason
    // §42 — sanitise on write; escaped on render by React.
    rental.return_note = note ? note.slice(0, 200).replace(/[<>]/g, '') : null
    rental.updated_at = new Date().toISOString()

    const art = getArtwork(rental.artwork_id)
    pushEvent(s, 'return_started', { artwork_id: rental.artwork_id, payload: { reason: validReason } })
    pushEvent(s, 'return_completed', { artwork_id: rental.artwork_id })

    // §13.2 — ONLY "style" moves affinity. "different", "price" and "other" say
    // nothing about taste; "space" triggers the size prompt instead.
    if (validReason === 'style' && art) applyAffinity(s, 'return_style', art)
  })

  if (!res.ok) return { ok: false, error: friendly(res.error) }
  revalidateAll()
  return { ok: true }
}

/** §20.4 — `ending` → `returned` via an explicit user action on the outgoing card. */
export async function markReturned(rentalId: string): Promise<ActionResult> {
  const res = await mutateSession((s) => {
    const rental = s.rentals.find((r) => r.id === rentalId)
    if (!rental) throw new MutationError('That rental no longer exists.')
    rental.status = transitionRental(rental.status, 'confirm_returned')
    rental.updated_at = new Date().toISOString()
  })
  if (!res.ok) return { ok: false, error: friendly(res.error) }
  revalidateAll()
  return { ok: true }
}

/** §17.5 — cancel within 24 hours of checkout, while notionally pre-shipment. */
export async function cancelRental(rentalId: string): Promise<ActionResult> {
  const res = await mutateSession((s) => {
    const rental = s.rentals.find((r) => r.id === rentalId)
    if (!rental) throw new MutationError('That rental no longer exists.')
    const hours = (Date.now() - Date.parse(rental.created_at)) / 3_600_000
    if (hours > CANCEL_WINDOW_HOURS) {
      throw new MutationError('The 24-hour cancellation window has passed — send it back instead.')
    }
    rental.status = transitionRental(rental.status, 'cancel')
    rental.ended_at = today()
    rental.updated_at = new Date().toISOString()
    pushEvent(s, 'rental_cancelled', { artwork_id: rental.artwork_id })
  })
  if (!res.ok) return { ok: false, error: friendly(res.error) }
  revalidateAll()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// §21 — Purchase.
// ---------------------------------------------------------------------------

export async function purchaseArtwork(artworkId: string, form?: unknown): Promise<ActionResult> {
  const art = getArtwork(artworkId)
  if (!art) return { ok: false, code: 'invalid', error: 'Unknown artwork.' }

  const address = parseAddress(form)

  const payment = await processPayment(art.purchase_price_cents, { kind: 'purchase', artworkId })
  if (!payment.ok) {
    return { ok: false, error: 'Something went wrong — nothing was purchased and you weren’t charged.' }
  }

  const res = await mutateSession((s) => {
    const overlay = availabilityOverlay(s)
    const current = overlay.get(art.id) ?? art.availability
    const mine = s.rentals.find((r) => r.artwork_id === art.id && r.status === 'active')

    // §21.3 — ONLY the current renter may buy a rented piece.
    if (current === 'rented' && !mine) throw new MutationError('unavailable')
    if (current === 'sold') throw new MutationError('unavailable')
    transitionArtwork(current, 'buy')

    pushEvent(s, 'purchase_started', { artwork_id: art.id, artist_id: art.artist_id })

    if (mine) {
      mine.status = transitionRental(mine.status, 'buy')
      mine.ended_at = today()
      mine.updated_at = new Date().toISOString()
    }

    s.purchases.push({
      id: newId('buy_'),
      user_id: s.user.id,
      artwork_id: art.id,
      rental_id: mine?.id ?? null,
      price_cents: art.purchase_price_cents,
      artist_share_rate: ARTIST_SALE_SHARE,
      shipping_address: address ?? mine?.shipping_address ?? FALLBACK_ADDRESS,
      created_at: new Date().toISOString(),
    })

    pushEvent(s, 'purchase_completed', {
      artwork_id: art.id, artist_id: art.artist_id,
      payload: { price_cents: art.purchase_price_cents },
    })
    // §13.2 — purchase is the strongest signal at +0.35.
    applyAffinity(s, 'purchase', art)
  })

  if (!res.ok) {
    if (res.error === 'unavailable') return { ok: false, code: 'unavailable', error: 'This piece is no longer available.' }
    return { ok: false, error: friendly(res.error) }
  }
  revalidateAll()
  return { ok: true }
}

// ---------------------------------------------------------------------------

const FALLBACK_ADDRESS: ShippingAddress = { line1: '—', line2: null, city: '—', state: '—', zip: '00000' }

function parseAddress(form: unknown): ShippingAddress | null {
  const r = purchaseAddressSchema.safeParse(form)
  if (!r.success) return null
  return { line1: r.data.line1, line2: r.data.line2 || null, city: r.data.city, state: r.data.state, zip: r.data.zip }
}

function revalidateAll() {
  revalidatePath('/my-space')
  revalidatePath('/my-space/saved')
  revalidatePath('/discover')
  revalidatePath('/profile')
  revalidatePath('/artist-dashboard')
  revalidatePath('/', 'layout')
}

/** Exposed for the extend UI so it can preview dates without a round trip. */
export async function previewExtension(currentEnd: string, months: number): Promise<string> {
  return addMonths(currentEnd, months)
}

void addDays
