'use client'

/** §41.5 — state what happened, what it cost the user, and what to do next. */
import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="page section-top narrow error-page">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="page-title">We couldn’t load that.</h1>
      <p className="lede">
        Nothing was charged and nothing changed. Try again, or head back to the library.
      </p>
      <div className="extend-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/discover" className="btn btn-secondary">Browse the library</Link>
      </div>
      {error.digest ? <p className="hint tnum">Reference: {error.digest}</p> : null}
    </div>
  )
}
