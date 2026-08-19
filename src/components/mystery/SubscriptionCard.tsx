'use client'

/**
 * SUBSCRIPTION MANAGEMENT — PRD §26.5, §26.6.
 *
 * "On the subscription card in My Space: current brief summary, monthly price,
 *  next rotation date, EDIT BRIEF, ROTATE NOW, and CANCEL." (§26.6)
 *
 * §26.5 — rotation is USER-TRIGGERED in the MVP. "This is a FEATURE FOR THE
 * DEMO, not a compromise — it lets the presenter show the second cycle live."
 *
 * §26.6 — "Cancel in months 1–2 is DISABLED WITH THE REASON STATED."
 */

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MysterySubscription } from '@/lib/db/types'
import type { SessionState } from '@/lib/db/state'
import { daysRemaining, addMonths } from '@/lib/db/state'
import { dollars } from '@/components/ui/Money'
import { formatDate, pluralDays } from '@/lib/format'
import { rotateSubscription, cancelSubscription } from '@/lib/actions/mystery'
import { Modal } from '@/components/ui/Modal'
import { MysteryBadge, Badge } from '@/components/ui/Badge'
import { mysteryArtistShareCents } from '@/lib/pricing/rental'
import {
  COLOR_LABEL, PIECE_TYPE_LABEL, SIZE_LABEL, STYLE_LABEL, USER_ROOM_LABEL, joinLabels,
  type Color, type Style,
} from '@/lib/taxonomy'

export function SubscriptionCard({ subscription: sub, state }: { subscription: MysterySubscription; state: SessionState }) {
  const router = useRouter()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const daysToRotation = daysRemaining(sub.next_rotation_at)
  const minimumEnds = addMonths(sub.created_at.slice(0, 10), sub.minimum_term_months)
  const inMinimum = daysRemaining(minimumEnds) > 0
  const pieceCount = state.rentals.filter((r) => r.mystery_subscription_id === sub.id && r.status === 'active').length
  const share = mysteryArtistShareCents(sub.monthly_price_cents, Math.max(1, sub.number_of_pieces))

  const briefLine = joinLabels([
    ...sub.styles.map((s) => STYLE_LABEL[s as Style].toLowerCase()),
    ...sub.colors.map((c) => COLOR_LABEL[c as Color].toLowerCase()),
  ])

  return (
    <article className="sub-card">
      <div className="sub-card-head">
        <MysteryBadge />
        {sub.status === 'matching' ? <Badge tone="accent">Ready to reveal</Badge> : null}
        {sub.status === 'cancelled' ? <Badge tone="neutral">Cancelled</Badge> : null}
      </div>

      <p className="sub-card-price tnum">
        {dollars(sub.monthly_price_cents)}<span className="sub-card-per">/month</span>
      </p>

      <p className="sub-card-brief">
        {sub.number_of_pieces} {SIZE_LABEL[sub.size].toLowerCase()}{' '}
        {sub.number_of_pieces === 1 ? 'piece' : 'pieces'} · {PIECE_TYPE_LABEL[sub.piece_type].toLowerCase()}
        <br />
        {briefLine}
        {sub.room !== 'any' ? ` · ${USER_ROOM_LABEL[sub.room].toLowerCase()}` : ''}
      </p>

      {sub.status === 'matching' ? (
        <Link href={`/mystery/${sub.id}`} className="btn btn-primary btn-block">Reveal my pieces</Link>
      ) : (
        <>
          <p className="sub-card-rotation tnum">
            {daysToRotation > 0
              ? `Rotates in ${pluralDays(daysToRotation)} · ${formatDate(sub.next_rotation_at)}`
              : 'Ready to rotate'}
          </p>
          <p className="sub-card-meta">
            {pieceCount} on your walls · {dollars(share.perArtistCents)}/mo to each artist
          </p>

          <div className="sub-card-actions">
            <Link href={`/mystery/${sub.id}/edit`} className="btn btn-secondary btn-compact">Edit brief</Link>
            <button
              type="button" className="btn btn-secondary btn-compact" disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null)
                  const res = await rotateSubscription(sub.id)
                  if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
                  router.push(`/mystery/${sub.id}`)
                  router.refresh()
                })
              }
            >
              Rotate now
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              onClick={() => setConfirmCancel(true)}
              disabled={pending}
            >
              Cancel
            </button>
          </div>

          {/* §26.6 — the reason is STATED, not just disabled. */}
          {inMinimum ? (
            <p className="sub-card-note">
              Your {sub.minimum_term_months}-month minimum ends {formatDate(minimumEnds)}.
              You can cancel from then.
            </p>
          ) : null}
        </>
      )}

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel Mystery Art?"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmCancel(false)}>Keep it</button>
            <button
              type="button" className="btn btn-danger" disabled={pending || inMinimum}
              onClick={() =>
                start(async () => {
                  const res = await cancelSubscription(sub.id)
                  if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
                  setConfirmCancel(false)
                  router.refresh()
                })
              }
            >
              Cancel subscription
            </button>
          </>
        }
      >
        {inMinimum ? (
          <p className="modal-warn">
            Your {sub.minimum_term_months}-month minimum ends {formatDate(minimumEnds)}.
            You can cancel from then — not before.
          </p>
        ) : (
          <p className="modal-lede">
            Your subscription ends at the close of the current period, {formatDate(sub.current_period_end)}.
            The pieces on your walls go back then. Nothing else changes — anything you’ve
            bought stays yours.
          </p>
        )}
      </Modal>
    </article>
  )
}
