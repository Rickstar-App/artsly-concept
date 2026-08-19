'use server'

/**
 * FAVOURITES + BEHAVIOURAL LEARNING — PRD §28, §13.
 *
 * §28 promoted Favourites to P0 because §39's "similar to pieces you've saved"
 * and §13.4's visible-learning moment both depend on it.
 *
 * Saving writes THREE things, in one mutation:
 *   1. the `favorites` row
 *   2. the `artwork_saved` event (§40)
 *   3. the §13.2 affinity delta, which may cross §13.4's threshold
 */

import { revalidatePath } from 'next/cache'
import { mutateSession } from '../db/store'
import { pushEvent } from '../db/state'
import { getArtwork } from '../db/catalog'
import { newId } from '../auth/crypto'
import { applyAffinity, type ShiftView } from '../recommend/apply'

export interface FavoriteResult {
  ok: boolean
  saved: boolean
  shifts?: ShiftView[]
  error?: string
}

export async function toggleFavorite(artworkId: string): Promise<FavoriteResult> {
  const art = getArtwork(artworkId)
  if (!art) return { ok: false, saved: false, error: 'Unknown artwork.' }

  const res = await mutateSession((s) => {
    const idx = s.favorites.findIndex((f) => f.artwork_id === artworkId)
    const removing = idx >= 0

    if (removing) {
      s.favorites.splice(idx, 1)
      pushEvent(s, 'artwork_unsaved', { artwork_id: artworkId, artist_id: art.artist_id })
    } else {
      s.favorites.push({
        id: newId('fav_'), user_id: s.user.id, artwork_id: artworkId,
        created_at: new Date().toISOString(),
      })
      pushEvent(s, 'artwork_saved', { artwork_id: artworkId, artist_id: art.artist_id })
    }

    const shifts = applyAffinity(s, removing ? 'unsave' : 'save', art)
    return { saved: !removing, shifts }
  })

  if (!res.ok) return { ok: false, saved: false, error: res.error }

  revalidatePath('/discover')
  revalidatePath('/my-space')
  revalidatePath('/my-space/saved')
  revalidatePath('/profile/taste')
  return { ok: true, saved: res.value.saved, shifts: res.value.shifts }
}
