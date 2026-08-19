'use client'

/**
 * FAVOURITES — PRD §28.
 *
 * "Heart toggle on every artwork card and detail page. OPTIMISTIC UI, REVERTS
 *  ON FAILURE." Saving writes a `favorites` row, a `save` event, and the §13.2
 *  affinity delta — and may trigger §13.4's visible-learning toast.
 */

import { useOptimistic, useTransition, useState } from 'react'
import { toggleFavorite } from '@/lib/actions/favorites'
import { toast } from '@/components/ui/Toast'
import { undoPreferenceShift } from '@/lib/actions/preferences'

export function SaveToggle({
  artworkId, artworkTitle, initialSaved, compact,
}: { artworkId: string; artworkTitle: string; initialSaved: boolean; compact?: boolean }) {
  const [saved, setSaved] = useState(initialSaved)
  const [optimistic, setOptimistic] = useOptimistic(saved)
  const [, start] = useTransition()

  return (
    <button
      type="button"
      className={`save-toggle${compact ? ' save-toggle-compact' : ''}${optimistic ? ' is-saved' : ''}`}
      aria-pressed={optimistic}
      aria-label={optimistic ? `Remove “${artworkTitle}” from saved` : `Save “${artworkTitle}”`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        start(async () => {
          setOptimistic(!optimistic)
          const res = await toggleFavorite(artworkId)
          if (!res.ok) {
            // §28 — optimistic UI REVERTS on failure.
            setSaved(saved)
            toast({ title: 'Couldn’t save that piece.', body: 'Check your connection and try again.', tone: 'warning' })
            return
          }
          setSaved(res.saved)

          // §13.4 — the visible-learning moment, with one-click reversal.
          for (const shift of res.shifts ?? []) {
            toast({
              title:
                shift.kind === 'added'
                  ? `You’ve been loving ${shift.label} — added to your taste profile.`
                  : `You keep passing on ${shift.label} — removed from your taste profile.`,
              body: shift.displaced ? `${shift.displacedLabel} made way for it.` : undefined,
              tone: 'success',
              undo: {
                label: 'Undo',
                action: async () => { await undoPreferenceShift(shift.tag_type, shift.tag, shift.kind) },
              },
            })
          }
        })
      }}
    >
      <svg width={compact ? 16 : 20} height={compact ? 16 : 20} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20.5 3.8 12.6a5 5 0 0 1 7.1-7l1.1 1.1 1.1-1.1a5 5 0 1 1 7.1 7L12 20.5Z"
          fill={optimistic ? 'currentColor' : 'none'}
          stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
