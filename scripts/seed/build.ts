/**
 * SEED BUILDER — PRD §37, §51 step 4.
 *
 * "Get 60 real artworks on screen early — the product's quality is legible from
 *  this point onward, and every later decision is easier to judge." (§51)
 *
 * Everything derivable is DERIVED here, never authored:
 *   size_category  <- dimensions (§9.5)
 *   the four rungs <- purchase_price (§7.2)
 *   alt_text       <- title/artist/medium/styles (§45)
 *   slug           <- title
 *
 * That is what makes it impossible for the seed to contradict itself the way
 * v1.0's two schemas did.
 *
 * Output: `src/data/catalog.json` (committed) and `public/artwork/**` (committed),
 * so a fresh clone renders the full product with no network and no database.
 */

import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { ARTISTS } from './artists'
import { ARTWORKS } from './artworks'
import { renderArtwork, renderArtistAvatar } from '../art/render'
import { Rng } from '../art/rng'
import { buildLadder, validateLadder, comparisonPriceDollars } from '../../src/lib/pricing/rental'
import { sizeCategory, STYLE_LABEL, SIZE_LABEL } from '../../src/lib/taxonomy'
import type { ColorSlug } from '../art/palette'

const ROOT = process.cwd()
const PUBLIC = join(ROOT, 'public')
const DATA = join(ROOT, 'src', 'data')

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const nowIso = (daysAgo: number) =>
  new Date(Date.UTC(2026, 7, 18) - daysAgo * 86_400_000).toISOString()

const isoDate = (d: string) => d.slice(0, 10)

