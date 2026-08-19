'use client'

/**
 * §7.5 — edit the brief; re-quote; REQUIRE CONFIRMATION of the new monthly
 * amount before saving. §26.5 — it takes effect at the next rotation.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MysterySubscription } from '@/lib/db/types'
import { updateBrief } from '@/lib/actions/mystery'
import { PricingCalculator } from './PricingCalculator'
import { MultiSelectChips } from '@/components/survey/MultiSelectChips'
import { BoldnessSlider } from '@/components/survey/BoldnessSlider'
import { dollars } from '@/components/ui/Money'
import { mysteryMonthlyCents, type PieceCount } from '@/lib/pricing/mystery'
import { MYSTERY_MAX_PIECES, MYSTERY_MIN_PIECES } from '@/lib/pricing/config'
import {
  BUDGET_BANDS, BUDGET_LABEL, COLORS, COLOR_LABEL, COLOR_SWATCH, MYSTERY_CAPS,
  PIECE_TYPES, PIECE_TYPE_LABEL, SIZES, SIZE_LABEL, STYLES, STYLE_LABEL,
  USER_ROOMS, USER_ROOM_LABEL,
  type BudgetBand, type PieceType, type Size, type UserRoom,
} from '@/lib/taxonomy'

export function EditBriefForm({ subscription: sub }: { subscription: MysterySubscription }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [pieceType, setPieceType] = useState<PieceType>(sub.piece_type)
  const [pieces, setPieces] = useState<PieceCount>(sub.number_of_pieces as PieceCount)
  const [size, setSize] = useState<Size>(sub.size)
  const [colors, setColors] = useState<string[]>([...sub.colors])
  const [styles, setStyles] = useState<string[]>([...sub.styles])
  const [room, setRoom] = useState<UserRoom>(sub.room)
  const [boldness, setBoldness] = useState(sub.boldness)
  const [band, setBand] = useState<BudgetBand>(sub.budget_band)
  const [notes, setNotes] = useState(sub.special_requests ?? '')

  const newPrice = mysteryMonthlyCents({ pieceType, size, pieces })
  const changed = newPrice !== sub.monthly_price_cents

  return (
    <div className="edit-brief">
      <p className="eyebrow">Edit your brief</p>
      <h1 className="page-title">What should we look for next?</h1>
      <p className="lede">
        Changes take effect at your next rotation, {sub.next_rotation_at}. Your pieces
        stay put until then.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          start(async () => {
            setError(null)
            const res = await updateBrief(sub.id, {
              piece_type: pieceType, number_of_pieces: pieces, size,
              custom_width_in: null, custom_height_in: null,
              colors, styles, room, boldness, budget_band: band,
              special_requests: notes || null, preferred_artist: null,
            })
            if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
            router.push('/my-space')
            router.refresh()
          })
        }}
        className="edit-brief-form"
      >
        <Row label="Type">
          <div className="facet-chips">
            {PIECE_TYPES.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={pieceType === t} onClick={() => setPieceType(t)}>
                {pieceType === t ? <span aria-hidden="true">✓</span> : null}{PIECE_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </Row>

        <Row label="How many">
          <div className="stepper">
            <button type="button" className="stepper-btn" aria-label="One fewer" disabled={pieces <= MYSTERY_MIN_PIECES}
              onClick={() => setPieces((p) => Math.max(MYSTERY_MIN_PIECES, p - 1) as PieceCount)}>−</button>
            <output className="stepper-value tnum">{pieces}</output>
            <button type="button" className="stepper-btn" aria-label="One more" disabled={pieces >= MYSTERY_MAX_PIECES}
              onClick={() => setPieces((p) => Math.min(MYSTERY_MAX_PIECES, p + 1) as PieceCount)}>+</button>
          </div>
        </Row>

        <Row label="Size">
          <div className="facet-chips">
            {SIZES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={size === s} onClick={() => setSize(s)}>
                {size === s ? <span aria-hidden="true">✓</span> : null}{SIZE_LABEL[s]}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Colours">
          <MultiSelectChips name="c" options={COLORS.map((c) => ({ value: c, label: COLOR_LABEL[c] }))}
            selected={colors} onChange={setColors} min={MYSTERY_CAPS.colors.min} max={MYSTERY_CAPS.colors.max} swatches={COLOR_SWATCH} />
        </Row>

        <Row label="Styles">
          <MultiSelectChips name="s" options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))}
            selected={styles} onChange={setStyles} min={MYSTERY_CAPS.styles.min} max={MYSTERY_CAPS.styles.max} />
        </Row>

        <Row label="Room">
          <div className="facet-chips">
            {USER_ROOMS.map((r) => (
              <button key={r} type="button" className="chip" aria-pressed={room === r} onClick={() => setRoom(r as UserRoom)}>
                {room === r ? <span aria-hidden="true">✓</span> : null}{USER_ROOM_LABEL[r]}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Boldness"><BoldnessSlider value={boldness} onChange={setBoldness} /></Row>

        <Row label="Budget">
          <div className="facet-chips">
            {BUDGET_BANDS.map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={band === b} onClick={() => setBand(b as BudgetBand)}>
                {band === b ? <span aria-hidden="true">✓</span> : null}{BUDGET_LABEL[b]}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Notes">
          <textarea className="field" rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Row>

        <PricingCalculator pieceType={pieceType} size={size} pieces={pieces} band={band}
          onApply={({ pieces: p, size: sz }) => { setPieces(p); setSize(sz) }} />

        {/* §7.5 — the user must CONFIRM the new monthly amount. */}
        {changed ? (
          <p className="modal-warn">
            Your monthly price changes from <span className="tnum">{dollars(sub.monthly_price_cents)}</span> to{' '}
            <span className="tnum">{dollars(newPrice)}</span>, starting at the next rotation.
          </p>
        ) : null}

        {error ? <p className="error-text" role="alert">{error}</p> : null}

        <div className="extend-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : changed ? `Confirm ${dollars(newPrice)}/mo` : 'Save brief'}
          </button>
          <Link href="/my-space" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="edit-row">
      <p className="eyebrow edit-row-label">{label}</p>
      <div className="edit-row-body">{children}</div>
    </div>
  )
}
