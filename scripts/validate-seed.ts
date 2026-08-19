/**
 * SEED VALIDATOR — PRD §37.5. RUNS IN CI.
 *
 * "Without these floors, plausible survey answers produce an empty or
 *  repetitive feed, and the demo dies on stage." (§11.2)
 *
 * Fails on any of:
 *   · any tag slug not present in §9
 *   · any §11.2 coverage floor unmet
 *   · any artwork with an empty rooms[], or with `any` in rooms[]
 *   · any ladder violating §7.2 monotonicity
 *   · size_category disagreeing with the dimensions (§9.5)
 *   · any missing local image file, or missing image_credit
 *   · fewer than 60 artworks or fewer than 10 artists
 *   · any artist with fewer than 5 artworks
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  STYLES, COLORS, MOODS, ROOMS, SIZES, BUDGET_BANDS, BUDGET_RANGE,
  sizeCategory, bandForMonthly, isStyle, isColor, isMood, isRoom,
} from '../src/lib/taxonomy'
import { validateLadder, comparisonPriceDollars } from '../src/lib/pricing/rental'

const ROOT = process.cwd()

interface Catalog {
  artists: Array<Record<string, unknown>>
  artworks: Array<Record<string, unknown>>
}

const FLOORS = {
  style: 3, color: 4, mood: 5, room: 8,
  size: 8, budget: 6, boldnessBand: 4,
  minArtworks: 85, minArtists: 17, minPerArtist: 5, maxPerArtist: 8,
} as const

export function validateCatalog(cat: Catalog): string[] {
  const errors: string[] = []
  const E = (m: string) => errors.push(m)

  const { artists, artworks } = cat

  // ---- volume (§37.1) ----------------------------------------------------
  if (artists.length < FLOORS.minArtists) E(`Only ${artists.length} artists; the roster is ${FLOORS.minArtists}.`)
  if (artworks.length < FLOORS.minArtworks) E(`Only ${artworks.length} artworks; ${FLOORS.minArtists} artists x ${FLOORS.minPerArtist} is ${FLOORS.minArtworks}.`)

  const perArtist = new Map<string, number>()
  for (const a of artworks) {
    const id = a.artist_id as string
    perArtist.set(id, (perArtist.get(id) ?? 0) + 1)
  }
  for (const artist of artists) {
    const n = perArtist.get(artist.id as string) ?? 0
    if (n < FLOORS.minPerArtist) E(`Artist "${artist.slug}" has ${n} artworks; §37.1 requires ${FLOORS.minPerArtist}–${FLOORS.maxPerArtist}.`)
    if (n > FLOORS.maxPerArtist) E(`Artist "${artist.slug}" has ${n} artworks; §37.1 caps at ${FLOORS.maxPerArtist}.`)
  }

  // ---- per-artwork integrity --------------------------------------------
  const counts = {
    style: new Map<string, number>(), color: new Map<string, number>(),
    mood: new Map<string, number>(), room: new Map<string, number>(),
    size: new Map<string, number>(), budget: new Map<string, number>(),
  }
  const boldnessBands = { '1-3': 0, '4-7': 0, '8-10': 0 }
  const slugs = new Set<string>()

  for (const a of artworks) {
    const title = a.title as string
    const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)

    if (slugs.has(a.slug as string)) E(`Duplicate slug "${a.slug}".`)
    slugs.add(a.slug as string)

    // §9 slug membership — the regression guard for v1.0's defect #1.
    for (const s of a.styles as string[]) { if (!isStyle(s)) E(`"${title}": style "${s}" is not in §9.1.`); bump(counts.style, s) }
    for (const c of a.colors as string[]) { if (!isColor(c)) E(`"${title}": colour "${c}" is not in §9.2.`); bump(counts.color, c) }
    for (const m of a.moods  as string[]) { if (!isMood(m))  E(`"${title}": mood "${m}" is not in §9.3.`);  bump(counts.mood, m) }

    const rooms = a.rooms as string[]
    if (!rooms || rooms.length === 0) E(`"${title}": empty rooms[]. §9.4 — a piece tagged for zero rooms is a seed-data bug.`)
    for (const r of rooms ?? []) {
      if (r === 'any') E(`"${title}": 'any' is a USER-SIDE wildcard and is never a valid artwork tag (§9.4).`)
      else if (!isRoom(r)) E(`"${title}": room "${r}" is not in §9.4.`)
      bump(counts.room, r)
    }

    // §9.5 — size_category must be derivable from the dimensions.
    const derived = sizeCategory(a.width_in as number, a.height_in as number)
    if (derived !== a.size_category) {
      E(`"${title}": size_category "${a.size_category}" but ${a.width_in}×${a.height_in} in derives "${derived}" (§9.5).`)
    }
    bump(counts.size, a.size_category as string)

    // §7.2 ladder monotonicity — the same rule the DB CHECK enforces.
    const ladder = {
      rental_1m_cents: a.rental_1m_cents as number,
      rental_3m_cents: a.rental_3m_cents as number,
      rental_6m_cents: a.rental_6m_cents as number,
      rental_12m_cents: a.rental_12m_cents as number,
    }
    const v = validateLadder(ladder, a.purchase_price_cents as number)
    if (!v.ok) E(`"${title}": ${v.error} (§7.2).`)

    bump(counts.budget, bandForMonthly(comparisonPriceDollars(ladder)))

    const b = a.boldness as number
    if (!Number.isInteger(b) || b < 1 || b > 10) E(`"${title}": boldness ${b} is outside 1–10 (§9.6).`)
    else if (b <= 3) boldnessBands['1-3']++
    else if (b <= 7) boldnessBands['4-7']++
    else boldnessBands['8-10']++

    // §37.2 / §37.4 — local images and recorded provenance.
    for (const key of ['image_url', 'thumbnail_url'] as const) {
      const url = a[key] as string
      if (!url?.startsWith('/')) E(`"${title}": ${key} is not a local path — §37.2 forbids hot-linking.`)
      else if (!existsSync(join(ROOT, 'public', url))) E(`"${title}": ${key} → public${url} does not exist on disk.`)
    }
    if (!a.image_credit) E(`"${title}": missing image_credit (§37.4 disclosure).`)
    if (!a.blur_data_url) E(`"${title}": missing blur_data_url (§37.3).`)
    if (!a.alt_text) E(`"${title}": missing alt_text (§45).`)
  }

  // ---- §11.2 coverage floors ---------------------------------------------
  const floor = (label: string, all: readonly string[], m: Map<string, number>, min: number) => {
    for (const k of all) {
      const n = m.get(k) ?? 0
      if (n < min) E(`§11.2: ${label} "${k}" appears on ${n} artworks; floor is ${min}.`)
    }
  }
  floor('style', STYLES, counts.style, FLOORS.style)
  floor('colour', COLORS, counts.color, FLOORS.color)
  floor('mood', MOODS, counts.mood, FLOORS.mood)
  floor('room', ROOMS, counts.room, FLOORS.room)
  floor('size', SIZES, counts.size, FLOORS.size)
  floor('budget band', BUDGET_BANDS, counts.budget, FLOORS.budget)

  for (const [band, n] of Object.entries(boldnessBands)) {
    if (n < FLOORS.boldnessBand) E(`§11.2: boldness band ${band} holds ${n} artworks; floor is ${FLOORS.boldnessBand}.`)
  }

  // ---- §27.1 — the top-three commission list must always fill -------------
  const commissionable = artists.filter((a) => a.commission_available && (perArtist.get(a.id as string) ?? 0) >= 3)
  if (commissionable.length < 3) {
    E(`Only ${commissionable.length} artists are commission-eligible; §27.1 needs at least 3 with 3+ published works.`)
  }

  // ---- §34.2 — the homepage shows 8 featured pieces -----------------------
  const featured = artworks.filter((a) => a.featured).length
  if (featured < 8) E(`Only ${featured} featured artworks; §34.2 shows 8 on the homepage.`)

  // ---- demo fixtures ------------------------------------------------------
  for (const slug of ['blue-horizon', 'ferry-light']) {
    const a = artworks.find((x) => x.slug === slug)
    if (!a) E(`Missing "${slug}" — a §12.7 scoring fixture.`)
    else if (a.availability !== 'available') {
      E(`"${slug}" is "${a.availability}"; it must be available — §49 rents it in act one and §12.7 scores it.`)
    }
  }

  return errors
}

// ---------------------------------------------------------------------------

function report(cat: Catalog, errors: string[]) {
  const counts = { style: new Map<string, number>(), color: new Map<string, number>(), mood: new Map<string, number>(), room: new Map<string, number>() }
  for (const a of cat.artworks) {
    for (const s of a.styles as string[]) counts.style.set(s, (counts.style.get(s) ?? 0) + 1)
    for (const c of a.colors as string[]) counts.color.set(c, (counts.color.get(c) ?? 0) + 1)
    for (const m of a.moods  as string[]) counts.mood.set(m,  (counts.mood.get(m)  ?? 0) + 1)
    for (const r of a.rooms  as string[]) counts.room.set(r,  (counts.room.get(r)  ?? 0) + 1)
  }
  const fmt = (m: Map<string, number>, all: readonly string[], min: number) =>
    all.map((k) => `${k}:${m.get(k) ?? 0}${(m.get(k) ?? 0) < min ? '✗' : ''}`).join('  ')

  console.log(`\n  artists ${cat.artists.length}   artworks ${cat.artworks.length}`)
  console.log(`  styles  ${fmt(counts.style, STYLES, FLOORS.style)}`)
  console.log(`  colours ${fmt(counts.color, COLORS, FLOORS.color)}`)
  console.log(`  moods   ${fmt(counts.mood, MOODS, FLOORS.mood)}`)
  console.log(`  rooms   ${fmt(counts.room, ROOMS, FLOORS.room)}`)
  console.log(`  budget  ${BUDGET_BANDS.map((b) => `${b}:${cat.artworks.filter((a) => bandForMonthly(comparisonPriceDollars(a as never)) === b).length}`).join('  ')}`)
  console.log(`  sizes   ${SIZES.map((s) => `${s}:${cat.artworks.filter((a) => a.size_category === s).length}`).join('  ')}`)
  void BUDGET_RANGE

  if (errors.length === 0) {
    console.log('\n  ✓ seed valid — every §11.2 floor and §37.5 rule passes\n')
  } else {
    console.error(`\n  ✗ ${errors.length} seed error${errors.length === 1 ? '' : 's'}:\n`)
    for (const e of errors) console.error(`    · ${e}`)
    console.error('')
  }
}

if (process.argv[1]?.includes('validate-seed')) {
  const path = join(ROOT, 'src', 'data', 'catalog.json')
  if (!existsSync(path)) {
    console.error('  ✗ src/data/catalog.json not found. Run `npm run seed` first.')
    process.exit(1)
  }
  const cat = JSON.parse(readFileSync(path, 'utf8')) as Catalog
  const errors = validateCatalog(cat)
  report(cat, errors)
  process.exit(errors.length ? 1 : 0)
}
