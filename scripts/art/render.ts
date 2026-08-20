/**
 * IMAGE PIPELINE — PRD §37.2, §37.3.
 *
 * "NEVER hot-link. Every image is downloaded at seed time into
 *  /public/artwork/{artwork_id}/{full,thumb}.webp. An external URL that 404s on
 *  demo day is an avoidable, fatal failure." (§37.2)
 *
 * Here every image is *generated* at seed time and written to the same place,
 * which takes the same principle one step further: there is no external URL at
 * all, so there is nothing to 404.
 *
 * §37.3 — Full: 1600px longest edge, WebP q85. Thumb: 600px, WebP q75.
 * A base64 blur placeholder is generated per image and stored on the row for
 * `next/image`.
 */

import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { Rng } from './rng'
import { buildPalette, type ColorSlug } from './palette'
import { GENERATORS, STYLE_GENERATOR, type GeneratorName } from './generators'

export const FULL_EDGE = 1600
export const THUMB_EDGE = 600
export const FULL_QUALITY = 85
export const THUMB_QUALITY = 75

export interface RenderSpec {
  slug: string
  styles: string[]
  colors: ColorSlug[]
  boldness: number
  widthIn: number
  heightIn: number
  /** Authored composition mode from the seed row — see `SeedArtwork.mode`. */
  mode?: number
}

export interface RenderResult {
  imageUrl: string
  thumbnailUrl: string
  blurDataUrl: string
  generator: GeneratorName
  pxWidth: number
  pxHeight: number
}

/**
 * §35.4 — "Preserve native aspect ratios. Never crop artwork to a uniform
 * square." The raster's aspect ratio is the artwork's real aspect ratio, so the
 * UI never has to crop to make a grid line up.
 */
function pixelDimensions(widthIn: number, heightIn: number, longestEdge: number): [number, number] {
  const ratio = widthIn / heightIn
  return ratio >= 1
    ? [longestEdge, Math.round(longestEdge / ratio)]
    : [Math.round(longestEdge * ratio), longestEdge]
}

/**
 * Film grain, composited in soft-light.
 *
 * Every generator produces perfectly clean vector output. Clean vector output
 * looks like a diagram. A single grain pass is what makes it read as a surface
 * — paint, paper, emulsion — rather than as SVG.
 */
async function grainLayer(w: number, h: number, rng: Rng, strength: number): Promise<Buffer> {
  const px = Buffer.alloc(w * h)
  const spread = Math.round(46 * strength)
  const base = 128 - spread / 2
  for (let i = 0; i < px.length; i++) px[i] = base + Math.floor(rng.next() * spread)
  return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer()
}

export function generatorFor(styles: string[]): GeneratorName {
  for (const s of styles) {
    const g = STYLE_GENERATOR[s]
    if (g) return g
  }
  return 'colorField'
}

export async function renderArtwork(spec: RenderSpec, publicDir: string, artworkId: string): Promise<RenderResult> {
  // One RNG per artwork, seeded from the slug: reproducible across runs (§37.2).
  const rng = new Rng(spec.slug)
  const pal = buildPalette(spec.colors, rng)
  const generator = generatorFor(spec.styles)

  const [fw, fh] = pixelDimensions(spec.widthIn, spec.heightIn, FULL_EDGE)
  const svg = GENERATORS[generator]({ w: fw, h: fh, rng, pal, boldness: spec.boldness, mode: spec.mode })

  const base = await sharp(Buffer.from(svg), { density: 96 }).png().toBuffer()
  const grain = await grainLayer(fw, fh, new Rng(spec.slug + ':grain'), 1)

  const composed = sharp(base).composite([{ input: grain, blend: 'soft-light' }])

  const dir = join(publicDir, 'artwork', artworkId)
  await mkdir(dir, { recursive: true })

  const fullBuf = await composed.clone().webp({ quality: FULL_QUALITY, effort: 5 }).toBuffer()
  await writeFile(join(dir, 'full.webp'), fullBuf)

  const [tw, th] = pixelDimensions(spec.widthIn, spec.heightIn, THUMB_EDGE)
  const thumbBuf = await sharp(fullBuf).resize(tw, th, { fit: 'fill' }).webp({ quality: THUMB_QUALITY, effort: 5 }).toBuffer()
  await writeFile(join(dir, 'thumb.webp'), thumbBuf)

  // §37.3 blur placeholder — tiny, inlined on the row, so `next/image` has
  // something to show before the real file arrives and the layout never shifts.
  const blur = await sharp(fullBuf).resize(16, null, { fit: 'inside' }).webp({ quality: 28 }).toBuffer()

  return {
    imageUrl: `/artwork/${artworkId}/full.webp`,
    thumbnailUrl: `/artwork/${artworkId}/thumb.webp`,
    blurDataUrl: `data:image/webp;base64,${blur.toString('base64')}`,
    generator,
    pxWidth: fw,
    pxHeight: fh,
  }
}

