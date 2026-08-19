/**
 * §41.6 — "Skeleton loaders — MATCHING THE REAL LAYOUT'S DIMENSIONS, so nothing
 * shifts on load."
 *
 * The Mystery reveal (§26.3) is a DELIBERATE animation, not a loading state.
 * Do not skeleton it.
 */

export function Skeleton({ h, w, r, className }: { h?: number | string; w?: number | string; r?: number; className?: string }) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ height: h ?? 16, width: w ?? '100%', borderRadius: r ?? 4 }}
      aria-hidden="true"
    />
  )
}

/** Mirrors ArtworkCard's real dimensions exactly. */
export function ArtworkCardSkeleton() {
  return (
    <div className="artwork-card" aria-hidden="true">
      <Skeleton h={240} r={8} />
      <div style={{ padding: '16px 0 0' }}>
        <Skeleton h={12} w="45%" />
        <div style={{ height: 12 }} />
        <Skeleton h={18} w="70%" />
        <div style={{ height: 8 }} />
        <Skeleton h={14} w="40%" />
        <div style={{ height: 16 }} />
        <Skeleton h={14} w="55%" />
      </div>
    </div>
  )
}

export function ArtworkGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="artwork-grid">
      {Array.from({ length: count }, (_, i) => <ArtworkCardSkeleton key={i} />)}
    </div>
  )
}
