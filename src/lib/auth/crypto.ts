/**
 * Session cookie signing — PRD §32, §42.
 *
 * The session cookie is HMAC-signed and httpOnly. A client cannot forge one, so
 * the `user_id` the server acts on is always derived server-side and never read
 * from a request body (§32.3).
 *
 * Node runtime only. Never imported into a client component.
 */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'

/**
 * §32.4 — secrets come from the environment. The fallback exists so a fresh
 * clone runs without configuration; it is a DEV-ONLY value and the app logs
 * loudly in production if it is still in use.
 */
const DEV_SECRET = 'curio-dev-secret-do-not-use-in-production'

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET
  if (s && s.length >= 16) return s
  if (process.env.NODE_ENV === 'production' && !process.env.CURIO_ALLOW_DEV_SECRET) {
    // Deliberately not fatal: a demo build must not hard-crash on a missing
    // env var. It is loud instead.
    console.warn(
      '[curio] SESSION_SECRET is unset in production. Sessions are signed with a ' +
      'public development key. Set SESSION_SECRET in your Vercel project settings.',
    )
  }
  return DEV_SECRET
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Serialise -> gzip -> base64url -> HMAC. Returns `payload.signature`. */
export function seal(value: unknown): string {
  const json = JSON.stringify(value)
  const packed = b64url(gzipSync(Buffer.from(json, 'utf8'), { level: 9 }))
  const sig = b64url(createHmac('sha256', sessionSecret()).update(packed).digest())
  return `${packed}.${sig}`
}

/** Verify and decode. Returns null on any tampering, corruption, or version skew. */
export function unseal<T>(token: string | undefined | null): T | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const packed = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = createHmac('sha256', sessionSecret()).update(packed).digest()
  let given: Buffer
  try { given = fromB64url(sig) } catch { return null }
  if (given.length !== expected.length) return null
  if (!timingSafeEqual(given, expected)) return null

  try {
    return JSON.parse(gunzipSync(fromB64url(packed)).toString('utf8')) as T
  } catch {
    return null
  }
}

export function newId(prefix = ''): string {
  return prefix + randomBytes(9).toString('hex')
}

/**
 * Password check for the seeded demo accounts (§32.1, §38.3).
 *
 * "Demo mode is a REAL SIGN-IN." The homepage button authenticates a genuine
 * seeded account with a known password from an env var. Nothing is bypassed —
 * which is how v1.0's contradiction between "demo mode is acceptable" (§26) and
 * "users can only modify their own rentals" (§44) is resolved.
 */
export function demoPassword(): string {
  return process.env.DEMO_USER_PASSWORD || 'curio-demo'
}

export function checkPassword(given: string): boolean {
  const expected = Buffer.from(demoPassword(), 'utf8')
  const actual = Buffer.from(given ?? '', 'utf8')
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}
