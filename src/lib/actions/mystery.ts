'use server'

/**
 * MYSTERY ART — PRD §24, §25, §26, §27.
 *
 * §26.1 resolves v1.0's self-contradiction ("your first pieces will appear once
 * they're ready" vs "for the demo, immediately assign existing artworks"):
 *
 *   MATCH INSTANTLY. REVEAL DELIBERATELY.
 *   "THE REVEAL IS THE PRODUCT. The user gets a real moment, and the demo gets a
 *    climax instead of a 'check back later'."
 *
 * §26.2 — the brief is converted into a pseudo-preference object and scored with
 * THE SAME §12 ENGINE. One algorithm, not two.
 */

import { revalidatePath } from 'next/cache'
import { briefSchema, fieldErrorsFrom } from '../schemas'
import { mutateSession, MutationError } from '../db/store'
import { addMonths, pushEvent, today, allMatchedArtworkIds, availabilityOverlay, type SessionState } from '../db/state'
import { ARTWORKS, getArtwork, getArtist, scorable, worksOf } from '../db/catalog'
import { newId } from '../auth/crypto'
import { scoreArtwork, type ScoreProfile } from '../recommend/score'
import { comparisonPriceDollars } from '../pricing/rental'
import { mysteryMonthlyCents, resolveMysterySize, proratedForFewerPieces } from '../pricing/mystery'
import {
  MYSTERY_MINIMUM_TERM_MONTHS, MYSTERY_ROTATION_MONTHS,
  PRICING_CONFIG_VERSION, ARTIST_RENTAL_SHARE,
} from '../pricing/config'
import { transitionMystery, transitionArtwork } from '../state/machines'
import { BUDGET_RANGE, SIZES } from '../taxonomy'
import type { MysteryMatch, MysterySubscription, Rental } from '../db/types'

export interface MysteryResult {
  ok: boolean
  error?: string
  subscriptionId?: string
  fieldErrors?: Record<string, string>
}

// ---------------------------------------------------------------------------
// §26.2 — brief → pseudo-preference, scored with the same §12 engine.
// ---------------------------------------------------------------------------

function briefProfile(sub: Pick<MysterySubscription,
  'styles' | 'colors' | 'room' | 'boldness' | 'size' | 'budget_min_cents' | 'budget_max_cents'>): ScoreProfile {
  return {
    room: sub.room,
    styles: sub.styles,
    colors: sub.colors,
    // §26.2 — "The brief has NO MOOD FIELD, so mood_match returns the neutral
    // 0.5 from §12.2 for every candidate — it contributes nothing to ranking,
    // WHICH IS CORRECT."
    moods: [],
    size_preference: sub.size,
    boldness: sub.boldness,
    budget_min: sub.budget_min_cents / 100,
    budget_max: sub.budget_max_cents / 100,
  }
}

/**
 * §26.2 selection.
 *  · candidates: available, at the resolved size
 *  · rank by §12
 *  · MAXIMUM ONE PER ARTIST — "a mystery box from a single artist isn't a curation"
 *  · widen to adjacent size buckets if short, and say so in the reveal
 */
