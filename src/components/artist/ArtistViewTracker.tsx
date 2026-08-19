'use client'
/** §40 — `artist_viewed`. */
import { useEffect } from 'react'
import { logEvent } from '@/lib/actions/events'

export function ArtistViewTracker({ artistId }: { artistId: string }) {
  useEffect(() => { void logEvent('artist_viewed', { artistId }) }, [artistId])
  return null
}
