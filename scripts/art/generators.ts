/**
 * GENERATIVE ART ENGINE — PRD §37.2, Source A.
 *
 * Twelve distinct compositional algorithms, one per style family, so that a
 * feed filtered to `minimalist` looks nothing like a feed filtered to `pop`.
 * §52.4 names "artwork looks like placeholder art and the demo falls flat" as
 * the top risk; a single generator with a recoloured palette IS placeholder art.
 *
 * Two properties every generator must hold:
 *   1. Palette comes from the piece's own colour tags, so tags and image agree.
 *   2. `boldness` (§9.6) drives contrast, scale, and density, so the boldness
 *      slider is legible on screen rather than being an unverifiable number.
 *
 * Output is SVG. `render.ts` rasterises it and composites film grain.
 */

import type { Rng } from './rng'
import { alpha, contrastPick, type Palette } from './palette'

export interface GenContext {
  w: number
  h: number
  rng: Rng
  pal: Palette
  /** 1–10 (§9.6). 1 recedes into the room; 10 dominates the wall. */
  boldness: number
  /**
   * Optional AUTHORED composition mode, from the artwork's seed row.
   *
   * Descriptions in the seed are specific — "one horizontal rule stopping four
   * inches short of the right edge", "a single band of deep blue across the
   * lower third". A generator that picks its own composition at random will
   * eventually contradict the text sitting next to it on the detail page, and a
   * caption that describes a different painting is worse than no caption.
   * When this is set, the generator uses it instead of drawing a mode.
   */
  mode?: number
}

export type GeneratorName =
  | 'colorField' | 'hardEdge' | 'minimal' | 'halftone' | 'strata'
  | 'pointillist' | 'figure' | 'stencil' | 'dreamscape' | 'collage'
  | 'ink' | 'lightStudy'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Boldness 1..10 -> 0..1. */
const b01 = (b: number) => (b - 1) / 9

/**
 * A blur filter whose region is expanded well beyond the element bounds.
 * Without this, librsvg clips the blur at the default 110% filter region and
 * every soft form gains a hard rectangular edge.
 */
function blurFilter(id: string, std: number): string {
  // The filter region MUST be expressed in user space and sized from the blur
  // radius, not as a percentage of the element's bounding box. A percentage
  // region clips any blur whose spread exceeds it, which puts a hard soft-edged
  // RECTANGLE around the element — visible as a pale box in the sky on the
  // first render of every landscape.
  const pad = Math.ceil(std * 3.5)
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="${-pad}" y="${-pad}" ` +
         `width="${pad * 2 + 4000}" height="${pad * 2 + 4000}" color-interpolation-filters="sRGB">` +
         `<feGaussianBlur stdDeviation="${std.toFixed(1)}"/></filter>`
}

/** A closed organic blob through `n` points, as a smooth cubic path. */
function blobPath(cx: number, cy: number, r: number, n: number, wobble: number, rng: Rng): string {
  const pts: Array<[number, number]> = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const rr = r * (1 + rng.range(-wobble, wobble))
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * rng.range(0.75, 1.25)])
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[i]
    const p1 = pts[(i + 1) % n]
    const mx = (p0[0] + p1[0]) / 2
    const my = (p0[1] + p1[1]) / 2
    d += ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
  }
  return d + 'Z'
}

/** A hand-drawn-feeling polyline: straight, but never mechanically straight. */
function jitterLine(x1: number, y1: number, x2: number, y2: number, segs: number, amp: number, rng: Rng): string {
  let d = `M${x1.toFixed(1)} ${y1.toFixed(1)}`
  for (let i = 1; i <= segs; i++) {
    const t = i / segs
    const x = x1 + (x2 - x1) * t + rng.range(-amp, amp)
    const y = y1 + (y2 - y1) * t + rng.range(-amp, amp)
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

/**
 * A loaded-brush stroke, drawn as a FILLED PATH whose width varies along its
 * spine — wide and wet at the start, tapering to nothing as the ink runs out.
 *
 * SVG has no variable-width stroke, and the obvious workaround (many short
 * `<line>` segments at decreasing widths) produces a lumpy, shaky edge that
 * reads as crayon rather than as calligraphy. Offsetting the spine
 * perpendicular by half the local width and closing the shape gives a true
 * brush contour.
 */
function brushStroke(
  x1: number, y1: number, x2: number, y2: number,
  maxWidth: number, curvature: number, rng: Rng,
): string {
  const N = 40
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  // Unit normal to the spine.
  const nx = -dy / len, ny = dx / len
  // A single smooth bow, so the stroke is never mechanically straight.
  const bow = curvature * len
  const phase = rng.range(0.3, 0.7)

  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    // Spine, bowed by a half-sine.
    const cx = x1 + dx * t + nx * bow * Math.sin(Math.PI * t) * (t < phase ? 1 : 0.85)
    const cy = y1 + dy * t + ny * bow * Math.sin(Math.PI * t) * (t < phase ? 1 : 0.85)
    // Width profile: quick swell, long dry taper. `^2.2` keeps the tail thin
    // for most of its length, which is what a drying brush actually does.
    const swell = Math.min(1, t / 0.06)
    const taper = Math.pow(1 - t, 2.2)
    const wob = 1 + rng.range(-0.08, 0.08)
    const hw = (maxWidth / 2) * swell * (0.25 + 0.75 * taper) * wob
    left.push(`${(cx + nx * hw).toFixed(1)} ${(cy + ny * hw).toFixed(1)}`)
    right.push(`${(cx - nx * hw).toFixed(1)} ${(cy - ny * hw).toFixed(1)}`)
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')}Z`
}

/** A torn-paper edge, for collage. */
function tornRect(x: number, y: number, w: number, h: number, rough: number, rng: Rng): string {
  const step = Math.max(6, w / 24)
  let d = `M${x} ${y}`
  for (let px = x; px < x + w; px += step) d += ` L${(px + step).toFixed(1)} ${(y + rng.range(-rough, rough)).toFixed(1)}`
  for (let py = y; py < y + h; py += step) d += ` L${(x + w + rng.range(-rough, rough)).toFixed(1)} ${(py + step).toFixed(1)}`
  for (let px = x + w; px > x; px -= step) d += ` L${(px - step).toFixed(1)} ${(y + h + rng.range(-rough, rough)).toFixed(1)}`
  for (let py = y + h; py > y; py -= step) d += ` L${(x + rng.range(-rough, rough)).toFixed(1)} ${(py - step).toFixed(1)}`
  return d + 'Z'
}

