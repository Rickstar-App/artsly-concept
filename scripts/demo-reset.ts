/**
 * §38.4 — `npm run demo:reset`.
 *
 * "Restores both accounts to their starting state — clears rentals, purchases,
 *  subscriptions, affinity, and the seeded events; restores artwork
 *  availability. RUN IT BETWEEN EVERY REHEARSAL. A demo that only works on a
 *  fresh database is a demo that fails the second time it's given."
 *
 * In this build every mutable row lives in a signed session cookie, so a reset
 * is per-browser and instantaneous. That is a FEATURE for §46.2's two-browser
 * inventory test: two laptops on the demo table are genuinely independent.
 *
 * This CLI therefore verifies the *catalogue* is pristine and reminds the
 * presenter where the in-app reset lives. It never lies about clearing state it
 * cannot reach.
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { validateCatalog } from './validate-seed'

const path = join(process.cwd(), 'src', 'data', 'catalog.json')

if (!existsSync(path)) {
  console.error('\n  ✗ src/data/catalog.json is missing. Run `npm run seed` first.\n')
  process.exit(1)
}

const cat = JSON.parse(readFileSync(path, 'utf8'))
const errors = validateCatalog(cat)

if (errors.length > 0) {
  console.error(`\n  ✗ The catalogue has ${errors.length} problem${errors.length === 1 ? '' : 's'}:\n`)
  for (const e of errors) console.error(`    · ${e}`)
  console.error('\n  Run `npm run seed` to rebuild it.\n')
  process.exit(1)
}

const available = cat.artworks.filter((a: { availability: string }) => a.availability === 'available').length

console.log(`
  ✓ Catalogue is clean and ready.

    ${cat.artists.length} artists · ${cat.artworks.length} artworks · ${available} available in the feed
    "Blue Horizon" and "Ferry Light" are both available — the two demo fixtures.

  Per-browser state (rentals, purchases, subscriptions, affinity, events) lives in
  a signed session cookie, so it resets per browser rather than globally:

    · In the app — "Reset demo data" in the footer, while signed in.
    · Or open a private window and sign in again.

  Run this before every rehearsal, then do the full §46.2 loop twice.
`)
