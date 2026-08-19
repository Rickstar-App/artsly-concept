'use client'

/**
 * RETURN — PRD §22.
 *
 * "Confirmation modal explaining that the piece leaves their collection, that
 *  NO REFUND is issued for remaining time, and that a prepaid return label will
 *  arrive by email (simulated)."
 *
 * "SKIPPING THE REASON IS ALWAYS ALLOWED. Never block the return on the
 *  question." (§22)
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { RETURN_REASONS, RETURN_REASON_LABEL, type ReturnReason } from '@/lib/taxonomy'
import { returnRental } from '@/lib/actions/rentals'
import { toast } from '@/components/ui/Toast'
import { pluralDays } from '@/lib/format'

export function ReturnDialog({
  open, onClose, rentalId, artworkTitle, daysLeft,
}: {
  open: boolean
  onClose: () => void
  rentalId: string
  artworkTitle: string
  daysLeft: number
}) {
  const [reason, setReason] = useState<ReturnReason | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  const submit = () => {
    start(async () => {
      const res = await returnRental(rentalId, reason, reason === 'other' ? note : null)
      if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
      onClose()
      toast({
        title: `“${artworkTitle}” is heading back.`,
        body: 'A prepaid return label will arrive by email.',
        tone: 'success',
      })
      // §22.6 — land on "What's next?" with fresh recommendations, biased away
      // from the returned piece's tags when the reason was style.
      router.push(`/my-space/returned?from=${encodeURIComponent(rentalId)}${reason ? `&reason=${reason}` : ''}`)
      router.refresh()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Send back “${artworkTitle}”?`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>Keep it</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={pending}>
            {pending ? 'Sending…' : 'Send it back'}
          </button>
        </>
      }
    >
      <p className="modal-lede">
        It leaves your collection and goes back to the artist. A prepaid return label
        will arrive by email — shipping is on us, both ways.
      </p>

      {daysLeft > 0 ? (
        <p className="modal-warn">
          You have {pluralDays(daysLeft)} left on this rental. Returning now doesn’t
          refund or credit them.
        </p>
      ) : null}

      <fieldset className="return-reasons">
        <legend className="eyebrow">Why are you sending it back? <span className="hint">Optional</span></legend>
        {RETURN_REASONS.map((r) => (
          <label key={r} className={`option-row option-row-compact${reason === r ? ' is-selected' : ''}`}>
            <input
              type="radio"
              name="return-reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              className="sr-only"
            />
            <span className="option-mark" aria-hidden="true">{reason === r ? '●' : '○'}</span>
            <span className="option-label">{RETURN_REASON_LABEL[r]}</span>
          </label>
        ))}
      </fieldset>

      {reason === 'other' ? (
        <div className="field-block">
          <label htmlFor="return-note" className="label">Tell us more <span className="hint">optional, 200 characters</span></label>
          <textarea
            id="return-note"
            className="field"
            rows={3}
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      ) : null}

      {/* §13.2 — "space" triggers the size-preference prompt. EXPLICIT BEATS SILENT. */}
      {reason === 'space' ? (
        <p className="modal-hint">
          Want to change your size preference? You can adjust it any time in{' '}
          <a href="/profile/taste" className="inline-link">your taste profile</a>.
        </p>
      ) : null}

      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </Modal>
  )
}
