/**
 * EXPLAINABILITY — PRD §39
 *
 * The line, resolving v1.0's direct contradiction between §39 ("never expose
 * scoring") and §22 ("94% match"):
 *
 *   ALLOWED   — a match percentage, and plain-language statements of WHICH
 *               attributes matched.
 *   FORBIDDEN — weights, the formula, component sub-scores, or any phrasing
 *               like "style_match: 0.8".
 *
 * A percentage is a friendly summary. A weight vector is an internals leak.
 * Nothing in this file may emit a number that the user did not themselves
 * choose, other than the single overall percentage.
 */

import {
  COLOR_LABEL, MOOD_LABEL, STYLE_LABEL, SIZE_LABEL, USER_ROOM_LABEL,
  joinLabels, ROOM_WILDCARD,
} from '../taxonomy'
import type { Color, Mood, Style, UserRoom } from '../taxonomy'
import type { Component, ScoreArtwork, ScoreProfile, ScoreResult } from './score'
import { COMPONENTS } from './score'

// ---------------------------------------------------------------------------
// §39.2 — Reason chips.
// ---------------------------------------------------------------------------

export interface Reason {
  /** Stable key, logged as `reason` on `artwork_viewed` (§40). */
  key: string
  text: string
}

export const REASON_FEATURED: Reason = { key: 'featured', text: 'Featured' }
export const REASON_GENERIC: Reason  = { key: 'generic',  text: 'Made for you' }

/** The largest weight × component contribution. */
export function topComponent(result: ScoreResult): Component {
  return COMPONENTS.reduce((best, k) =>
    result.contributions[k] > result.contributions[best] ? k : best, COMPONENTS[0])
}

export function reasonChip(
  result: ScoreResult | null,
  profile: ScoreProfile | null,
): Reason {
  if (!result || !profile) return REASON_FEATURED

  // Affinity overrides all — this is the visible payoff of §13.
  if (result.affinity_bonus >= 0.15) {
    return { key: 'affinity', text: 'Similar to pieces you’ve saved' }
  }

  const top = topComponent(result)
  const c = result.components
  const m = result.matched

  if (top === 'style' && c.style >= 0.5 && m.styles.length > 0) {
    return { key: 'style', text: `Because you like ${STYLE_LABEL[m.styles[0] as Style].toLowerCase()} art` }
  }
  if (top === 'color' && c.color >= 0.5 && m.colors.length > 0) {
    const names = joinLabels(m.colors.slice(0, 2).map((s) => COLOR_LABEL[s as Color].toLowerCase()))
    return { key: 'color', text: `Your palette: ${names}` }
  }
  if (top === 'mood' && m.moods.length > 0) {
    return { key: 'mood', text: `Feels ${MOOD_LABEL[m.moods[0] as Mood].toLowerCase()}` }
  }
  if (top === 'room' && c.room === 1.0) {
    return { key: 'room', text: `Made for your ${USER_ROOM_LABEL[profile.room as UserRoom].toLowerCase()}` }
  }
  if (top === 'size' || top === 'boldness') {
    return { key: 'scale', text: 'The right scale for your wall' }
  }
  return REASON_GENERIC
}

// ---------------------------------------------------------------------------
// §39.3 — The "Why this piece" panel.
//
// Non-matching attributes render with a neutral dash and an honest note, never
// hidden. This is where the product earns the word "personalized".
// ---------------------------------------------------------------------------

export interface WhyLine {
  matched: boolean
  text: string
  component: Component
}