/**
 * Artist portraits (§16, §37.6).
 *
 * Real photographs, supplied per artist in `scripts/seed/photos/{slug}.jpg` and
 * committed so the seed reproduces on a fresh clone with no network — the same
 * reasoning as §37.2's "never hot-link".
 *
 * Cropped square from the TOP rather than the centre or by saliency. In a set of
 * ordinary phone photos the head is reliably in the upper part of the frame,
 * whereas sharp's attention strategy optimises for entropy and happily centres
 * on a torso or a busy background — it kept bodies and cut off faces on the
 * full-length shots here. Compared both across all 17; top wins outright.
 * Falls back to the generated mark when no photo exists for a slug.
 */
export async function renderArtistAvatar(slug: string, publicDir: string): Promise<string> {
  const dir = join(publicDir, 'artists')
  await mkdir(dir, { recursive: true })
  const out = join(dir, `${slug}.webp`)

  const photo = join(process.cwd(), 'scripts', 'seed', 'photos', `${slug}.jpg`)
  if (existsSync(photo)) {
    // Trim a uniform border first. Studio shots on white leave the subject
    // occupying a narrow strip, so a top-crop of the raw frame returns mostly
    // background — at 56px in a circle that reads as a speck rather than a
    // person. Trim is a no-op on photos without a flat border, so it is safe to
    // run over the whole set. It throws when an image is ENTIRELY uniform,
    // hence the fallback.
    let base = sharp(photo).rotate() // honour EXIF orientation before cropping
    try {
      const trimmed = await sharp(photo).rotate().trim({ threshold: 12 }).toBuffer()
      base = sharp(trimmed)
    } catch {
      /* nothing to trim; use the frame as shot */
    }

    await base
      .resize(AVATAR_PX, AVATAR_PX, { fit: 'cover', position: 'top' })
      .webp({ quality: 86, effort: 5 })
      .toFile(out)
    return `/artists/${slug}.webp`
  }

  return generateArtistMark(slug, dir, out)
}

const AVATAR_PX = 480

/** The generated fallback, for any artist without a supplied photograph. */
async function generateArtistMark(slug: string, dir: string, out: string): Promise<string> {
  const rng = new Rng('artist:' + slug)
  const size = AVATAR_PX
  const ramps = ['#8B5E3C', '#3E6B95', '#4E7A55', '#6B5591', '#A9762F', '#8C3A32']
  const a = rng.pick(ramps)
  const b = rng.pick(ramps.filter((c) => c !== a))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>
      </linearGradient>
      <filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${size * 0.06}"/></filter>
    </defs>
    <rect width="${size}" height="${size}" fill="#F2EFEA"/>
    <circle cx="${size / 2}" cy="${size * 0.42}" r="${size * 0.3}" fill="url(#g)" opacity="0.85"/>
    <ellipse cx="${size / 2}" cy="${size * 0.95}" rx="${size * 0.42}" ry="${size * 0.3}" fill="url(#g)" opacity="0.7"/>
    <circle cx="${size * rng.range(0.2, 0.8)}" cy="${size * rng.range(0.15, 0.5)}" r="${size * 0.14}" fill="#FAF8F5" opacity="0.35" filter="url(#s)"/>
  </svg>`
  const buf = await sharp(Buffer.from(svg))
    .composite([{ input: await grainLayer(size, size, new Rng(slug + ':g'), 0.7), blend: 'soft-light' }])
    .webp({ quality: 82 }).toBuffer()
  await writeFile(out, buf)
  void dir
  return `/artists/${slug}.webp`
}
