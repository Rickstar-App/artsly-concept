'use server'

/**
 * EVENT LOGGING — PRD §40.
 *
 * "Instrument from day one. Reporting is P2; THE LOG IS P0."
 *
 * §42 — NO PII IN THE EVENTS PAYLOAD. IDs only.
 */

import { mutateSession } from '../db/store'
import { pushEvent } from '../db/state'
import { getArtwork } from '../db/catalog'
import { applyAffinity } from '../recommend/apply'
import type { EventType } from '../db/types'

/** §13.2 — a view with ≥3s dwell. Idempotent per session via the events log. */
export async function recordView(artworkId: string): Promise<{ ok: boolean }> {
  const art = getArtwork(artworkId)
  if (!art) return { ok: false }

  const res = await mutateSession((s) => {
    // Only the first qualifying view of a piece moves affinity, so leaving a
    // tab open cannot inflate a tag's weight.
    const seen = s.events.some((e) => e.t === 'artwork_viewed' && e.a === artworkId)
    pushEvent(s, 'artwork_viewed', { artwork_id: artworkId, artist_id: art.artist_id })
    if (!seen) applyAffinity(s, 'view', art)
  })
  return { ok: res.ok }
}

/** Generic instrumentation hook for client components. */
export async function logEvent(
  type: EventType,
  opts: { artworkId?: string; artistId?: string; payload?: Record<string, unknown> } = {},
): Promise<void> {
  await mutateSession((s) => {
    pushEvent(s, type, {
      artwork_id: opts.artworkId ?? null,
      artist_id: opts.artistId ?? null,
      payload: opts.payload,
    })
  })
}