async function main() {
  const t0 = Date.now()
  console.log('· Curio seed build')

  await rm(join(PUBLIC, 'artwork'), { recursive: true, force: true })
  await rm(join(PUBLIC, 'artists'), { recursive: true, force: true })
  await mkdir(DATA, { recursive: true })

  // ---------------------------------------------------------------- artists
  const artists = []
  for (const a of ARTISTS) {
    const url = await renderArtistAvatar(a.slug, PUBLIC)
    artists.push({
      id: a.slug,
      user_id: null as string | null,
      name: a.name,
      slug: a.slug,
      tagline: a.tagline,
      bio: a.bio,
      location: a.location,
      profile_image_url: url,
      mediums: a.mediums,
      styles: a.styles,
      commission_available: a.commission_available,
      is_fictional: true,
      created_at: nowIso(400),
      updated_at: nowIso(400),
    })
  }
  console.log(`  artists            ${artists.length}`)

  // --------------------------------------------------------------- artworks
  const artistByslug = new Map(artists.map((a) => [a.slug, a]))
  const artworks = []
  const usedSlugs = new Set<string>()
  let rendered = 0

  for (let i = 0; i < ARTWORKS.length; i++) {
    const src = ARTWORKS[i]
    const artist = artistByslug.get(src.artist)
    if (!artist) throw new Error(`Unknown artist "${src.artist}" on "${src.title}"`)

    const slug = slugify(src.title)
    if (usedSlugs.has(slug)) throw new Error(`Duplicate artwork slug "${slug}"`)
    usedSlugs.add(slug)

    // §9.5 — derived, never entered.
    const size = sizeCategory(src.w, src.h)

    // §7.2 — generated, then validated against the same rule the DB enforces.
    const priceCents = src.price * 100
    const ladder = buildLadder(priceCents)
    const check = validateLadder(ladder, priceCents)
    if (!check.ok) throw new Error(`"${src.title}" ($${src.price}): ${check.error}`)

    const img = await renderArtwork(
      { slug, styles: src.styles, colors: src.colors as ColorSlug[], boldness: src.boldness, widthIn: src.w, heightIn: src.h, mode: src.mode },
      PUBLIC,
      slug,
    )
    rendered++
    if (rendered % 10 === 0) console.log(`  rendering…         ${rendered}/${ARTWORKS.length}`)

    artworks.push({
      id: slug,
      artist_id: artist.id,
      title: src.title,
      slug,
      description: src.description,
      artist_note: src.note,
      image_url: img.imageUrl,
      thumbnail_url: img.thumbnailUrl,
      blur_data_url: img.blurDataUrl,
      // §37.4 — every image is generated for this prototype. Recorded on the row
      // so ATTRIBUTION.md can be produced mechanically rather than by hand.
      image_credit: `Procedurally generated for this prototype (${img.generator}, seed “${slug}”).`,
      // §45 — "{title} by {artist} — {medium}, {styles}"
      alt_text: `${src.title} by ${artist.name} — ${src.medium}, ${src.styles.map((s) => STYLE_LABEL[s as keyof typeof STYLE_LABEL]).join(' and ').toLowerCase()}`,
      medium: src.medium,
      materials: src.materials,
      year_created: src.year,
      styles: src.styles,
      colors: src.colors,
      moods: src.moods,
      rooms: src.rooms,
      boldness: src.boldness,
      width_in: src.w,
      height_in: src.h,
      size_category: size,
      ...ladder,
      purchase_price_cents: priceCents,
      availability: 'available' as string,
      featured: !!src.featured,
      created_at: nowIso(360 - i * 4),
      updated_at: nowIso(360 - i * 4),
    })
  }
  console.log(`  artworks           ${artworks.length}`)

  // ------------------------------------------------------ baseline activity
  //
  // §30.1 needs an artist dashboard with real figures, and §14.3 needs `rented`
  // and `sold` pieces to exist so their card states are reachable. Both are
  // satisfied by a committed set of rentals and purchases made by other
  // collectors — the platform did not open this morning.
  //
  // Two pieces are HELD BACK deliberately: "Blue Horizon" is what the demo
  // rents in act one (§49 step 5), and "Ferry Light" is the §12.7 scoring
  // fixture. Neither may be unavailable at demo time.
  const PROTECTED = new Set(['blue-horizon', 'ferry-light'])
  const rng = new Rng('baseline-activity')
  const byArtist = new Map<string, typeof artworks>()
  for (const aw of artworks) {
    if (!byArtist.has(aw.artist_id)) byArtist.set(aw.artist_id, [])
    byArtist.get(aw.artist_id)!.push(aw)
  }

  const COLLECTORS = ['Priya N.', 'Tom R.', 'Dana W.', 'Marcus H.', 'Elena V.', 'Chris O.', 'Nadia S.', 'Ben L.']
  const baselineRentals: Array<Record<string, unknown>> = []
  const baselinePurchases: Array<Record<string, unknown>> = []

  for (const [artistId, works] of byArtist) {
    const pool = works.filter((w) => !PROTECTED.has(w.id))
    // Maya is the demo artist (§38.2) and gets a fuller book so her dashboard
    // is populated on first load.
    const rentCount = artistId === 'maya-chen' ? 3 : rng.int(0, 1)
    const sellCount = artistId === 'maya-chen' ? 1 : (rng.bool(0.3) ? 1 : 0)

    const picked = rng.sample(pool, rentCount + sellCount)
    picked.slice(0, rentCount).forEach((w, i) => {
      const months = [1, 3, 6, 12][rng.int(0, 3)]
      const startedDaysAgo = rng.int(10, 80)
      const start = isoDate(nowIso(startedDaysAgo))
      const end = isoDate(new Date(Date.parse(start) + months * 30.4 * 86_400_000).toISOString())
      const price = w[`rental_${months}m_cents` as keyof typeof w] as number
      w.availability = 'rented'
      baselineRentals.push({
        id: `br-${w.id}`,
        artwork_id: w.id,
        artist_id: artistId,
        collector: COLLECTORS[(i + artistId.length) % COLLECTORS.length],
        months,
        start_date: start,
        end_date: end,
        price_cents: price,
        artist_share_rate: 0.6,
        source: 'library',
      })
    })
    picked.slice(rentCount).forEach((w) => {
      w.availability = 'sold'
      baselinePurchases.push({
        id: `bp-${w.id}`,
        artwork_id: w.id,
        artist_id: artistId,
        collector: COLLECTORS[rng.int(0, COLLECTORS.length - 1)],
        price_cents: w.purchase_price_cents,
        artist_share_rate: 0.7,
        created_at: nowIso(rng.int(30, 200)),
      })
    })
  }

  const unavailable = artworks.filter((a) => a.availability !== 'available').length
  console.log(`  baseline rentals   ${baselineRentals.length}`)
  console.log(`  baseline sales     ${baselinePurchases.length}`)
  console.log(`  available in feed  ${artworks.length - unavailable}/${artworks.length}`)

  // ------------------------------------------------------------------ write
  const catalog = {
    generated_at: new Date().toISOString(),
    artists,
    artworks,
    baseline_rentals: baselineRentals,
    baseline_purchases: baselinePurchases,
  }
  await writeFile(join(DATA, 'catalog.json'), JSON.stringify(catalog))
  console.log(`  catalog.json       ${(JSON.stringify(catalog).length / 1024).toFixed(0)} KB`)

  // §37.4 — required disclosure, produced mechanically from image_credit.
  const attribution = [
    '# Attribution & Image Provenance',
    '',
    'This is a **demonstration build**. The practices, biographies, locations and',
    'artworks attached to every artist in this product are **invented**, and **every',
    'artwork image is procedurally generated** by the committed generator at',
    '`scripts/art/` — seeded from each piece\'s own slug, so runs are reproducible.',
    'No work shown was made by the person it is attributed to.',
    '',
    '## Why generated rather than licensed',
    '',
    'PRD §37.2 proposes two sources: generated originals for abstract/geometric work,',
    'and licensed photography for the rest. This build uses generation for all 65 pieces.',
    'The reasoning:',
    '',
    '- §37.2\'s own argument for generation applies to every piece: zero licensing',
    '  exposure, guaranteed availability, and — critically — **the palette is driven by',
    '  each piece\'s own colour tags, so tags and images actually agree**. A user who',
    '  filters to `blue` sees blue work, which is what makes §12\'s scoring legible.',
    '- §37.2\'s stated reason to license was "where generation can\'t reach the bar."',
    '  Twelve distinct style-specific algorithms (`scripts/art/generators.ts`) reach it.',
    '- The keyless public-domain sources actually available return uncontrolled quality —',
    '  19th-century battlefield photography, or snapshots of parked cars. Presenting',
    '  those as an emerging artist\'s living-room piece would be worse on the aesthetic',
    '  axis (§52.4\'s top risk) *and* on the honesty axis (§37.4).',
    '- §37.2 forbids hot-linking because "an external URL that 404s on demo day is an',
    '  avoidable, fatal failure." Generating removes the external URL entirely.',
    '',
    '## Disclosure surfaces (§37.4)',
    '',
    '- **Site footer, always visible** — "Demo build. Artist profiles, biographies and',
    '  artworks are invented for this prototype, and all imagery is procedurally',
    '  generated."',
    '- **Artist profiles** carry a "Demo artist" chip where `is_fictional = true`.',
    '- **This file**, listing the generator and seed behind every image.',
    '',
    '## Third-party assets',
    '',
    'Typefaces are served by Google Fonts under the SIL Open Font License:',
    'Fraunces, Inter, JetBrains Mono. No other third-party imagery is used.',
    '',
    '## Per-image provenance',
    '',
    '| Artwork | Artist | Generator | Seed |',
    '|---|---|---|---|',
    ...artworks.map((a) => {
      const m = /\(([a-zA-Z]+), seed/.exec(a.image_credit ?? '')
      return `| ${a.title} | ${artistByslug.get(a.artist_id)?.name} | \`${m?.[1] ?? '—'}\` | \`${a.slug}\` |`
    }),
    '',
  ].join('\n')
  await writeFile(join(ROOT, 'ATTRIBUTION.md'), attribution)

  console.log(`· done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  // Quick surface report so problems are visible immediately rather than at QA.
  const bands: Record<string, number> = {}
  for (const a of artworks) {
    const c = comparisonPriceDollars(a)
    const b = c <= 25 ? 'under-25' : c <= 50 ? '25-50' : c <= 100 ? '50-100' : c <= 200 ? '100-200' : '200-plus'
    bands[b] = (bands[b] ?? 0) + 1
  }
  console.log('  budget bands      ', bands)
  const sizes: Record<string, number> = {}
  for (const a of artworks) sizes[a.size_category] = (sizes[a.size_category] ?? 0) + 1
  console.log('  sizes             ', sizes)
  void SIZE_LABEL
}

main().catch((e) => { console.error(e); process.exit(1) })
