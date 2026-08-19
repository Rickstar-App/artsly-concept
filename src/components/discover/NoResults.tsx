'use client'

/**
 * §41.1 — no results.
 *
 *   **Nothing matches all of that — yet.**
 *   Try loosening one thing:
 *   [ Remove "Oversized" — 14 pieces ]  [ Remove "$25–$50" — 9 pieces ]  [ Clear all ]
 *
 * "COMPUTE THOSE COUNTS. A generic 'try expanding your preferences' is not a
 *  design; naming the specific facet and its result count is."
 */
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { FacetRelaxation } from '@/lib/recommend/feed'

export function NoResults({ options }: { options: FacetRelaxation[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const drop = (facet: string) => {
    const next = new URLSearchParams(params.toString())
    next.delete(facet)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  return (
    <div className="no-results">
      <p className="no-results-title">Nothing matches all of that — yet.</p>
      <p className="no-results-sub">Try loosening one thing:</p>
      <div className="no-results-actions">
        {options.map((o) => (
          <button key={String(o.facet)} type="button" className="btn btn-secondary btn-compact" onClick={() => drop(String(o.facet))}>
            {o.label} — <span className="tnum">{o.count} pieces</span>
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-compact" onClick={() => router.replace(pathname, { scroll: false })}>
          Clear all
        </button>
      </div>
    </div>
  )
}
