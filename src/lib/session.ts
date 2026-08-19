import 'server-only'

/**
 * Server-side view of the current session, shared by every page.
 *
 * One place that answers "who is looking at this, what do they like, and what
 * is on their walls" — so no page re-derives it and no two pages disagree.
 */

import { readSession } from './db/store'
import {
  activeRentals, availabilityOverlay, affinityMap, inTransitRentals,
  pastRentals, piecesAtHome, subscriptionsActive, type SessionState,
} from './db/state'
import type { ScoreProfile } from './recommend/score'
import type { ArtworkAvailability } from './taxonomy'
import { BUDGET_RANGE } from './taxonomy'

/** Plain, serialisable slice of the viewer — safe to pass to client components. */
export interface ViewerSummary {
  signedIn: boolean
  isArtist: boolean
  displayName: string | null
  email: string | null
  role: string | null
  hasPreferences: boolean
  atHome: number
}

export function viewerSummary(v: Viewer): ViewerSummary {
  return {
    signedIn: v.signedIn,
    isArtist: v.isArtist,
    displayName: v.state?.user.display_name ?? null,
    email: v.state?.user.email ?? null,
    role: v.state?.user.role ?? null,
    hasPreferences: !!v.state?.preferences,
    atHome: v.atHome,
  }
}

export interface Viewer {
  state: SessionState | null
  signedIn: boolean
  isArtist: boolean
  /** null when the user has no preferences — drives §12.11 cold start. */
  profile: ScoreProfile | null
  affinity: ReturnType<typeof affinityMap>
  /** §23 — catalogue availability overlaid with this session's holdings. */
  availabilityOf: (id: string) => ArtworkAvailability
  /** §12.9 filter 2 — pieces the user already rents or owns. */
  excludeIds: Set<string>
  atHome: number
}

export async function getViewer(): Promise<Viewer> {
  const state = await readSession()

  if (!state) {
    return {
      state: null, signedIn: false, isArtist: false, profile: null,
      affinity: new Map(),
      availabilityOf: () => 'available',
      excludeIds: new Set(), atHome: 0,
    }
  }

  const overlay = availabilityOverlay(state)
  const exclude = new Set<string>([
    ...activeRentals(state).map((r) => r.artwork_id),
    ...state.purchases.map((p) => p.artwork_id),
  ])

  return {
    state,
    signedIn: true,
    isArtist: state.user.role === 'artist',
    profile: toProfile(state),
    affinity: affinityMap(state),
    availabilityOf: (id) => overlay.get(id) ?? 'available',
    excludeIds: exclude,
    atHome: piecesAtHome(state),
  }
}

export function toProfile(state: SessionState): ScoreProfile | null {
  const p = state.preferences
  if (!p) return null
  return {
    room: p.room,
    styles: p.styles,
    colors: p.colors,
    moods: p.moods,
    size_preference: p.size_preference,
    boldness: p.boldness,
    budget_min: p.budget_min_cents / 100,
    budget_max: p.budget_max_cents / 100,
  }
}

export function budgetBandLabel(state: SessionState | null): string {
  const band = state?.preferences?.budget_band
  return band ? BUDGET_RANGE[band].label : 'your budget'
}

export { activeRentals, inTransitRentals, pastRentals, subscriptionsActive }