// ---------------------------------------------------------------------------
// 1. colorField — abstract. Layered soft washes and large organic forms.
// ---------------------------------------------------------------------------
function colorField({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const m = Math.min(w, h)

  // FOUR STRUCTURAL MODES, not one composition with jittered coordinates.
  // Parametric jitter alone produced six near-identical paintings for the same
  // artist — a body of work has to vary in structure, not only in position.
  const mode = ctxMode ?? rng.int(0, 3)

  defs.push(`<linearGradient id="cfg" x1="0" y1="0" x2="${rng.range(0.1, 0.9).toFixed(2)}" y2="1">
    <stop offset="0" stop-color="${pal.ground}"/>
    <stop offset="1" stop-color="${pal.mid[0]}"/></linearGradient>`)
  body.push(`<rect width="${w}" height="${h}" fill="url(#cfg)"/>`)

  if (mode === 0) {
    // A — stacked horizontal registers, poured and left to find their edges.
    const bands = rng.int(3, 6)
    let y = h * rng.range(0.05, 0.2)
    for (let i = 0; i < bands; i++) {
      const bh = (h - y) * rng.range(0.2, 0.5)
      defs.push(blurFilter(`cfr${i}`, bh * rng.range(0.08, 0.22)))
      body.push(`<rect x="${(-w * 0.05).toFixed(1)}" y="${y.toFixed(1)}" width="${(w * 1.1).toFixed(1)}" height="${bh.toFixed(1)}" fill="${rng.pick([...pal.mid, pal.accent])}" opacity="${(0.35 + B * 0.45).toFixed(2)}" filter="url(#cfr${i})"/>`)
      y += bh * rng.range(0.55, 1.0)
      if (y > h) break
    }
  } else if (mode === 1) {
    // B — one dominant mass against open ground.
    const r = m * rng.range(0.32, 0.5)
    defs.push(blurFilter('cfm', r * rng.range(0.08, 0.16)))
    body.push(`<path d="${blobPath(w * rng.range(0.32, 0.68), h * rng.range(0.34, 0.66), r, rng.int(7, 12), 0.24, rng)}" fill="${pal.mid[rng.int(1, 3)]}" opacity="${(0.55 + B * 0.4).toFixed(2)}" filter="url(#cfm)"/>`)
    const r2 = r * rng.range(0.3, 0.55)
    defs.push(blurFilter('cfm2', r2 * 0.1))
    body.push(`<path d="${blobPath(w * rng.range(0.25, 0.75), h * rng.range(0.25, 0.75), r2, rng.int(6, 10), 0.3, rng)}" fill="${pal.accent}" opacity="${(0.5 + B * 0.4).toFixed(2)}" filter="url(#cfm2)"/>`)
  } else if (mode === 2) {
    // C — a diagonal split between two fields.
    const t = rng.range(0.3, 0.7)
    const skew = rng.range(-0.35, 0.35)
    defs.push(blurFilter('cfd', m * rng.range(0.02, 0.07)))
    body.push(`<path d="M0 ${(h * (t - skew)).toFixed(1)} L${w} ${(h * (t + skew)).toFixed(1)} L${w} ${h} L0 ${h}Z" fill="${pal.mid[rng.int(1, 3)]}" opacity="${(0.6 + B * 0.35).toFixed(2)}" filter="url(#cfd)"/>`)
    const r = m * rng.range(0.14, 0.26)
    defs.push(blurFilter('cfd2', r * 0.12))
    body.push(`<path d="${blobPath(w * rng.range(0.2, 0.8), h * rng.range(0.15, 0.5), r, rng.int(6, 10), 0.28, rng)}" fill="${pal.accent}" opacity="${(0.5 + B * 0.4).toFixed(2)}" filter="url(#cfd2)"/>`)
  } else {
    // D — many overlapping veils, no single subject.
    const layers = 5 + Math.round(B * 4)
    for (let i = 0; i < layers; i++) {
      const r = m * rng.range(0.18, 0.42)
      defs.push(blurFilter(`cfv${i}`, r * rng.range(0.1, 0.22)))
      body.push(`<path d="${blobPath(rng.range(0.05, 0.95) * w, rng.range(0.05, 0.95) * h, r, rng.int(6, 11), 0.32, rng)}" fill="${rng.pick([...pal.mid, pal.accent, pal.deep])}" opacity="${(0.2 + B * 0.3).toFixed(2)}" filter="url(#cfv${i})"/>`)
    }
  }

  // Optional gesture. NOT on every piece — a signature mark that appears on all
  // six of an artist's works stops being a signature and becomes a template.
  //
  // Mode 0 (poured registers) is EXEMPT: a register painting is already a
  // complete composition, and a thin line drawn across it reads as a crack in
  // the canvas rather than as a mark. That was visibly wrong on "Blue Horizon",
  // which is the piece the demo opens on.
  const gesture = mode === 0 ? 2 : rng.int(0, 2)
  if (gesture === 0 && boldness >= 3) {
    const gy = rng.range(0.25, 0.75) * h
    body.push(`<path d="${jitterLine(-w * 0.05, gy, w * 1.05, gy + rng.range(-h * 0.2, h * 0.2), 16, h * 0.012, rng)}" fill="none" stroke="${pal.deep}" stroke-width="${(m * (0.004 + B * 0.016)).toFixed(1)}" stroke-linecap="round" opacity="${(0.4 + B * 0.4).toFixed(2)}"/>`)
  } else if (gesture === 1 && boldness >= 4) {
    const gx = rng.range(0.15, 0.85) * w
    body.push(`<path d="${jitterLine(gx, -h * 0.05, gx + rng.range(-w * 0.12, w * 0.12), h * 1.05, 16, w * 0.01, rng)}" fill="none" stroke="${pal.deep}" stroke-width="${(m * (0.004 + B * 0.014)).toFixed(1)}" stroke-linecap="round" opacity="${(0.35 + B * 0.4).toFixed(2)}"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 2. hardEdge — contemporary / geometric abstract. Bauhaus flat geometry.
// ---------------------------------------------------------------------------
function hardEdge({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const m = Math.min(w, h)
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const cols = rng.int(3, 5)
  const rows = rng.int(3, 5)
  const cw = w / cols
  const ch = h / rows
  const shapes = 4 + Math.round(B * 7)
  const ink = contrastPick(pal.ground, pal.deep, pal.accent)

  for (let i = 0; i < shapes; i++) {
    const cx = rng.int(0, cols - 1) * cw
    const cy = rng.int(0, rows - 1) * ch
    const sw = cw * rng.int(1, 2)
    const sh = ch * rng.int(1, 2)
    const col = rng.pick([...pal.mid, pal.accent, ink])
    const op = (0.55 + B * 0.4).toFixed(2)
    const kind = rng.int(0, 3)
    if (kind === 0) {
      body.push(`<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${sw.toFixed(1)}" height="${sh.toFixed(1)}" fill="${col}" opacity="${op}"/>`)
    } else if (kind === 1) {
      const r = Math.min(sw, sh) / 2
      body.push(`<circle cx="${(cx + sw / 2).toFixed(1)}" cy="${(cy + sh / 2).toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" opacity="${op}"/>`)
    } else if (kind === 2) {
      // Quarter arc — the Bauhaus signature.
      const r = Math.min(sw, sh)
      const q = rng.int(0, 3)
      const [ax, ay] = [cx + (q % 2 ? r : 0), cy + (q > 1 ? r : 0)]
      body.push(`<path d="M${ax} ${cy + (q > 1 ? r : 0)} A${r} ${r} 0 0 ${q % 2 ? 1 : 0} ${cx + (q % 2 ? 0 : r)} ${cy + (q > 1 ? 0 : r)} L${ax} ${ay}Z" fill="${col}" opacity="${op}"/>`)
    } else {
      body.push(`<path d="M${cx} ${cy + sh} L${(cx + sw / 2).toFixed(1)} ${cy} L${(cx + sw).toFixed(1)} ${(cy + sh).toFixed(1)}Z" fill="${col}" opacity="${op}"/>`)
    }
  }

  // Thin rules re-impose the grid over the shapes.
  const rules = rng.int(1, 3)
  for (let i = 0; i < rules; i++) {
    const vertical = rng.bool()
    const p = rng.range(0.15, 0.85)
    body.push(vertical
      ? `<line x1="${(p * w).toFixed(1)}" y1="0" x2="${(p * w).toFixed(1)}" y2="${h}" stroke="${ink}" stroke-width="${(m * (0.002 + B * 0.006)).toFixed(1)}" opacity="0.7"/>`
      : `<line x1="0" y1="${(p * h).toFixed(1)}" x2="${w}" y2="${(p * h).toFixed(1)}" stroke="${ink}" stroke-width="${(m * (0.002 + B * 0.006)).toFixed(1)}" opacity="0.7"/>`)
  }
  return wrap(w, h, [], body)
}

// ---------------------------------------------------------------------------
// 3. minimal — minimalist. One to three elements, vast negative space.
// ---------------------------------------------------------------------------
function minimal({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const ink = contrastPick(pal.ground, pal.deep, pal.accent)
  const m = Math.min(w, h)

  // Scale genuinely tracks boldness. At boldness 1 the piece must actually
  // recede into the room (§9.6); the first pass drew a large black disc at
  // boldness 1, which is the opposite of what the tag promises.
  const S = 0.35 + B * 0.9        // overall element scale
  const weight = m * (0.004 + B * 0.022)   // stroke weight, RELATIVE to the canvas
  const mode = ctxMode ?? rng.int(0, 7)

  if (mode === 0) {
    const y = h * rng.range(0.4, 0.66)
    const inset = w * rng.range(0.08, 0.2)
    body.push(`<rect x="${inset.toFixed(1)}" y="${y.toFixed(1)}" width="${(w - inset * 2).toFixed(1)}" height="${weight.toFixed(1)}" fill="${ink}"/>`)
    body.push(`<circle cx="${(w * rng.range(0.24, 0.76)).toFixed(1)}" cy="${(y - m * 0.16 * S).toFixed(1)}" r="${(m * 0.05 * S).toFixed(1)}" fill="${pal.accent}"/>`)
  } else if (mode === 1) {
    const r = m * 0.24 * S
    const cx = w * rng.range(0.28, 0.72)
    const cy = h * rng.range(0.32, 0.68)
    body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${rng.bool() ? ink : pal.accent}"/>`)
    body.push(`<rect x="0" y="${(h * rng.range(0.72, 0.88)).toFixed(1)}" width="${w}" height="${(weight * 0.4).toFixed(1)}" fill="${ink}" opacity="0.75"/>`)
  } else if (mode === 2) {
    const n = rng.int(4, 8)
    const top = h * rng.range(0.16, 0.3)
    const gap = (h * rng.range(0.42, 0.6)) / n
    for (let i = 0; i < n; i++) {
      const len = w * (0.16 + (i / Math.max(1, n - 1)) * 0.62)
      body.push(`<rect x="${(w * 0.12).toFixed(1)}" y="${(top + i * gap).toFixed(1)}" width="${len.toFixed(1)}" height="${(weight * 0.55).toFixed(1)}" fill="${i === n - 1 ? pal.accent : ink}" opacity="${(0.5 + (i / n) * 0.5).toFixed(2)}"/>`)
    }
  } else if (mode === 3 || mode === 7) {
    // 3 = a vertical band holding one edge. 7 = the horizontal equivalent.
    // Split deterministically so an authored mode always produces the
    // composition its caption describes.
    const frac = rng.range(0.24, 0.44)
    const atStart = rng.bool()
    body.push(mode === 3
      ? `<rect x="${atStart ? '0' : (w * (1 - frac)).toFixed(1)}" y="0" width="${(w * frac).toFixed(1)}" height="${h}" fill="${pal.accent}"/>`
      : `<rect x="0" y="${atStart ? '0' : (h * (1 - frac)).toFixed(1)}" width="${w}" height="${(h * frac).toFixed(1)}" fill="${pal.accent}"/>`)
    body.push(`<circle cx="${(w * rng.range(0.3, 0.7)).toFixed(1)}" cy="${(h * rng.range(0.3, 0.7)).toFixed(1)}" r="${(m * 0.06 * S).toFixed(1)}" fill="${ink}"/>`)
  } else if (mode === 4) {
    const r = m * rng.range(0.24, 0.38)
    const cx = w * rng.range(0.32, 0.68)
    const cy = h * rng.range(0.38, 0.66)
    const sweep = rng.bool() ? 1 : 0
    body.push(`<path d="M${(cx - r).toFixed(1)} ${cy.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${sweep} ${(cx + r).toFixed(1)} ${cy.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="${(weight * 0.9).toFixed(1)}" stroke-linecap="round"/>`)
    body.push(`<circle cx="${(cx + r * rng.range(-0.6, 0.6)).toFixed(1)}" cy="${(cy + m * 0.14 * (sweep ? 1 : -1)).toFixed(1)}" r="${(m * 0.028 * S).toFixed(1)}" fill="${pal.accent}"/>`)
  } else if (mode === 5) {
    // A single long stroke, corner to corner, dry at one end.
    const x1 = w * rng.range(0.1, 0.3), y1 = h * rng.range(0.08, 0.25)
    const x2 = w * rng.range(0.65, 0.92), y2 = h * rng.range(0.7, 0.94)
    body.push(`<path d="${jitterLine(x1, y1, x2, y2, 18, m * 0.006, rng)}" fill="none" stroke="${ink}" stroke-width="${(weight * 1.2).toFixed(1)}" stroke-linecap="round" opacity="0.92"/>`)
    body.push(`<circle cx="${(w * rng.range(0.15, 0.85)).toFixed(1)}" cy="${(h * rng.range(0.15, 0.85)).toFixed(1)}" r="${(m * 0.03 * S).toFixed(1)}" fill="${pal.accent}"/>`)
  } else {
    // GESTURAL — one to three loaded-brush strokes that run dry.
    // This is the vocabulary of the sumi-ink and hand-torn-rag artists in the
    // seed; drawing them as geometry would contradict every word of their bios.
    const strokes = rng.int(1, 3)
    for (let i = 0; i < strokes; i++) {
      const vertical = rng.bool(0.62)
      const t = strokes === 1 ? rng.range(0.4, 0.6) : 0.26 + (i / Math.max(1, strokes - 1)) * 0.48
      const x1 = vertical ? w * (t + rng.range(-0.05, 0.05)) : w * rng.range(0.07, 0.18)
      const y1 = vertical ? h * rng.range(0.07, 0.17) : h * (t + rng.range(-0.05, 0.05))
      const x2 = vertical ? x1 + rng.range(-w * 0.09, w * 0.09) : w * rng.range(0.82, 0.94)
      const y2 = vertical ? h * rng.range(0.83, 0.94) : y1 + rng.range(-h * 0.1, h * 0.1)
      const width = m * (0.045 + B * 0.075) * (i === 0 ? 1 : rng.range(0.55, 0.85))
      body.push(`<path d="${brushStroke(x1, y1, x2, y2, width, rng.range(-0.06, 0.06), rng)}" fill="${ink}" opacity="${rng.range(0.86, 0.97).toFixed(2)}"/>`)

      // Flecks where the dry brush skipped off the paper.
      const flecks = rng.int(3, 8)
      for (let f = 0; f < flecks; f++) {
        const ft = rng.range(0.55, 1.0)
        const fx = x1 + (x2 - x1) * ft + rng.range(-width * 0.5, width * 0.5)
        const fy = y1 + (y2 - y1) * ft + rng.range(-width * 0.5, width * 0.5)
        body.push(`<ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="${(width * rng.range(0.04, 0.14)).toFixed(1)}" ry="${(width * rng.range(0.03, 0.1)).toFixed(1)}" fill="${ink}" opacity="${rng.range(0.3, 0.7).toFixed(2)}"/>`)
      }
    }
    if (rng.bool(0.5)) {
      body.push(`<circle cx="${(w * rng.range(0.15, 0.85)).toFixed(1)}" cy="${(h * rng.range(0.72, 0.9)).toFixed(1)}" r="${(m * 0.022 * S).toFixed(1)}" fill="${pal.accent}"/>`)
    }
  }
  return wrap(w, h, [], body)
}

// ---------------------------------------------------------------------------
// 4. halftone — pop art. Flat bold shapes under a dot screen.
// ---------------------------------------------------------------------------
function halftone({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const bg = rng.pick([pal.mid[0], pal.ground])
  body.push(`<rect width="${w}" height="${h}" fill="${bg}"/>`)

  const dot = Math.max(5, Math.min(w, h) / rng.range(26, 46))
  defs.push(`<pattern id="ht" width="${dot}" height="${dot}" patternUnits="userSpaceOnUse" patternTransform="rotate(${rng.int(0, 45)})">
    <circle cx="${(dot / 2).toFixed(2)}" cy="${(dot / 2).toFixed(2)}" r="${(dot * 0.28).toFixed(2)}" fill="${pal.deep}" opacity="${(0.5 + B * 0.45).toFixed(2)}"/>
  </pattern>`)

  const bands = rng.int(2, 4)
  for (let i = 0; i < bands; i++) {
    const bh = h / bands
    body.push(`<rect x="0" y="${(i * bh).toFixed(1)}" width="${w}" height="${bh.toFixed(1)}" fill="${rng.pick([pal.accent, pal.mid[1], pal.mid[2]])}" opacity="${(0.6 + B * 0.35).toFixed(2)}"/>`)
  }
  body.push(`<rect width="${w}" height="${h}" fill="url(#ht)"/>`)

  // A bold silhouette on top, in the flat pop register.
  const m = Math.min(w, h)
  const cx = w * rng.range(0.3, 0.7)
  const cy = h * rng.range(0.35, 0.65)
  const r = m * (0.16 + B * 0.16)
  const kind = ctxMode ?? rng.int(0, 2)
  const ink = pal.deep
  if (kind === 0) {
    body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${ink}"/>`)
    body.push(`<circle cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.3).toFixed(1)}" r="${(r * 0.42).toFixed(1)}" fill="${pal.ground}"/>`)
  } else if (kind === 1) {
    // Concentric rings, hard-edged.
    for (let i = 4; i >= 1; i--) {
      body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * i / 4).toFixed(1)}" fill="${i % 2 ? ink : pal.ground}"/>`)
    }
  } else {
    const s = r * 1.5
    body.push(`<rect x="${(cx - s / 2).toFixed(1)}" y="${(cy - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" fill="${ink}" transform="rotate(${rng.int(-20, 20)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`)
    body.push(`<rect x="${(cx - s / 4).toFixed(1)}" y="${(cy - s / 4).toFixed(1)}" width="${(s / 2).toFixed(1)}" height="${(s / 2).toFixed(1)}" fill="${pal.accent}" transform="rotate(${rng.int(-20, 20)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 5. strata — landscape. Layered ridgelines with atmospheric perspective.
// ---------------------------------------------------------------------------
function strata({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const m = Math.min(w, h)

  // Horizon placement is the single biggest lever on how a landscape reads, so
  // it varies widely: a high horizon is a valley, a low one is a sky painting.
  const horizon = h * rng.range(0.32, 0.74)
  const highKey = rng.bool(0.45)

  defs.push(`<linearGradient id="sky" x1="${rng.range(0, 0.4).toFixed(2)}" y1="0" x2="${rng.range(0.6, 1).toFixed(2)}" y2="1">
    <stop offset="0" stop-color="${highKey ? pal.ground : pal.mid[0]}"/>
    <stop offset="0.6" stop-color="${pal.mid[highKey ? 0 : 1]}"/>
    <stop offset="1" stop-color="${pal.mid[1]}"/></linearGradient>`)
  body.push(`<rect width="${w}" height="${h}" fill="url(#sky)"/>`)

  // Bands of cloud, on some pieces only.
  if (rng.bool(0.5)) {
    defs.push(blurFilter('cld', m * 0.03))
    for (let i = 0; i < rng.int(2, 5); i++) {
      const cy = horizon * rng.range(0.1, 0.8)
      body.push(`<ellipse cx="${(w * rng.range(0.1, 0.9)).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(w * rng.range(0.15, 0.45)).toFixed(1)}" ry="${(h * rng.range(0.01, 0.045)).toFixed(1)}" fill="${rng.bool() ? pal.ground : pal.accent}" opacity="${rng.range(0.12, 0.4).toFixed(2)}" filter="url(#cld)"/>`)
    }
  }

  // Sun, on roughly two thirds.
  if (rng.bool(0.65)) {
    defs.push(blurFilter('sunb', m * 0.035))
    const sunR = m * rng.range(0.04, 0.1)
    body.push(`<circle cx="${(w * rng.range(0.15, 0.85)).toFixed(1)}" cy="${(horizon * rng.range(0.25, 0.85)).toFixed(1)}" r="${sunR.toFixed(1)}" fill="${pal.accent}" opacity="${(0.4 + B * 0.45).toFixed(2)}" filter="url(#sunb)"/>`)
  }

  const ridges = rng.int(3, 7)
  for (let i = 0; i < ridges; i++) {
    const t = ridges === 1 ? 1 : i / (ridges - 1)
    const baseY = horizon + t * (h - horizon) * rng.range(0.75, 0.95)
    const amp = (h - horizon) * rng.range(0.06, 0.3) * (1 - t * 0.45) + m * 0.01
    let d = `M0 ${(baseY + rng.range(-amp, amp)).toFixed(1)}`
    const segs = rng.int(3, 9)
    for (let sI = 1; sI <= segs; sI++) {
      const x = (w * sI) / segs
      const cx = x - w / segs / 2
      d += ` Q${cx.toFixed(1)} ${(baseY + rng.range(-amp, amp)).toFixed(1)} ${x.toFixed(1)} ${(baseY + rng.range(-amp * 0.6, amp * 0.6)).toFixed(1)}`
    }
    d += ` L${w} ${h} L0 ${h}Z`
    // Atmospheric perspective: distant ridges pale, near ridges deep. That is
    // what makes it read as depth rather than as stacked shapes.
    const col = i === ridges - 1 ? pal.deep : pal.mid[Math.min(pal.mid.length - 1, 1 + Math.floor(t * 2.5))]
    body.push(`<path d="${d}" fill="${col}" opacity="${(0.35 + t * 0.65).toFixed(2)}"/>`)
  }

  // A vertical incident — a lone tree or post — on some pieces.
  if (rng.bool(0.3)) {
    const tx = w * rng.range(0.1, 0.9)
    const th = m * rng.range(0.06, 0.16)
    body.push(`<path d="M${tx.toFixed(1)} ${(h - m * 0.02).toFixed(1)} L${tx.toFixed(1)} ${(h - m * 0.02 - th).toFixed(1)}" stroke="${pal.deep}" stroke-width="${(m * 0.006).toFixed(1)}" stroke-linecap="round" opacity="0.85"/>`)
    body.push(`<ellipse cx="${tx.toFixed(1)}" cy="${(h - m * 0.02 - th).toFixed(1)}" rx="${(th * 0.35).toFixed(1)}" ry="${(th * 0.28).toFixed(1)}" fill="${pal.deep}" opacity="0.8"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 6. pointillist — impressionist. Thousands of small strokes forming a field.
// ---------------------------------------------------------------------------
function pointillist({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const m = Math.min(w, h)

  // Underpainting with STRUCTURE. Random ellipses under random strokes gave
  // every impressionist piece the same confetti reading; a horizon and a mass
  // are what make broken colour resolve into a subject at distance.
  const horizon = h * rng.range(0.4, 0.72)
  defs.push(blurFilter('ub', m * 0.1))
  body.push(`<rect width="${w}" height="${horizon.toFixed(1)}" fill="${pal.mid[0]}" opacity="0.7" filter="url(#ub)"/>`)
  body.push(`<rect y="${horizon.toFixed(1)}" width="${w}" height="${(h - horizon).toFixed(1)}" fill="${pal.mid[2]}" opacity="0.65" filter="url(#ub)"/>`)
  const massCount = rng.int(1, 3)
  for (let i = 0; i < massCount; i++) {
    body.push(`<ellipse cx="${(rng.range(0.15, 0.85) * w).toFixed(1)}" cy="${(horizon + rng.range(-h * 0.12, h * 0.16)).toFixed(1)}" rx="${(w * rng.range(0.12, 0.3)).toFixed(1)}" ry="${(h * rng.range(0.08, 0.2)).toFixed(1)}" fill="${rng.pick([pal.mid[3] ?? pal.deep, pal.accent])}" opacity="0.55" filter="url(#ub)"/>`)
  }

  // Stroke direction follows the ground plane above and below the horizon.
  const n = Math.round(1600 + B * 2000)
  const len = m * (0.011 + B * 0.015)
  const skyAngle = rng.range(-0.35, 0.35)
  const groundAngle = skyAngle + rng.range(0.5, 1.4)
  const strokes: string[] = []
  for (let i = 0; i < n; i++) {
    const x = rng.next() * w
    const y = rng.next() * h
    const a = (y < horizon ? skyAngle : groundAngle) + rng.gauss(0, 0.3)
    const l = len * rng.range(0.6, 1.6)
    strokes.push(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + Math.cos(a) * l).toFixed(1)}" y2="${(y + Math.sin(a) * l).toFixed(1)}" stroke="${rng.pick(pal.all)}" stroke-width="${(len * rng.range(0.3, 0.75)).toFixed(2)}" stroke-linecap="round" opacity="${rng.range(0.3, 0.85).toFixed(2)}"/>`)
  }
  body.push(`<g>${strokes.join('')}</g>`)
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 7. figure — portrait. An abstracted head-and-shoulders in colour blocks.
// ---------------------------------------------------------------------------
function figure({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const m = Math.min(w, h)

  // An ABSTRACTED portrait: overlapping planes that resolve into a head at
  // distance, in the manner of modernist portraiture. A literal head-and-
  // shoulders silhouette reads as a cartoon avatar, and a realistic generated
  // likeness of a fictional person is exactly what §37.4's disclosure
  // requirement exists to avoid.
  //
  // Crop and scale both vary: a tight crop and a full-figure composition are
  // different paintings, not the same painting at two zoom levels.
  const tight = rng.bool(0.4)
  const cx = w * rng.range(0.36, 0.64)
  const cy = h * (tight ? rng.range(0.34, 0.46) : rng.range(0.28, 0.4))
  const rx = m * (tight ? rng.range(0.3, 0.38) : rng.range(0.17, 0.24))
  const ry = rx * rng.range(1.15, 1.42)
  const clip = `hc${Math.round(cx)}`

  const splitX = w * rng.range(0.25, 0.75)
  body.push(`<rect x="0" y="0" width="${splitX.toFixed(1)}" height="${h}" fill="${pal.mid[0]}"/>`)
  defs.push(blurFilter('fgb', m * 0.09))
  body.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(rx * 1.9).toFixed(1)}" ry="${(ry * 1.7).toFixed(1)}" fill="${pal.mid[1]}" opacity="0.5" filter="url(#fgb)"/>`)

  // Shoulders first, so the head sits in front of them.
  body.push(`<path d="M${(cx - rx * 2.7).toFixed(1)} ${h} C${(cx - rx * 2.1).toFixed(1)} ${(cy + ry * 1.15).toFixed(1)} ${(cx - rx * 0.85).toFixed(1)} ${(cy + ry * 0.85).toFixed(1)} ${cx.toFixed(1)} ${(cy + ry * 0.85).toFixed(1)} C${(cx + rx * 0.85).toFixed(1)} ${(cy + ry * 0.85).toFixed(1)} ${(cx + rx * 2.1).toFixed(1)} ${(cy + ry * 1.15).toFixed(1)} ${(cx + rx * 2.7).toFixed(1)} ${h} Z" fill="${pal.deep}" opacity="${(0.78 + B * 0.22).toFixed(2)}"/>`)
  body.push(`<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${pal.mid[2] ?? pal.mid[1]}"/>`)

  defs.push(`<clipPath id="${clip}"><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/></clipPath>`)
  const planes = 3 + Math.round(B * 4)
  for (let i = 0; i < planes; i++) {
    const a = rng.range(-70, 70) + (i % 2 ? 90 : 0)
    const px = cx + rng.range(-rx * 0.75, rx * 0.75)
    const py = cy + rng.range(-ry * 0.75, ry * 0.75)
    const len = rx * rng.range(1.5, 2.8)
    const wid = rx * rng.range(0.25, 0.85)
    body.push(`<rect x="${(px - len / 2).toFixed(1)}" y="${(py - wid / 2).toFixed(1)}" width="${len.toFixed(1)}" height="${wid.toFixed(1)}" fill="${rng.pick([pal.deep, pal.accent, pal.mid[3] ?? pal.deep, pal.ground])}" opacity="${(0.22 + B * 0.3).toFixed(2)}" transform="rotate(${a.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})" clip-path="url(#${clip})"/>`)
  }

  // Two marks where the eyes would fall — enough to read as a face, not a face.
  const ey = cy - ry * rng.range(0.05, 0.2)
  const eo = rx * rng.range(0.32, 0.48)
  const ew = m * (0.007 + B * 0.011)
  const tilt = rng.range(-6, 6)
  body.push(`<g transform="rotate(${tilt.toFixed(1)} ${cx.toFixed(1)} ${ey.toFixed(1)})">
    <rect x="${(cx - eo - ew * 2).toFixed(1)}" y="${ey.toFixed(1)}" width="${(ew * 4).toFixed(1)}" height="${ew.toFixed(1)}" fill="${pal.deep}" opacity="0.85"/>
    <rect x="${(cx + eo - ew * 2).toFixed(1)}" y="${ey.toFixed(1)}" width="${(ew * 4).toFixed(1)}" height="${ew.toFixed(1)}" fill="${pal.accent}" opacity="0.9"/>
  </g>`)

  if (rng.bool(0.6)) {
    body.push(`<rect x="${(cx + rx * rng.range(-1.8, 1.8)).toFixed(1)}" y="0" width="${(1 + B * 3).toFixed(1)}" height="${h}" fill="${pal.deep}" opacity="0.28"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 8. stencil — street art. Layered stencil shapes, spray speckle, drips.
// ---------------------------------------------------------------------------
function stencil({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const m = Math.min(w, h)
  const wall = pal.deep
  const cut = pal.ground

  body.push(`<rect width="${w}" height="${h}" fill="${wall}"/>`)
  const patches: string[] = []
  for (let i = 0; i < 30; i++) {
    patches.push(`<rect x="${(rng.next() * w).toFixed(1)}" y="${(rng.next() * h).toFixed(1)}" width="${rng.range(m * 0.05, m * 0.5).toFixed(1)}" height="${rng.range(m * 0.03, m * 0.3).toFixed(1)}" fill="${rng.pick(pal.all)}" opacity="${rng.range(0.04, 0.14).toFixed(3)}"/>`)
  }
  body.push(`<g>${patches.join('')}</g>`)

  // Placement is off-centre and varies. A radial burst dead-centre on every
  // piece reads as one stencil recoloured, which is what the first pass did.
  const cx = w * rng.range(0.22, 0.78)
  const cy = h * rng.range(0.24, 0.72)
  const scale = rng.range(0.75, 1.25)

  defs.push(blurFilter('spr', m * 0.09))
  body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(m * 0.34 * scale).toFixed(1)}" fill="${pal.accent}" opacity="${(0.45 + B * 0.4).toFixed(2)}" filter="url(#spr)"/>`)

  const form = ctxMode ?? rng.int(0, 3)
  if (form === 0) {
    // Radial burst.
    const rays = rng.int(5, 9)
    const bw = m * (0.05 + B * 0.045) * scale
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * 360 + rng.range(-12, 12)
      const l = m * rng.range(0.2, 0.42) * scale
      body.push(`<rect x="${(cx - bw / 2).toFixed(1)}" y="${(cy - l).toFixed(1)}" width="${bw.toFixed(1)}" height="${l.toFixed(1)}" fill="${cut}" transform="rotate(${a.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`)
    }
    body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(m * 0.07 * scale).toFixed(1)}" fill="${cut}"/>`)
    body.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(m * 0.032 * scale).toFixed(1)}" fill="${wall}"/>`)
  } else if (form === 1) {
    // Stacked bars, poster-like.
    const n = rng.int(3, 6)
    const bh = m * 0.055 * scale
    const gap = bh * rng.range(1.4, 2.2)
    for (let i = 0; i < n; i++) {
      const bwid = m * rng.range(0.3, 0.62) * scale
      body.push(`<rect x="${(cx - bwid / 2 + rng.range(-m * 0.05, m * 0.05)).toFixed(1)}" y="${(cy - (n * gap) / 2 + i * gap).toFixed(1)}" width="${bwid.toFixed(1)}" height="${bh.toFixed(1)}" fill="${i % 3 === 1 ? pal.accent : cut}"/>`)
    }
  } else if (form === 2) {
    // Concentric squares, hand-cut.
    const n = rng.int(3, 5)
    for (let i = n; i >= 1; i--) {
      const sz = m * 0.42 * scale * (i / n)
      body.push(`<rect x="${(cx - sz / 2).toFixed(1)}" y="${(cy - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}" fill="${i % 2 ? cut : wall}" transform="rotate(${rng.range(-8, 8).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`)
    }
  } else {
    // A cut arrow / chevron stack.
    const n = rng.int(2, 4)
    const sz = m * 0.3 * scale
    for (let i = 0; i < n; i++) {
      const oy = cy - (n * sz * 0.36) / 2 + i * sz * 0.36
      body.push(`<path d="M${(cx - sz).toFixed(1)} ${oy.toFixed(1)} L${cx.toFixed(1)} ${(oy + sz * 0.5).toFixed(1)} L${(cx + sz).toFixed(1)} ${oy.toFixed(1)} L${(cx + sz).toFixed(1)} ${(oy + sz * 0.22).toFixed(1)} L${cx.toFixed(1)} ${(oy + sz * 0.72).toFixed(1)} L${(cx - sz).toFixed(1)} ${(oy + sz * 0.22).toFixed(1)}Z" fill="${i === n - 1 ? pal.accent : cut}"/>`)
    }
  }

  const spk: string[] = []
  for (let i = 0; i < 300; i++) {
    const d = rng.pow(0.3, 1, 1.6)
    const a = rng.range(0, Math.PI * 2)
    const rr = m * 0.44 * scale * d
    spk.push(`<circle cx="${(cx + Math.cos(a) * rr).toFixed(1)}" cy="${(cy + Math.sin(a) * rr).toFixed(1)}" r="${(m * rng.range(0.0008, 0.0032)).toFixed(2)}" fill="${rng.bool(0.6) ? cut : pal.accent}" opacity="${rng.range(0.2, 0.8).toFixed(2)}"/>`)
  }
  body.push(`<g>${spk.join('')}</g>`)
  for (let i = 0; i < rng.int(3, 6); i++) {
    const dx = cx + rng.range(-1, 1) * m * 0.3
    const dy = cy + m * rng.range(0.08, 0.2)
    body.push(`<path d="M${dx.toFixed(1)} ${dy.toFixed(1)} L${dx.toFixed(1)} ${(dy + rng.range(m * 0.08, m * 0.34)).toFixed(1)}" stroke="${cut}" stroke-width="${(m * rng.range(0.002, 0.006)).toFixed(1)}" stroke-linecap="round" opacity="0.75"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 9. dreamscape — surreal. Horizon, floating geometry, impossible shadows.
// ---------------------------------------------------------------------------
function dreamscape({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const horizon = h * rng.range(0.58, 0.72)

  defs.push(`<linearGradient id="dsky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${pal.mid[1]}"/>
    <stop offset="0.7" stop-color="${pal.ground}"/>
    <stop offset="1" stop-color="${pal.mid[0]}"/></linearGradient>`)
  body.push(`<rect width="${w}" height="${horizon.toFixed(1)}" fill="url(#dsky)"/>`)
  body.push(`<rect y="${horizon.toFixed(1)}" width="${w}" height="${(h - horizon).toFixed(1)}" fill="${pal.mid[3] ?? pal.mid[1]}"/>`)

  // Floating solids, each with a long shadow cast the wrong way.
  const n = 2 + Math.round(B * 3)
  for (let i = 0; i < n; i++) {
    const x = w * rng.range(0.15, 0.85)
    const y = horizon - Math.min(w, h) * rng.range(0.05, 0.42)
    const s = Math.min(w, h) * rng.range(0.06, 0.15)
    const kind = rng.int(0, 2)
    const col = rng.pick([pal.accent, pal.deep, pal.mid[2]])
    const shadowLen = s * rng.range(2.2, 5)
    body.push(`<path d="M${(x - s * 0.5).toFixed(1)} ${horizon.toFixed(1)} L${(x + s * 0.5).toFixed(1)} ${horizon.toFixed(1)} L${(x + s * 0.2 + shadowLen).toFixed(1)} ${(horizon + s * 0.5).toFixed(1)} L${(x - s * 0.2 + shadowLen).toFixed(1)} ${(horizon + s * 0.5).toFixed(1)}Z" fill="${pal.deep}" opacity="0.24"/>`)
    if (kind === 0)      body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${col}"/>`)
    else if (kind === 1) body.push(`<rect x="${(x - s).toFixed(1)}" y="${(y - s).toFixed(1)}" width="${(s * 2).toFixed(1)}" height="${(s * 2).toFixed(1)}" fill="${col}" transform="rotate(${rng.int(-25, 25)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`)
    else                 body.push(`<path d="M${x.toFixed(1)} ${(y - s).toFixed(1)} L${(x + s).toFixed(1)} ${(y + s).toFixed(1)} L${(x - s).toFixed(1)} ${(y + s).toFixed(1)}Z" fill="${col}"/>`)
  }

  // A doorway standing in open ground — the surrealist tell.
  if (ctxMode === 1 || (ctxMode === undefined && rng.bool(0.55))) {
    const dw = Math.min(w, h) * 0.1
    const dh = dw * 1.9
    const dx = w * rng.range(0.2, 0.8)
    body.push(`<rect x="${(dx - dw / 2).toFixed(1)}" y="${(horizon - dh).toFixed(1)}" width="${dw.toFixed(1)}" height="${dh.toFixed(1)}" fill="${pal.deep}"/>`)
    body.push(`<rect x="${(dx - dw / 2 + dw * 0.12).toFixed(1)}" y="${(horizon - dh + dw * 0.12).toFixed(1)}" width="${(dw * 0.76).toFixed(1)}" height="${(dh - dw * 0.12).toFixed(1)}" fill="${pal.accent}" opacity="0.85"/>`)
  }
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 10. collage — mixed media. Torn paper, tape, line work, stamps.
// ---------------------------------------------------------------------------
function collage({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const m = Math.min(w, h)

  const pieces = 3 + Math.round(B * 4)
  for (let i = 0; i < pieces; i++) {
    const pw = w * rng.range(0.22, 0.55)
    const ph = h * rng.range(0.18, 0.5)
    const x = rng.range(-0.05, 0.75) * w
    const y = rng.range(-0.05, 0.7) * h
    const rot = rng.range(-12, 12)
    const col = rng.pick([...pal.mid, pal.accent])
    body.push(`<g transform="rotate(${rot.toFixed(1)} ${(x + pw / 2).toFixed(1)} ${(y + ph / 2).toFixed(1)})">
      <path d="${tornRect(x, y, pw, ph, m * 0.008, rng)}" fill="${col}" opacity="${(0.5 + B * 0.4).toFixed(2)}"/>
    </g>`)
  }

  // Ruled lines, as if over ledger paper.
  const lines: string[] = []
  for (let i = 0; i < rng.int(8, 20); i++) {
    const y = rng.next() * h
    lines.push(`<path d="${jitterLine(rng.range(0, 0.3) * w, y, rng.range(0.6, 1) * w, y + rng.range(-4, 4), 10, 1.6, rng)}" fill="none" stroke="${pal.deep}" stroke-width="${(m * rng.range(0.0006, 0.0018)).toFixed(2)}" opacity="${rng.range(0.15, 0.5).toFixed(2)}"/>`)
  }
  body.push(`<g>${lines.join('')}</g>`)

  // Stamps and tape.
  for (let i = 0; i < rng.int(2, 5); i++) {
    const s = m * rng.range(0.04, 0.1)
    const x = rng.next() * (w - s)
    const y = rng.next() * (h - s)
    if (rng.bool()) {
      body.push(`<circle cx="${(x + s / 2).toFixed(1)}" cy="${(y + s / 2).toFixed(1)}" r="${(s / 2).toFixed(1)}" fill="none" stroke="${pal.deep}" stroke-width="${(s * 0.09).toFixed(1)}" opacity="0.6"/>`)
    } else {
      body.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(s * 2.4).toFixed(1)}" height="${(s * 0.5).toFixed(1)}" fill="${pal.mid[0]}" opacity="0.62" transform="rotate(${rng.int(-40, 40)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`)
    }
  }
  return wrap(w, h, [], body)
}

// ---------------------------------------------------------------------------
// 11. ink — traditional. Brush-and-ink botanical / calligraphic study.
// ---------------------------------------------------------------------------
function ink({ w, h, rng, pal, boldness }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = [`<rect width="${w}" height="${h}" fill="${pal.ground}"/>`]
  const m = Math.min(w, h)
  const inkCol = pal.deep

  defs.push(blurFilter('pb', m * 0.1))
  for (let i = 0; i < 4; i++) {
    body.push(`<ellipse cx="${(rng.next() * w).toFixed(1)}" cy="${(rng.next() * h).toFixed(1)}" rx="${(m * rng.range(0.15, 0.35)).toFixed(1)}" ry="${(m * rng.range(0.15, 0.35)).toFixed(1)}" fill="${pal.mid[0]}" opacity="0.4" filter="url(#pb)"/>`)
  }

  // Two or three stems, so the composition has a subject rather than a stick.
  const stems = rng.int(2, 3)
  for (let sIdx = 0; sIdx < stems; sIdx++) {
    const baseX = w * (0.25 + (sIdx / Math.max(1, stems - 1)) * 0.5) + rng.range(-w * 0.06, w * 0.06)
    const topY = h * rng.range(0.1, 0.3)
    const lean = rng.range(-w * 0.16, w * 0.16)
    const sw = m * (0.008 + B * 0.014) * (sIdx === 0 ? 1 : rng.range(0.6, 0.85))
    body.push(`<path d="M${baseX.toFixed(1)} ${h} C${(baseX + lean * 0.4).toFixed(1)} ${(h * 0.68).toFixed(1)} ${(baseX + lean).toFixed(1)} ${(h * 0.4).toFixed(1)} ${(baseX + lean * 0.7).toFixed(1)} ${topY.toFixed(1)}" fill="none" stroke="${inkCol}" stroke-width="${sw.toFixed(1)}" stroke-linecap="round" opacity="${rng.range(0.75, 0.95).toFixed(2)}"/>`)

    const branches = 5 + Math.round(B * 6)
    for (let i = 0; i < branches; i++) {
      const t = 0.12 + (i / branches) * 0.8
      const y = h - (h - topY) * t
      const x = baseX + lean * t * 0.8
      const dir = rng.bool() ? 1 : -1
      const len = m * rng.range(0.12, 0.3) * (1 - t * 0.3)
      const ex = x + dir * len
      const ey = y - len * rng.range(0.15, 0.6)
      body.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} Q${(x + dir * len * 0.5).toFixed(1)} ${(y - len * 0.1).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${inkCol}" stroke-width="${(sw * rng.range(0.3, 0.55)).toFixed(2)}" stroke-linecap="round" opacity="${rng.range(0.55, 0.9).toFixed(2)}"/>`)
      // Leaves are ink-loaded ovals; blossoms are accent discs. Both at a scale
      // that reads from across a room.
      const lr = m * rng.range(0.022, 0.055)
      if (rng.bool(0.55)) {
        body.push(`<ellipse cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${(lr * 1.8).toFixed(1)}" ry="${(lr * 0.7).toFixed(1)}" fill="${inkCol}" opacity="${rng.range(0.5, 0.85).toFixed(2)}" transform="rotate(${rng.int(-70, 70)} ${ex.toFixed(1)} ${ey.toFixed(1)})"/>`)
      } else {
        body.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(lr * 0.9).toFixed(1)}" fill="${pal.accent}" opacity="0.9"/>`)
        body.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(lr * 0.35).toFixed(1)}" fill="${inkCol}" opacity="0.7"/>`)
      }
    }
  }

  // Seal block, bottom corner.
  const ss = m * 0.07
  const sx = rng.bool() ? w * 0.07 : w * 0.86 - ss * 0.2
  body.push(`<rect x="${sx.toFixed(1)}" y="${(h * 0.82).toFixed(1)}" width="${ss.toFixed(1)}" height="${(ss * 1.15).toFixed(1)}" fill="#9C3B33" opacity="0.85"/>`)
  body.push(`<rect x="${(sx + ss * 0.18).toFixed(1)}" y="${(h * 0.82 + ss * 0.2).toFixed(1)}" width="${(ss * 0.64).toFixed(1)}" height="${(ss * 0.75).toFixed(1)}" fill="none" stroke="${pal.ground}" stroke-width="${(ss * 0.08).toFixed(1)}" opacity="0.9"/>`)
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------
// 12. lightStudy — photography. Long-exposure light, high-contrast grain field.
// ---------------------------------------------------------------------------
function lightStudy({ w, h, rng, pal, boldness, mode: ctxMode }: GenContext): string {
  const B = b01(boldness)
  const defs: string[] = []
  const body: string[] = []
  const m = Math.min(w, h)
  const lights = [pal.ground, pal.accent, pal.mid[0], '#FFF6E6']

  defs.push(`<linearGradient id="lsg" x1="${rng.range(0, 1).toFixed(2)}" y1="0" x2="${rng.range(0, 1).toFixed(2)}" y2="1">
    <stop offset="0" stop-color="#0E0D0C"/>
    <stop offset="0.55" stop-color="${pal.deep}"/>
    <stop offset="1" stop-color="#14120F"/></linearGradient>`)
  body.push(`<rect width="${w}" height="${h}" fill="url(#lsg)"/>`)

  defs.push(blurFilter('lt1', m * 0.007))
  defs.push(blurFilter('lt2', m * 0.045))

  const trail = (d: string, col: string, wide: number, thin: number) => {
    body.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${wide.toFixed(1)}" stroke-linecap="round" opacity="${(0.1 + B * 0.16).toFixed(2)}" filter="url(#lt2)"/>`)
    body.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${thin.toFixed(2)}" stroke-linecap="round" opacity="${(0.7 + B * 0.3).toFixed(2)}" filter="url(#lt1)"/>`)
  }

  // Three exposure geometries. Every frame radiating from one vanishing point
  // made six photographs look like six renders of the same scene.
  const mode = ctxMode ?? rng.int(0, 2)
  const n = 6 + Math.round(B * 9)

  if (mode === 0) {
    // Radial — headlights toward a vanishing point.
    const vx = w * rng.range(0.2, 0.8), vy = h * rng.range(0.28, 0.72)
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2)
      const r0 = m * rng.range(0.03, 0.16), r1 = m * rng.range(0.45, 1.15)
      const x0 = vx + Math.cos(a) * r0, y0 = vy + Math.sin(a) * r0
      const x1 = vx + Math.cos(a + rng.range(-0.25, 0.25)) * r1, y1 = vy + Math.sin(a + rng.range(-0.25, 0.25)) * r1
      const mx = (x0 + x1) / 2 + rng.range(-w * 0.09, w * 0.09), my = (y0 + y1) / 2 + rng.range(-h * 0.09, h * 0.09)
      trail(`M${x0.toFixed(1)} ${y0.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
            rng.pick(lights), m * rng.range(0.014, 0.04), m * rng.range(0.002, 0.006))
    }
  } else if (mode === 1) {
    // Parallel — a road, or a train passing.
    const baseA = rng.range(-0.35, 0.35)
    for (let i = 0; i < n; i++) {
      const t = (i + rng.range(-0.3, 0.3)) / n
      const y = h * (0.1 + t * 0.8)
      const x0 = -w * 0.1, x1 = w * 1.1
      const y0 = y + baseA * w * -0.2, y1 = y + baseA * w * 0.2
      trail(`M${x0.toFixed(1)} ${y0.toFixed(1)} Q${(w / 2).toFixed(1)} ${(y + rng.range(-h * 0.08, h * 0.08)).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
            rng.pick(lights), m * rng.range(0.01, 0.03), m * rng.range(0.0015, 0.005))
    }
  } else {
    // A single sweeping arc dominating the frame — the "Ninety Seconds" look.
    const cx = w * rng.range(0.2, 0.8), cy = h * rng.range(0.6, 1.1)
    const r = m * rng.range(0.55, 0.95)
    for (let i = 0; i < Math.max(3, Math.round(n / 3)); i++) {
      const off = i * m * 0.02
      const a0 = Math.PI + rng.range(-0.3, 0.1), a1 = Math.PI * 2 + rng.range(-0.1, 0.3)
      const x0 = cx + Math.cos(a0) * (r + off), y0 = cy + Math.sin(a0) * (r + off)
      const x1 = cx + Math.cos(a1) * (r + off), y1 = cy + Math.sin(a1) * (r + off)
      trail(`M${x0.toFixed(1)} ${y0.toFixed(1)} A${(r + off).toFixed(1)} ${(r + off).toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`,
            rng.pick(lights), m * rng.range(0.02, 0.05), m * rng.range(0.003, 0.008))
    }
  }

  defs.push(blurFilter('bok', m * 0.014))
  for (let i = 0; i < rng.int(10, 24); i++) {
    body.push(`<circle cx="${(rng.next() * w).toFixed(1)}" cy="${(rng.next() * h).toFixed(1)}" r="${(m * rng.range(0.012, 0.05)).toFixed(1)}" fill="${rng.pick(lights)}" opacity="${rng.range(0.08, 0.3).toFixed(2)}" filter="url(#bok)"/>`)
  }
  defs.push(`<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
    <stop offset="0.45" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="${(0.4 + B * 0.25).toFixed(2)}"/></radialGradient>`)
  body.push(`<rect width="${w}" height="${h}" fill="url(#vig)"/>`)
  return wrap(w, h, defs, body)
}

// ---------------------------------------------------------------------------

function wrap(w: number, h: number, defs: string[], body: string[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    body.join('') +
    '</svg>'
}

export const GENERATORS: Record<GeneratorName, (ctx: GenContext) => string> = {
  colorField, hardEdge, minimal, halftone, strata,
  pointillist, figure, stencil, dreamscape, collage, ink, lightStudy,
}

/**
 * Style -> generator. The mapping is deliberate: a piece tagged `photography`
 * must not render as a colour field, or §12's style scoring becomes invisible.
 */
export const STYLE_GENERATOR: Record<string, GeneratorName> = {
  abstract: 'colorField',
  minimalist: 'minimal',
  contemporary: 'hardEdge',
  impressionist: 'pointillist',
  photography: 'lightStudy',
  pop: 'halftone',
  landscape: 'strata',
  portrait: 'figure',
  street: 'stencil',
  surreal: 'dreamscape',
  traditional: 'ink',
  'mixed-media': 'collage',
}
