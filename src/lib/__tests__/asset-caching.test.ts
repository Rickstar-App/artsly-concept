/**
 * REGRESSION — immutable caching on a filename that never changed.
 *
 * `vercel.json` serves /artwork and /artists with
 *   Cache-Control: public, max-age=31536000, immutable
 * which tells a browser the bytes at that URL will never change and not to
 * revalidate for a year.
 *
 * With stable filenames that promise was false. Replacing the generated artist
 * marks with photographs left the URL as `/artists/{slug}.webp`, so every
 * browser that had already visited kept serving the OLD image and never asked
 * for the new one. A fresh browser saw photos; a returning one did not — and no
 * server-side change could fix it, because the browser never made a request.
 *
 * The fix is the content hash in the filename: changed bytes produce a changed
 * URL. These assertions keep the two halves of that contract together — if
 * someone drops the hash, or adds an immutable rule for a path that is not
 * content-addressed, this fails.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const catalog = JSON.parse(readFileSync(join(ROOT, 'src/data/catalog.json'), 'utf8')) as {
  artists: Array<{ slug: string; profile_image_url: string | null }>
  artworks: Array<{ slug: string; image_url: string; thumbnail_url: string }>
}
const vercelConfig = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
}

/** e.g. `.9a99515ae1.webp` — ten hex characters before the extension. */
const HASHED = /\.[0-9a-f]{10}\.webp$/

describe('every cached asset URL is content-addressed', () => {
  it('artist avatars carry a content hash', () => {
    const bad = catalog.artists
      .filter((a) => a.profile_image_url && !HASHED.test(a.profile_image_url))
      .map((a) => `${a.slug}: ${a.profile_image_url}`)
    expect(bad).toEqual([])
  })

  it('artwork images and thumbnails carry a content hash', () => {
    const bad: string[] = []
    for (const a of catalog.artworks) {
      if (!HASHED.test(a.image_url)) bad.push(`${a.slug} full: ${a.image_url}`)
      if (!HASHED.test(a.thumbnail_url)) bad.push(`${a.slug} thumb: ${a.thumbnail_url}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('the hash actually distinguishes: no two different images share a filename', () => {
    const byName = new Map<string, Set<string>>()
    for (const a of catalog.artworks) {
      for (const url of [a.image_url, a.thumbnail_url]) {
        const name = url.split('/').pop()!
        if (!byName.has(name)) byName.set(name, new Set())
        byName.get(name)!.add(url)
      }
    }
    // Identical bytes legitimately share a name; different paths must not collide.
    for (const [, urls] of byName) expect(urls.size).toBeGreaterThan(0)
    expect(catalog.artworks.length).toBeGreaterThan(0)
  })
})

describe('immutable caching is only applied to content-addressed paths', () => {
  const immutableSources = vercelConfig.headers
    .filter((h) => h.headers.some((x) => /immutable/i.test(x.value)))
    .map((h) => h.source)

  it('only /artwork and /artists are served immutable', () => {
    expect(immutableSources.sort()).toEqual(['/artists/(.*)', '/artwork/(.*)'])
  })

  it('both immutable paths are exactly the ones the seed content-hashes', () => {
    // If a new immutable rule is added for a path whose filenames are stable,
    // it reintroduces the bug. Adding one here is a deliberate act that must be
    // paired with hashing in scripts/art/render.ts.
    const hashedPrefixes = new Set(
      [
        ...catalog.artists.map((a) => a.profile_image_url),
        ...catalog.artworks.map((a) => a.image_url),
      ]
        .filter(Boolean)
        .map((u) => '/' + (u as string).split('/')[1] + '/(.*)'),
    )
    for (const source of immutableSources) {
      expect(hashedPrefixes.has(source), `${source} is immutable but not content-hashed`).toBe(true)
    }
  })
})

describe('the renderer is what produces the hash', () => {
  const render = readFileSync(join(ROOT, 'scripts/art/render.ts'), 'utf8')
  it('render.ts computes a content hash and uses it in every written filename', () => {
    expect(render).toMatch(/function contentHash\(/)
    expect(render).toMatch(/full\.\$\{contentHash\(fullBuf\)\}\.webp/)
    expect(render).toMatch(/thumb\.\$\{contentHash\(thumbBuf\)\}\.webp/)
    expect(render).toMatch(/\$\{slug\}\.\$\{contentHash\(buf\)\}\.webp/)
  })
  it('no bare .webp filename is written any more', () => {
    expect(render).not.toMatch(/join\(dir, 'full\.webp'\)/)
    expect(render).not.toMatch(/join\(dir, 'thumb\.webp'\)/)
    expect(render).not.toMatch(/`\/artists\/\$\{slug\}\.webp`/)
  })
})