function matchPieces(
  s: SessionState,
  sub: MysterySubscription,
  excludeIds: Set<string>,
): { matches: Array<{ artworkId: string; artistId: string; score: number }>; widened: boolean } {
  const overlay = availabilityOverlay(s)
  const profile = briefProfile(sub)
  const sizeIdx = SIZES.indexOf(sub.size)
  const wantColors = new Set(sub.colors)
  const wantStyles = new Set(sub.styles)

  /**
   * §24.2 — THE ONE RULE, enforced as a HARD CONSTRAINT rather than a score.
   *
   * "The surprise is the specific artwork, NEVER the user's stated preferences.
   *  A user who says 'blue, calm, large, abstract' gets a blue, calm, large,
   *  abstract piece they haven't seen. THEY NEVER GET A RED PORTRAIT 'AS A
   *  SURPRISE.' Violating this is the fastest way to make the feature feel like
   *  a gimmick."
   *
   * Ranking by §12 score alone does NOT hold this line. §12 is a weighted sum:
   * a piece can miss colour entirely and still rank well on style, room, size
   * and boldness. Observed live — a brief for blue/neutral abstract returned two
   * pieces tagged red, which is exactly the failure §48's "Mystery integrity"
   * criterion forbids.
   *
   * So a candidate must share AT LEAST ONE COLOUR AND AT LEAST ONE STYLE with
   * the brief. If that leaves too few pieces, we deliver FEWER and say so at a
   * prorated price (§41.5) — never a contradicting piece. Breaking the promise
   * is worse than delivering two pieces instead of three.
   */
  const honoursBrief = (a: (typeof ARTWORKS)[number]) =>
    a.colors.some((c) => wantColors.has(c)) && a.styles.some((st) => wantStyles.has(st))

  const pick = (maxDistance: number) => {
    const out: Array<{ artworkId: string; artistId: string; score: number }> = []
    const usedArtists = new Set<string>()
    const ranked = ARTWORKS
      .filter((a) => (overlay.get(a.id) ?? a.availability) === 'available')
      .filter((a) => !excludeIds.has(a.id))
      .filter((a) => Math.abs(SIZES.indexOf(a.size_category) - sizeIdx) <= maxDistance)
      .filter(honoursBrief)
      .map((a) => ({
        a,
        score: scoreArtwork(profile, { ...scorable(a), comparison_price: comparisonPriceDollars(a) }).match_score,
        // §11.1 — "The DOMINANT COLOR first." A piece tagged [red, neutral]
        // technically honours a blue-or-neutral brief, but it reads as a red
        // painting on the wall. Preferring a dominant-colour match keeps the
        // reveal feeling like the brief without shrinking the candidate pool.
        dominant: wantColors.has(a.colors[0]) ? 1 : 0,
        styleHits: a.styles.filter((st) => wantStyles.has(st)).length,
      }))
      // Deterministic tiebreak — §12.10 forbids random() anywhere the demo sees.
      .sort((x, y) =>
        y.dominant - x.dominant ||
        y.styleHits - x.styleHits ||
        y.score - x.score ||
        x.a.id.localeCompare(y.a.id))

    for (const r of ranked) {
      if (out.length >= sub.number_of_pieces) break
      // §26.2 — MAXIMUM ONE PER ARTIST: "a mystery box from a single artist
      // isn't a curation."
      if (usedArtists.has(r.a.artist_id)) continue
      usedArtists.add(r.a.artist_id)
      out.push({ artworkId: r.a.id, artistId: r.a.artist_id, score: r.score })
    }
    return out
  }

  // §26.2 — exact size first; widen by one bucket, then two, and note it in the
  // reveal. Size is the only dimension we will stretch, because it is a fact
  // about the wall rather than a promise about the art.
  let matches = pick(0)
  let widened = false
  if (matches.length < sub.number_of_pieces) {
    const wider = pick(1)
    if (wider.length > matches.length) { matches = wider; widened = true }
  }
  if (matches.length < sub.number_of_pieces) {
    const widest = pick(2)
    if (widest.length > matches.length) { matches = widest; widened = true }
  }
  return { matches, widened }
}

// ---------------------------------------------------------------------------
// Create — §24, §25, §26.2.
// ---------------------------------------------------------------------------

