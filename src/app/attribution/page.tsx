/**
 * §37.4 — the disclosure page the footer links to. REQUIRED, NON-NEGOTIABLE.
 */
import type { Metadata } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ARTISTS, ARTWORKS } from '@/lib/db/catalog'

export const metadata: Metadata = { title: 'Attribution' }

export default function AttributionPage() {
  let generators: Record<string, number> = {}
  try {
    const md = readFileSync(join(process.cwd(), 'ATTRIBUTION.md'), 'utf8')
    for (const m of md.matchAll(/\|\s*`(\w+)`\s*\|/g)) {
      generators[m[1]] = (generators[m[1]] ?? 0) + 1
    }
  } catch { generators = {} }

  return (
    <div className="page section-top narrow-wide">
      <p className="eyebrow">Disclosure</p>
      <h1 className="page-title">Attribution &amp; image provenance</h1>

      <div className="prose-block">
        <p className="lede">
          This is a demonstration build. The practices, biographies, locations and
          artworks attached to the {ARTISTS.length} artists shown are invented, and all
          {' '}{ARTWORKS.length} images are procedurally generated for this prototype.
        </p>

        <h2>Why generated, not licensed</h2>
        <p>
          Generating every image means the palette is driven by each piece’s own colour
          tags — so a piece tagged blue is visibly blue, and the recommendation scoring is
          legible on screen rather than being a claim. It also means zero licensing
          exposure and no external URL that can fail on demo day.
        </p>
        <p>
          Twelve distinct algorithms produce the work, one per style family, so a feed
          filtered to “minimalist” looks nothing like a feed filtered to “pop”. Each image
          is seeded from its artwork’s slug, so regenerating the catalogue reproduces the
          same pieces exactly.
        </p>

        {Object.keys(generators).length > 0 ? (
          <>
            <h2>Generators used</h2>
            <ul className="gap-list">
              {Object.entries(generators).sort((a, b) => b[1] - a[1]).map(([g, n]) => (
                <li key={g}><code>{g}</code> — {n} {n === 1 ? 'piece' : 'pieces'}</li>
              ))}
            </ul>
          </>
        ) : null}

        <h2>Typefaces</h2>
        <p>
          Fraunces, Inter and JetBrains Mono, served by Google Fonts under the SIL Open
          Font License. No other third-party assets are used.
        </p>

        <h2>Artists</h2>
        <p>
          Every biography, location, medium and artwork on this site is invented for the
          demonstration. Nothing here describes a real practice, and no work shown was
          made by the person it is attributed to. Every profile carries a “Demo artist”
          chip for exactly that reason.
        </p>
      </div>
    </div>
  )
}
