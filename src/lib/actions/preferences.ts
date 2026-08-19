'use server'

/**
 * PREFERENCES — PRD §10, §33.4, §13.4.
 *
 * §33.4 exists because v1.0 required "changing preferences should meaningfully
 * change recommendations" as an acceptance criterion (§50) and never specified
 * WHERE a user changes preferences. `/profile/taste` is that place.
 *
 * "Saving invalidates the feed cache and recomputes immediately. The user must
 *  be able to SEE the feed change — that is the acceptance test." (§33.4)
 */

import { revalidatePath } from 'next/cache'
import { preferencesSchema, fieldErrorsFrom } from '../schemas'
import { mutateSession, MutationError } from '../db/store'
import { pushEvent } from '../db/state'
import { newId } from '../auth/crypto'
import { BUDGET_RANGE } from '../taxonomy'


export interface SaveResult { ok: boolean; error?: string; fieldErrors?: Record<string, string> }

export async function savePreferences(input: unknown): Promise<SaveResult> {
  const parsed = preferencesSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Some answers need another look.', fieldErrors: fieldErrorsFrom(parsed.error) }
  }

  const p = parsed.data
  const band = BUDGET_RANGE[p.budget_band]

  const res = await mutateSession((s) => {
    const first = !s.preferences
    s.preferences = {
      id: s.preferences?.id ?? newId('pref_'),
      user_id: s.user.id,
      room: p.room,
      styles: p.styles,
      colors: p.colors,
      moods: p.moods,
      size_preference: p.size_preference,
      boldness: p.boldness,
      budget_band: p.budget_band,
      budget_min_cents: band.min * 100,
      budget_max_cents: band.max * 100,
      change_frequency: p.change_frequency,
      created_at: s.preferences?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    pushEvent(s, first ? 'onboarding_completed' : 'preferences_updated', {
      payload: { room: p.room, styles: p.styles.length, size: p.size_preference, band: p.budget_band },
    })
  })

  if (!res.ok) {
    return {
      ok: false,
      error: res.error === 'not-signed-in'
        ? 'Sign in first — your taste profile is saved to your account.'
        : 'Couldn’t save your answers. Try again.',
    }
  }

  // §33.4 / §43.5 — invalidate the feed so the change is visible immediately.
  revalidatePath('/discover')
  revalidatePath('/profile/taste')
  revalidatePath('/my-space')
  revalidatePath('/')
  return { ok: true }
}

/** §13.4 — both actions are one-click reversible, from the toast and from /profile/taste. */
export async function undoPreferenceShift(
  tagType: 'style' | 'color' | 'mood',
  tag: string,
  kind: 'added' | 'removed',
): Promise<SaveResult> {
  const res = await mutateSession((s) => {
    if (!s.preferences) throw new MutationError('No taste profile to change.')
    const field = ({ style: 'styles', color: 'colors', mood: 'moods' } as const)[tagType]
    const list = s.preferences[field] as string[]

    if (kind === 'added') {
      const i = list.indexOf(tag)
      if (i >= 0) list.splice(i, 1)
    } else if (!list.includes(tag)) {
      list.push(tag)
    }

    // Reset the weight to just inside the threshold so the shift does not
    // immediately re-fire on the user's next interaction.
    const row = s.affinity.find((a) => a.tag_type === tagType && a.tag === tag)
    if (row) row.weight = kind === 'added' ? 0.3 : -0.3

    const key = `${kind}:${tagType}:${tag}`
    s.announced = s.announced.filter((k) => k !== key)
    s.preferences.updated_at = new Date().toISOString()
    pushEvent(s, 'preferences_updated', { payload: { undo: kind, tag_type: tagType, tag } })
  })

  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/discover')
  revalidatePath('/profile/taste')
  return { ok: true }
}

/** §12.9 filter 2 companion — an explicit dismiss in the feed (§13.2, −0.10). */
export async function skipArtwork(artworkId: string): Promise<SaveResult> {
  const { getArtwork } = await import('../db/catalog')
  const { applyAffinity } = await import('../recommend/apply')
  const art = getArtwork(artworkId)
  if (!art) return { ok: false, error: 'Unknown artwork.' }

  const res = await mutateSession((s) => {
    if (!s.skipped.includes(artworkId)) s.skipped.push(artworkId)
    pushEvent(s, 'artwork_skipped', { artwork_id: artworkId, artist_id: art.artist_id })
    return applyAffinity(s, 'skip', art)
  })
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/discover')
  return { ok: true }
}