export async function createSubscription(input: unknown): Promise<MysteryResult> {
  const parsed = briefSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Some answers need another look.', fieldErrors: fieldErrorsFrom(parsed.error) }
  }
  const b = parsed.data

  let resolved: ReturnType<typeof resolveMysterySize>
  try {
    resolved = resolveMysterySize(b.size, b.custom_width_in, b.custom_height_in)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Check your custom dimensions.' }
  }

  const band = BUDGET_RANGE[b.budget_band]
  const monthly = mysteryMonthlyCents({
    pieceType: b.piece_type,
    size: resolved.size,
    pieces: b.number_of_pieces as 1 | 2 | 3 | 4,
  })

  const res = await mutateSession((s) => {
    const start = today()
    const sub: MysterySubscription = {
      id: newId('sub_'),
      user_id: s.user.id,
      piece_type: b.piece_type,
      number_of_pieces: b.number_of_pieces,
      size: resolved.size,
      custom_width_in: b.custom_width_in ?? null,
      custom_height_in: b.custom_height_in ?? null,
      styles: b.styles,
      colors: b.colors,
      room: b.room,
      boldness: b.boldness,
      budget_band: b.budget_band,
      budget_min_cents: band.min * 100,
      budget_max_cents: band.max * 100,
      // §42 — sanitise on write; React escapes on render; never interpolated
      // into a query. §24.3: it does not affect matching in the MVP.
      special_requests: b.special_requests ? b.special_requests.slice(0, 500).replace(/[<>]/g, '') : null,
      monthly_price_cents: monthly,
      // §25.4 — stamped so an existing subscriber's price cannot silently move.
      pricing_config_version: PRICING_CONFIG_VERSION,
      status: 'matching',
      cycle: 1,
      minimum_term_months: MYSTERY_MINIMUM_TERM_MONTHS,
      current_period_start: start,
      current_period_end: addMonths(start, 1),
      next_rotation_at: addMonths(start, MYSTERY_ROTATION_MONTHS),
      cancelled_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    s.subscriptions.push(sub)

    // §26.1 — matching is INSTANT. The reveal is the deliberate part.
    if (b.piece_type === 'custom' && b.preferred_artist) {
      // §27.3 — a commission match: artwork_id is null, artist_id is set.
      const artist = getArtist(b.preferred_artist)
      if (artist) {
        s.matches.push(commissionMatch(sub.id, 1, artist.id))
      }
    } else {
      const { matches } = matchPieces(s, sub, new Set())
      for (const m of matches) {
        s.matches.push({
          id: newId('m_'), subscription_id: sub.id, cycle: 1, kind: 'curated',
          artist_id: m.artistId, artwork_id: m.artworkId, match_score: m.score,
          selected: false, revealed_at: null, created_at: new Date().toISOString(),
        })
        // §23.1 — available → reserved, held until the reveal. The reservation
        // is implied by the mystery_matches row: `availabilityOverlay` reads
        // unrevealed matches as `reserved` and expires them after 24h. There is
        // no separate flag to set, and calling transitionArtwork with a
        // hardcoded 'available' would only have validated a literal.
      }

      // §41.5 — deliver fewer and SAY SO, with a prorated price.
      if (matches.length > 0 && matches.length < sub.number_of_pieces) {
        const { monthlyCents } = proratedForFewerPieces(
          { pieceType: sub.piece_type, size: sub.size, pieces: sub.number_of_pieces as 1 | 2 | 3 | 4 },
          matches.length,
        )
        sub.number_of_pieces = matches.length
        sub.monthly_price_cents = monthlyCents
      }
    }

    pushEvent(s, 'mystery_subscription_created', {
      payload: {
        piece_type: sub.piece_type, pieces: sub.number_of_pieces,
        size: sub.size, price_cents: sub.monthly_price_cents,
      },
    })
    return { subscriptionId: sub.id }
  })

  if (!res.ok) {
    return {
      ok: false,
      error: res.error === 'not-signed-in'
        ? 'Sign in first — a subscription belongs to an account.'
        : res.error,
    }
  }
  revalidatePath('/my-space')
  revalidatePath('/mystery')
  return { ok: true, subscriptionId: res.value.subscriptionId }
}

