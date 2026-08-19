/**
 * PALETTES — PRD §37.2.
 *
 * "the palette can be driven from the piece's own color tags, which means tags
 *  and images actually agree."
 *
 * That agreement is the whole argument for generating imagery rather than
 * licensing it: a user who filters to `blue` gets pieces that are visibly blue,
 * so §12's colour scoring is legible on screen instead of being a claim.
 *
 * Each entry is an ordered ramp from light to deep. Generators draw grounds
 * from the light end and marks from the deep end.
 */

import type { Rng } from './rng'

export type ColorSlug =
  | 'neutral' | 'monochrome' | 'blue' | 'green' | 'red'
  | 'orange' | 'yellow' | 'purple' | 'earth' | 'vibrant'

export const RAMPS: Record<ColorSlug, string[]> = {
  neutral:    ['#F6F3EE', '#E9E3DA', '#D5CCC0', '#B5A899', '#8C8073', '#5E564C'],
  monochrome: ['#FFFFFF', '#E8E8E8', '#B8B8B8', '#6E6E6E', '#2E2E2E', '#111111'],
  blue:       ['#EAF0F6', '#C6D9E8', '#8FB4D0', '#4E7FA8', '#2E5A80', '#1B3A57'],
  green:      ['#EEF3EA', '#CFE0C8', '#9DC095', '#63935C', '#3E6B3C', '#26482A'],
  red:        ['#F8EDEA', '#EFCFC7', '#DC9C8E', '#BF5F4C', '#96382B', '#68211A'],
  orange:     ['#FBF0E4', '#F5D9B8', '#E9AF74', '#D4823C', '#AC5C1E', '#7A3D12'],
  yellow:     ['#FCF6E2', '#F6E7B4', '#EBD275', '#D9B23F', '#B08A22', '#7C6015'],
  purple:     ['#F2EFF7', '#DCD3EA', '#B7A6D2', '#8B74AF', '#63508A', '#42335F'],
  earth:      ['#F5EFE6', '#E3D5C1', '#C9B294', '#A88A64', '#7E6343', '#54402A'],
  vibrant:    ['#FFF3E8', '#FFD6A5', '#FF8A5B', '#E4572E', '#8B2E5D', '#2E4A8B'],
}

/** The warm off-white the UI sits on — grounds bias toward it so the artwork
 *  sits in the page rather than fighting it (DESIGN.md §1). */
export const PAPER = '#F4F1EA'

export interface Palette {
  /** Lightest — grounds and washes. */
  ground: string
  /** Mid tones — the body of the composition. */
  mid: string[]
  /** Deepest — marks, lines, silhouettes. */
  deep: string
  /** A contrasting accent drawn from a secondary tag, when one exists. */
  accent: string
  /** The full pooled ramp, for generators that want free range. */
  all: string[]
}

/**
 * Build a palette from an artwork's colour tags.
 * The FIRST tag is the dominant colour (§11.1: "The dominant color first").
 */
export function buildPalette(colors: ColorSlug[], rng: Rng): Palette {
  const primary = colors[0] ?? 'neutral'
  const secondary = colors[1] ?? primary
  const pRamp = RAMPS[primary]
  const sRamp = RAMPS[secondary]

  // 'vibrant' means high chroma and high contrast, so its ground stays light
  // and its accent comes from the far end of the ramp.
  const groundIdx = primary === 'monochrome' ? 0 : rng.int(0, 1)

  // THREE mids from the dominant ramp, ONE from the secondary. An even split
  // let a neutral secondary grey out a piece tagged `blue` — which breaks the
  // one property that justifies generating imagery at all: that a piece tagged
  // blue is visibly blue, so §12's colour scoring is legible on screen.
  return {
    ground: pRamp[groundIdx],
    mid: [pRamp[2], pRamp[3], pRamp[4], sRamp[3]],
    deep: pRamp[5],
    accent: primary === secondary ? pRamp[4] : sRamp[rng.int(3, 5)],
    all: [...new Set([...pRamp, ...pRamp.slice(2, 5), ...sRamp])],
  }
}

/** Hex -> `rgba()` with an explicit alpha, for layered washes. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
}

/** Perceptual lightness (0–1), used to keep marks readable against grounds. */
export function lightness(hex: string): number {
  const h = hex.replace('#', '')
  const n = parseInt(h, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Pick whichever of two colours reads more strongly against `bg`. */
export function contrastPick(bg: string, a: string, b: string): string {
  const lb = lightness(bg)
  return Math.abs(lightness(a) - lb) >= Math.abs(lightness(b) - lb) ? a : b
}
