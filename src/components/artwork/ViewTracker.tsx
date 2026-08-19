'use client'

/**
 * §13.2 — "View (DWELL ≥ 3s on the detail page) +0.02".
 *
 * The dwell requirement is the whole point: a bounce is not interest, and
 * counting it would let noise move the taste profile.
 */
import { useEffect, useRef } from 'react'
import { recordView } from '@/lib/actions/events'

export function ViewTracker({ artworkId }: { artworkId: string }) {
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false
    const t = window.setTimeout(() => {
      if (fired.current || document.hidden) return
      fired.current = true
      void recordView(artworkId)
    }, 3000)
    return () => window.clearTimeout(t)
  }, [artworkId])
  return null
}