function commissionMatch(subId: string, cycle: number, artistId: string): MysteryMatch {
  return {
    id: newId('m_'), subscription_id: subId, cycle, kind: 'commission',
    artist_id: artistId, artwork_id: null, match_score: 100,
    selected: true, revealed_at: new Date().toISOString(), created_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// §26.3 — Reveal.
// ---------------------------------------------------------------------------

export async function revealSubscription(subscriptionId: string): Promise<MysteryResult> {
  const res = await mutateSession((s) => {
    const sub = s.subscriptions.find((x) => x.id === subscriptionId)
    if (!sub) throw new MutationError('That subscription no longer exists.')
    sub.status = transitionMystery(sub.status, 'reveal')

    const matches = s.matches.filter((m) => m.subscription_id === sub.id && m.cycle === sub.cycle)
    const now = new Date().toISOString()

    // §23.3 — re-read availability INSIDE the transaction. A piece can be
    // bought or rented between the match and the reveal (two tabs, or a user who
    // walks away and comes back), and the previous version validated a hardcoded
    // 'reserved' literal, so it could never catch that.
    const overlay = availabilityOverlay(s)
    let lost = 0

    for (const m of matches) {
      m.revealed_at = now
      if (!m.artwork_id) continue
      const art = getArtwork(m.artwork_id)
      if (!art) continue

      const current = overlay.get(m.artwork_id) ?? art.availability
      if (current !== 'reserved' && current !== 'available') {
        // Gone. Drop it rather than creating a rental for a piece in someone
        // else's home; §41.5's fewer-pieces path handles the shortfall.
        lost++
        continue
      }
      transitionArtwork(current === 'reserved' ? 'reserved' : 'available',
                        current === 'reserved' ? 'reveal' : 'rent')

      const rental: Rental = {
        id: newId('rent_'),
        user_id: s.user.id,
        artwork_id: m.artwork_id,
        source: 'mystery',
        mystery_subscription_id: sub.id,
        status: 'active',
        start_date: today(),
        end_date: addMonths(today(), MYSTERY_ROTATION_MONTHS),
        ended_at: null,
        rental_period_months: MYSTERY_ROTATION_MONTHS,
        // §26.3 — "price_cents = 0 for mystery-sourced rentals is IMPORTANT:
        // analytics and artist earnings must read subscription revenue from
        // mystery_subscriptions, NEVER sum rental prices, or Mystery revenue
        // vanishes from every report."
        price_cents: 0,
        artist_share_rate: ARTIST_RENTAL_SHARE,
        extensions: [],
        return_reason: null,
        return_note: null,
        contact_name: s.user.display_name,
        contact_email: s.user.email,
        shipping_address: { line1: '—', line2: null, city: '—', state: '—', zip: '00000' },
        created_at: now,
        updated_at: now,
      }
      s.rentals.push(rental)
    }

    // §41.5 — "deliver fewer pieces and say so plainly WITH A PRORATED PRICE."
    const delivered = matches.filter((m) => m.artwork_id).length - lost
    if (lost > 0 && delivered > 0) {
      const { monthlyCents } = proratedForFewerPieces(
        { pieceType: sub.piece_type, size: sub.size, pieces: sub.number_of_pieces as 1 | 2 | 3 | 4 },
        delivered,
      )
      sub.number_of_pieces = delivered
      sub.monthly_price_cents = monthlyCents
    }

    sub.current_period_start = today()
    sub.current_period_end = addMonths(today(), 1)
    sub.next_rotation_at = addMonths(today(), MYSTERY_ROTATION_MONTHS)
    sub.status = transitionMystery(sub.status, 'activate')
    sub.updated_at = now

    pushEvent(s, 'mystery_revealed', { payload: { cycle: sub.cycle, pieces: delivered, lost } })
    return { subscriptionId: sub.id }
  })

  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/my-space')
  revalidatePath(`/mystery/${subscriptionId}`)
  return { ok: true, subscriptionId }
}

// ---------------------------------------------------------------------------
// §26.5 — Rotation. USER-TRIGGERED in the MVP; there is no scheduler (§52.3).
// ---------------------------------------------------------------------------

export async function rotateSubscription(subscriptionId: string): Promise<MysteryResult> {
  const res = await mutateSession((s) => {
    const sub = s.subscriptions.find((x) => x.id === subscriptionId)
    if (!sub) throw new MutationError('That subscription no longer exists.')

    // Current pieces go back.
    for (const r of s.rentals) {
      if (r.mystery_subscription_id === sub.id && r.status === 'active') {
        r.status = 'ending'
        r.ended_at = today()
        r.updated_at = new Date().toISOString()
      }
    }

    sub.status = transitionMystery(sub.status, 'rotate')
    sub.cycle += 1

    // §26.5 — matching re-runs EXCLUDING every artwork this subscription has
    // already delivered, in any cycle.
    const already = new Set(allMatchedArtworkIds(s, sub.id))
    const { matches } = matchPieces(s, sub, already)
    for (const m of matches) {
      s.matches.push({
        id: newId('m_'), subscription_id: sub.id, cycle: sub.cycle, kind: 'curated',
        artist_id: m.artistId, artwork_id: m.artworkId, match_score: m.score,
        selected: false, revealed_at: null, created_at: new Date().toISOString(),
      })
    }

    sub.updated_at = new Date().toISOString()
    pushEvent(s, 'mystery_rotated', { payload: { cycle: sub.cycle, pieces: matches.length } })
    return { subscriptionId: sub.id }
  })

  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/my-space')
  revalidatePath(`/mystery/${subscriptionId}`)
  return { ok: true, subscriptionId }
}

// ---------------------------------------------------------------------------
// §26.6 — Cancellation. Blocked in months 1–2 with the reason STATED.
// ---------------------------------------------------------------------------

export async function cancelSubscription(subscriptionId: string): Promise<MysteryResult> {
  const res = await mutateSession((s) => {
    const sub = s.subscriptions.find((x) => x.id === subscriptionId)
    if (!sub) throw new MutationError('That subscription no longer exists.')

    const monthsIn = monthsElapsed(sub.created_at)
    if (monthsIn < sub.minimum_term_months) {
      const endsOn = addMonths(sub.created_at.slice(0, 10), sub.minimum_term_months)
      throw new MutationError(`Your ${sub.minimum_term_months}-month minimum ends ${endsOn}. You can cancel from then.`)
    }

    sub.status = transitionMystery(sub.status, 'cancel')
    sub.cancelled_at = new Date().toISOString()
    sub.updated_at = sub.cancelled_at

    // Pieces return at period end (§7.5). In the MVP that is immediate on cancel.
    for (const r of s.rentals) {
      if (r.mystery_subscription_id === sub.id && r.status === 'active') {
        r.status = 'ending'
        r.ended_at = today()
        r.updated_at = new Date().toISOString()
      }
    }
    pushEvent(s, 'mystery_subscription_cancelled', { payload: { cycle: sub.cycle } })
  })

  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/my-space')
  return { ok: true }
}

/** §7.5 — "Changing the brief: allowed anytime; takes effect at the NEXT ROTATION.
 *  Price re-quotes and the user must CONFIRM the new monthly amount." */
export async function updateBrief(subscriptionId: string, input: unknown): Promise<MysteryResult> {
  const parsed = briefSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Some answers need another look.' }
  const b = parsed.data
  const resolved = resolveMysterySize(b.size, b.custom_width_in, b.custom_height_in)
  const band = BUDGET_RANGE[b.budget_band]
  const monthly = mysteryMonthlyCents({
    pieceType: b.piece_type, size: resolved.size, pieces: b.number_of_pieces as 1 | 2 | 3 | 4,
  })

  const res = await mutateSession((s) => {
    const sub = s.subscriptions.find((x) => x.id === subscriptionId)
    if (!sub) throw new MutationError('That subscription no longer exists.')
    Object.assign(sub, {
      piece_type: b.piece_type,
      number_of_pieces: b.number_of_pieces,
      size: resolved.size,
      custom_width_in: b.custom_width_in ?? null,
      custom_height_in: b.custom_height_in ?? null,
      styles: b.styles, colors: b.colors, room: b.room, boldness: b.boldness,
      budget_band: b.budget_band,
      budget_min_cents: band.min * 100,
      budget_max_cents: band.max * 100,
      special_requests: b.special_requests ? b.special_requests.slice(0, 500).replace(/[<>]/g, '') : null,
      monthly_price_cents: monthly,
      pricing_config_version: PRICING_CONFIG_VERSION,
      updated_at: new Date().toISOString(),
    })
    pushEvent(s, 'preferences_updated', { payload: { mystery: true, price_cents: monthly } })
  })

  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/my-space')
  revalidatePath(`/mystery/${subscriptionId}`)
  return { ok: true, subscriptionId }
}

function monthsElapsed(iso: string): number {
  const then = new Date(iso)
  const now = new Date()
  return (now.getUTCFullYear() - then.getUTCFullYear()) * 12 + (now.getUTCMonth() - then.getUTCMonth())
}

void worksOf
