'use client'

/**
 * §38.3 — "Homepage footer: 'Sign in as Alex (demo)' and 'Sign in as Maya
 * (artist demo)'. Both perform REAL Supabase sign-ins with passwords from
 * DEMO_USER_PASSWORD (§32.1). NO AUTH BYPASS PATH EXISTS."
 *
 * These buttons post the account's real password to the real `signIn` action.
 * There is no separate demo code path.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, resetDemo } from '@/lib/auth/actions'
import { DEMO_ACCOUNTS } from '@/lib/demo/accounts'
import type { ViewerSummary } from '@/lib/session'

export function DemoSignIn({ viewer }: { viewer: ViewerSummary }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (viewer.signedIn) {
    return (
      <div className="demo-bar">
        <p className="demo-bar-label">
          Signed in as <strong>{viewer.displayName}</strong>
          <span className="demo-bar-role"> · {viewer.role}</span>
        </p>
        <div className="demo-bar-actions">
          <button
            type="button" className="btn btn-ghost btn-compact" disabled={pending}
            onClick={() => start(async () => { await resetDemo() })}
          >
            Reset demo data
          </button>
          <button
            type="button" className="btn btn-secondary btn-compact" disabled={pending}
            onClick={() => start(async () => { await signOut() })}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="demo-bar">
      <p className="demo-bar-label">
        <span className="eyebrow">Demo sign-in</span>
        <span className="demo-bar-note">Real accounts, real password — no bypass.</span>
      </p>
      <div className="demo-bar-actions">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="btn btn-secondary btn-compact"
            disabled={pending}
            title={a.sublabel}
            onClick={() =>
              start(async () => {
                setError(null)
                const res = await signIn(a.email, process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'curio-demo')
                if (!res.ok) setError(res.error ?? 'Sign-in failed.')
                else router.push(a.role === 'artist' ? '/artist-dashboard' : '/discover')
              })
            }
          >
            {a.label}
          </button>
        ))}
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </div>
  )
}
