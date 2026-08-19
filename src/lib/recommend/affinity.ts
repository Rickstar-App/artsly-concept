/**
 * BEHAVIOURAL LEARNING — PRD §13
 *
 * "This is what makes the system feel intelligent without any ML. It must be
 * visible, or it isn't worth building." (§13)
 *
 * Size and room are DELIBERATELY EXCLUDED from affinity — they are physical
 * facts about the user's wall, not taste. They change only through explicit
 * preference editing. (§13.1)
 *
 * NO TIME DECAY IN THE MVP. Stated explicitly so nobody builds a half-decay and
 * wonders why tests are flaky. (§13.3)
 *
 * Pure module.
 */

import { clamp } from './score'
import type { ReturnReason } from '../taxonomy'

export type TagType = 'style' | 'color' | 'mood'

export type AffinityAction =
  | 'view' | 'save' | 'unsave' | 'skip' | 'rent' | 'purchase'
  | 'return_style'

/** §13.2 — Deltas, applied to EVERY style/color/mood tag on the artwork. */
export const AFFINITY_DELTA: Record<AffinityAction, number> = {
  view:         +0.02,   // dwell >= 3s on the detail page
  save:         +0.15,
  unsave:       -0.15,
  skip:         -0.10,   // explicit dismiss in the feed
  rent:         +0.25,
  purchase:     +0.35,
  return_style: -0.20,   // styles only
}

/** §13.4 — Promotion / demotion thresholds. */
export const PROMOTE_THRESHOLD = 0.45
export const DEMOTE_THRESHOLD  = -0.45

export const AFFINITY_MIN = -1.0
export const AFFINITY_MAX = 1.0

/**
 * Weights are quantised to 4 decimal places on every write.
 *
 * This is NOT cosmetic. In IEEE-754, 0.15 + 0.15 + 0.15 = 0.44999999999999996,
 * which is strictly LESS THAN the 0.45 promotion threshold. Without this,
 * §13.4's flagship demo moment — "three saves of blue abstract pieces crosses
 * the threshold, live, in about fifteen seconds" — silently never fires.
 * The DB column is `real`, so quantising here also keeps the in-memory value
 * and the stored value in agreement.
 */
export function quantiseWeight(w: number): number {
  return Math.round(w * 10_000) / 10_000
}

/**
 * §13.2 — Which tag types an action touches.
 *
 * Return reasons "different", "price", and "other" apply NO affinity change —
 * they say nothing about taste. "space" applies none either; it instead triggers
 * the size-preference prompt. Explicit beats silent.
 */
export function tagTypesFor(action: AffinityAction): TagType[] {
  return action === 'return_style' ? ['style'] : ['style', 'color', 'mood']
}

export function affinityActionForReturnReason(reason: ReturnReason | null | undefined): AffinityAction | null {
  return reason === 'style' ? 'return_style' : null
}

/** §22.5 — the only return reason that changes anything other than affinity. */
export function returnReasonPromptsSizeChange(reason: ReturnReason | null | undefined): boolean {
  return reason === 'space'
}

export interface AffinityRow { tag_type: TagType; tag: string; weight: number }

export interface AffinityUpdate extends AffinityRow { previous: number }

/**
 * Apply one interaction to the affinity map and return the changed rows.
 * Weights clamp to [-1, +1].
 */
export function applyInteraction(
  current: readonly AffinityRow[],
  action: AffinityAction,
  artTags: { styles: readonly string[]; colors: readonly string[]; moods: readonly string[] },
): AffinityUpdate[] {
  const delta = AFFINITY_DELTA[action]
  const types = tagTypesFor(action)
  const byKey = new Map(current.map((r) => [`${r.tag_type}:${r.tag}`, r.weight]))
  const out: AffinityUpdate[] = []

  const buckets: Record<TagType, readonly string[]> = {
    style: artTags.styles, color: artTags.colors, mood: artTags.moods,
  }

  for (const type of types) {
    for (const tag of buckets[type]) {
      const key = `${type}:${tag}`
      const previous = byKey.get(key) ?? 0
      const weight = quantiseWeight(clamp(previous + delta, AFFINITY_MIN, AFFINITY_MAX))
      if (weight !== previous) out.push({ tag_type: type, tag, weight, previous })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// §13.4 — Visible learning. The demo moment.
// ---------------------------------------------------------------------------

export interface PreferenceShift {
  kind: 'added' | 'removed'
  tag_type: TagType
  tag: string
  weight: number
  /** The declared tag displaced to respect the §10 selection cap, if any. */
  displaced?: string
}

/**
 * Detect promotions and demotions after an interaction.
 *
 * If adding would exceed the §10 selection cap, replace the declared tag with
 * the LOWEST affinity. Both actions are one-click reversible.
 *
 * Three saves of blue abstract pieces (3 × 0.15 = 0.45) crosses the threshold.
 * That is intentional — the demo can trigger it live in about fifteen seconds.
 */
export function detectPreferenceShifts(
  updated: readonly AffinityUpdate[],
  declared: { styles: string[]; colors: string[]; moods: string[] },
  caps: { styles: number; colors: number; moods: number },
  allWeights: readonly AffinityRow[],
): PreferenceShift[] {
  const shifts: PreferenceShift[] = []
  const field = { style: 'styles', color: 'colors', mood: 'moods' } as const
  const weightOf = new Map(allWeights.map((r) => [`${r.tag_type}:${r.tag}`, r.weight]))

  for (const row of updated) {
    const list = declared[field[row.tag_type]]
    const cap = caps[field[row.tag_type]]
    const has = list.includes(row.tag)

    // Promotion — only fires on the crossing, never repeatedly.
    if (row.weight >= PROMOTE_THRESHOLD && row.previous < PROMOTE_THRESHOLD && !has) {
      let displaced: string | undefined
      if (list.length >= cap) {
        displaced = [...list].sort(
          (a, b) => (weightOf.get(`${row.tag_type}:${a}`) ?? 0) - (weightOf.get(`${row.tag_type}:${b}`) ?? 0),
        )[0]
      }
      shifts.push({ kind: 'added', tag_type: row.tag_type, tag: row.tag, weight: row.weight, displaced })
    }

    // Demotion.
    if (row.weight <= DEMOTE_THRESHOLD && row.previous > DEMOTE_THRESHOLD && has) {
      shifts.push({ kind: 'removed', tag_type: row.tag_type, tag: row.tag, weight: row.weight })
    }
  }
  return shifts
}