export function whyThisPiece(
  profile: ScoreProfile,
  art: ScoreArtwork & { width_in: number; height_in: number },
  result: ScoreResult,
  budgetBandLabel: string,
): WhyLine[] {
  const lines: WhyLine[] = []
  const m = result.matched

  // Style
  if (m.styles.length > 0) {
    const names = joinLabels(m.styles.map((s) => STYLE_LABEL[s as Style]))
    lines.push({
      matched: true, component: 'style',
      text: `${names} — ${m.styles.length === 1 ? 'one of your styles' : `${numWord(m.styles.length)} of your styles`}`,
    })
  } else {
    const names = joinLabels(art.styles.map((s) => STYLE_LABEL[s as Style]), 'or')
    lines.push({ matched: false, component: 'style', text: `${names} isn’t one of your styles` })
  }

  // Colour
  if (m.colors.length > 0) {
    const names = joinLabels(m.colors.map((s) => COLOR_LABEL[s as Color].toLowerCase()))
    lines.push({ matched: true, component: 'color', text: `${sentenceCase(names)} — your palette` })
  } else {
    const names = joinLabels(art.colors.map((s) => COLOR_LABEL[s as Color].toLowerCase()), 'and')
    lines.push({ matched: false, component: 'color', text: `Mostly ${names}, which isn’t in your palette` })
  }

  // Mood
  if (m.moods.length > 0) {
    const names = joinLabels(m.moods.map((s) => MOOD_LABEL[s as Mood]))
    lines.push({ matched: true, component: 'mood', text: `${names} — the feeling you asked for` })
  } else if (profile.moods.length > 0) {
    const names = joinLabels(art.moods.map((s) => MOOD_LABEL[s as Mood].toLowerCase()), 'and')
    lines.push({ matched: false, component: 'mood', text: `Reads ${names}, not the feeling you asked for` })
  }

  // Room
  if (profile.room === ROOM_WILDCARD) {
    lines.push({ matched: true, component: 'room', text: 'You didn’t pin a room, so we didn’t weigh one' })
  } else if (m.room) {
    lines.push({
      matched: true, component: 'room',
      text: `Tagged for ${USER_ROOM_LABEL[profile.room].toLowerCase()}s`,
    })
  } else {
    lines.push({
      matched: false, component: 'room',
      text: `Not specifically tagged for ${USER_ROOM_LABEL[profile.room].toLowerCase()}s`,
    })
  }

  // Size — always states the user's own numbers, never a score.
  const dims = `${trim(art.width_in)} × ${trim(art.height_in)} in`
  if (art.size_category === profile.size_preference) {
    lines.push({
      matched: true, component: 'size',
      text: `${SIZE_LABEL[art.size_category]} (${dims}) — your size`,
    })
  } else {
    lines.push({
      matched: false, component: 'size',
      text: `${SIZE_LABEL[art.size_category]} (${dims}) — you asked for ${SIZE_LABEL[profile.size_preference].toLowerCase()}`,
    })
  }

  // Boldness
  const dB = Math.abs(profile.boldness - art.boldness)
  if (dB === 0) {
    lines.push({
      matched: true, component: 'boldness',
      text: `Boldness ${art.boldness} of 10 — exactly where you set it`,
    })
  } else if (dB <= 2) {
    lines.push({
      matched: true, component: 'boldness',
      text: `Boldness ${art.boldness} of 10 — close to your ${profile.boldness}`,
    })
  } else {
    lines.push({
      matched: false, component: 'boldness',
      text: `Boldness ${art.boldness} of 10 — you set yours at ${profile.boldness}`,
    })
  }

  // Budget — stated as the monthly equivalent, against the band the user picked.
  const monthly = Math.round(art.comparison_price)
  if (result.components.budget >= 1) {
    lines.push({ matched: true, component: 'budget', text: `$${monthly}/month — inside your ${budgetBandLabel} budget` })
  } else if (result.components.budget >= 0.9) {
    lines.push({ matched: true, component: 'budget', text: `$${monthly}/month — under your ${budgetBandLabel} budget` })
  } else {
    lines.push({ matched: false, component: 'budget', text: `$${monthly}/month — above your ${budgetBandLabel} budget` })
  }

  return lines
}

// ---------------------------------------------------------------------------
// §39.4 — Section labels. Never label a cold-start feed "Made for you" (§12.11).
// ---------------------------------------------------------------------------
export const SECTION_LABELS = {
  personalized: 'Made for you',
  coldStart:    'Featured this week',
  becauseStyle: (style: string) => `Because you like ${style.toLowerCase()} art`,
  room:         (room: string) => `Fits your ${room.toLowerCase()}`,
  space:        'Matches your space',
  mightLove:    'You might love this',
  saved:        'Similar to pieces you’ve saved',
  exploreAll:   'Explore all',
  moreLikeThis: 'More like this',
} as const

// ---------------------------------------------------------------------------
function trim(n: number): string { return Number.isInteger(n) ? String(n) : n.toFixed(1) }
function sentenceCase(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
function numWord(n: number): string {
  return ['zero', 'one', 'two', 'three', 'four', 'five'][n] ?? String(n)
}
