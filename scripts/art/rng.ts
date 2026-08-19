/**
 * Deterministic PRNG — PRD §37.2.
 *
 * "Seeded from the artwork slug, so runs are reproducible."
 *
 * Reproducibility is not a nicety here. §12.10 forbids `random()` anywhere the
 * demo can see it, and §38.4 requires the demo to run twice from a reset with
 * identical output. If regenerating the seed produced different artwork, every
 * committed image, blur placeholder, and alt text would drift.
 */

/** FNV-1a — stable across platforms and Node versions. */
export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export class Rng {
  private s: number
  constructor(seed: string | number) {
    this.s = typeof seed === 'number' ? seed >>> 0 : hashString(seed)
    // Discard the first few draws; mulberry32 is weak in its opening bits.
    for (let i = 0; i < 8; i++) this.next()
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number { return min + this.next() * (max - min) }

  /** Integer in [min, max]. */
  int(min: number, max: number): number { return Math.floor(this.range(min, max + 1)) }

  bool(p = 0.5): boolean { return this.next() < p }

  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)] }

  /** k distinct members, or the whole array if k exceeds its length. */
  sample<T>(arr: readonly T[], k: number): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a.slice(0, Math.min(k, a.length))
  }

  shuffle<T>(arr: readonly T[]): T[] { return this.sample(arr, arr.length) }

  /** Approximately normal, via the central limit theorem. */
  gauss(mean = 0, sd = 1): number {
    let sum = 0
    for (let i = 0; i < 6; i++) sum += this.next()
    return mean + ((sum - 3) / Math.sqrt(0.5)) * sd
  }

  /** Biased toward the low end — useful for "mostly small, occasionally large". */
  pow(min: number, max: number, exponent = 2): number {
    return min + Math.pow(this.next(), exponent) * (max - min)
  }
}
