/**
 * §7.4 — "Copy consequence — DO NOT OVERSELL."
 *
 * Approved:  "Love it? Own 'Blue Horizon' permanently — $1,200.
 *             Your rental ends when you buy. Nothing to send back."
 * BANNED:    "apply your rent", "rent toward ownership", "rent-to-own",
 *            "you've already paid $200 toward this".
 *
 * §48 — "The purchase price is not reduced by rent paid, and NO UI COPY IMPLIES
 *        OTHERWISE." A grep in CI catches it in source; this catches it in the
 *        constants the UI actually renders.
 *
 * Also guards §34.1 / §0.1 defect #27: the primary CTA is "Discover My Art"
 * everywhere. v1.0 alternated with "Discover Your Art" across sections and the
 * demo script.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BANNED_COPY_PATTERNS, NO_CREDIT_COPY, NO_CREDIT_COPY_LONG, SHIPPING_COPY } from '../pricing/config'

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(p)) out.push(p)
  }
  return out
}

const SRC = join(process.cwd(), 'src')
// `pricing/config.ts` is where BANNED_COPY_PATTERNS is DEFINED, so it contains
// the banned strings by construction. Scanning it would fail on its own guard.
const CONFIG = join(SRC, 'lib/pricing/config.ts')
const files = walk(SRC).filter((f) => !f.includes('__tests__') && f !== CONFIG)

describe('§7.4 — banned rent-to-own copy appears nowhere', () => {
  for (const pattern of BANNED_COPY_PATTERNS) {
    it(`no source file matches ${pattern}`, () => {
      const hits = files.filter((f) => pattern.test(readFileSync(f, 'utf8')))
      expect(hits.map((h) => h.replace(SRC, 'src'))).toEqual([])
    })
  }

  it('the approved disclosure says what §7.4 requires', () => {
    expect(NO_CREDIT_COPY).toMatch(/doesn’t reduce the purchase price/)
    expect(NO_CREDIT_COPY_LONG).toMatch(/Nothing to send back/)
    for (const p of BANNED_COPY_PATTERNS) {
      expect(p.test(NO_CREDIT_COPY)).toBe(false)
      expect(p.test(NO_CREDIT_COPY_LONG)).toBe(false)
    }
  })
})

describe('§34.1 / §0.1 #27 — one primary CTA, everywhere', () => {
  // The defect was about the BUTTON: v1.0 said "Discover My Art" in §7.1/§51
  // and "Discover Your Art" in §28. §34.3's how-it-works step is separately and
  // deliberately titled "Discover your art" — a step label, not a CTA — so the
  // check is scoped to elements carrying a `btn` class.
  const CTA_RE = /Discover Your Art[^<]*<\/(?:Link|a|button)|className="btn[^"]*"[^>]*>\s*Discover Your Art/i

  it('no button or link CTA says "Discover Your Art"', () => {
    const hits = files.filter((f) => CTA_RE.test(readFileSync(f, 'utf8')))
    expect(hits.map((h) => h.replace(SRC, 'src'))).toEqual([])
  })

  it('every "Discover ... Art" CTA button says "My"', () => {
    const bad: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/className="btn[^"]*"[^>]*>\s*([^<]{0,40}?Discover[^<]{0,40}?)\s*</g)) {
        if (!/Discover My Art/.test(m[1])) bad.push(`${f.replace(SRC, 'src')}: "${m[1].trim()}"`)
      }
    }
    expect(bad).toEqual([])
  })

  it('says "Discover My Art" on the homepage', () => {
    expect(readFileSync(join(SRC, 'app/page.tsx'), 'utf8')).toContain('Discover My Art')
  })
})

describe('§17.4 — shipping is never a line item with a dollar value', () => {
  it('the shipping constant states inclusion, not a price', () => {
    expect(SHIPPING_COPY).toBe('Shipping included, both ways.')
    expect(SHIPPING_COPY).not.toMatch(/\$/)
  })
  it('no component renders a shipping price', () => {
    const hits = files.filter((f) => /[Ss]hipping[^\n]{0,40}\$\d/.test(readFileSync(f, 'utf8')))
    expect(hits.map((h) => h.replace(SRC, 'src'))).toEqual([])
  })
})

describe('§27.2 — the fallback CTA is grammatical (v1.0 said "for me")', () => {
  it('never says "Let us choose for me"', () => {
    const hits = files.filter((f) => /choose for me/i.test(readFileSync(f, 'utf8')))
    expect(hits.map((h) => h.replace(SRC, 'src'))).toEqual([])
  })
})
