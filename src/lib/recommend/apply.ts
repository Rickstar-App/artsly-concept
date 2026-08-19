/**
 * AFFINITY APPLICATION — PRD §13.2, §13.4.
 *
 * Lives outside `lib/actions/` because a `'use server'` module may only export
 * async functions, and these are synchronous state reducers shared by
 * favourites, rent, purchase, skip, view, and return — so the deltas and the
 * threshold logic exist exactly once.
 */

import { pushEvent, type SessionState } from '../db/state'
import { applyInteraction, detectPreferenceShifts, type PreferenceShift } from './affinity'
import { SURVEY_CAPS, COLOR_LABEL, MOOD_LABEL, STYLE_LABEL, type Color, type Mood, type Style } from '../taxonomy'

export interface ShiftView extends PreferenceShift {
  label: string
  displacedLabel?: string
}

/**
 * §13.2 + §13.4 — apply an interaction's affinity deltas, then report any
 * preference promotion or demotion the user should be TOLD about.
 *
 * Shared by favourites, rent, purchase, skip, view, and return, so the deltas
 * and the threshold logic exist exactly once.
 */
export function applyAffinity(
  s: SessionState,
  action: Parameters<typeof applyInteraction>[1],
  art: { styles: string[]; colors: string[]; moods: string[] },
): ShiftView[] {
  const updates = applyInteraction(s.affinity, action, art)
  if (updates.length === 0) return []

  const byKey = new Map(s.affinity.map((r) => [`${r.tag_type}:${r.tag}`, r]))
  for (const u of updates) {
    const key = `${u.tag_type}:${u.tag}`
    const existing = byKey.get(key)
    if (existing) {
      existing.weight = u.weight
      existing.updated_at = new Date().toISOString()
    } else {
      const row = { user_id: s.user.id, tag_type: u.tag_type, tag: u.tag, weight: u.weight, updated_at: new Date().toISOString() }
      s.affinity.push(row)
      byKey.set(key, row)
    }
  }

  if (!s.preferences) return []

  const declared = {
    styles: [...s.preferences.styles],
    colors: [...s.preferences.colors],
    moods: [...s.preferences.moods],
  }
  const shifts = detectPreferenceShifts(
    updates, declared,
    { styles: SURVEY_CAPS.styles.max, colors: SURVEY_CAPS.colors.max, moods: SURVEY_CAPS.moods.max },
    s.affinity,
  )

  const out: ShiftView[] = []
  for (const shift of shifts) {
    // Announce each promotion/demotion at most once per session (§13.4).
    const key = `${shift.kind}:${shift.tag_type}:${shift.tag}`
    if (s.announced.includes(key)) continue
    s.announced.push(key)

    const field = ({ style: 'styles', color: 'colors', mood: 'moods' } as const)[shift.tag_type]
    const list = s.preferences[field] as string[]

    if (shift.kind === 'added') {
      if (shift.displaced) {
        const di = list.indexOf(shift.displaced)
        if (di >= 0) list.splice(di, 1)
      }
      if (!list.includes(shift.tag)) list.push(shift.tag)
      pushEvent(s, 'preference_auto_added', { payload: { tag_type: shift.tag_type, tag: shift.tag, displaced: shift.displaced } })
    } else {
      const i = list.indexOf(shift.tag)
      if (i >= 0) list.splice(i, 1)
      pushEvent(s, 'preference_auto_removed', { payload: { tag_type: shift.tag_type, tag: shift.tag } })
    }

    s.preferences.updated_at = new Date().toISOString()
    out.push({
      ...shift,
      label: tagLabel(shift.tag_type, shift.tag),
      displacedLabel: shift.displaced ? tagLabel(shift.tag_type, shift.displaced) : undefined,
    })
  }
  return out
}

export function tagLabel(type: 'style' | 'color' | 'mood', tag: string): string {
  if (type === 'style') return STYLE_LABEL[tag as Style] ?? tag
  if (type === 'color') return COLOR_LABEL[tag as Color] ?? tag
  return MOOD_LABEL[tag as Mood] ?? tag
}
