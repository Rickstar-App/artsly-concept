'use client'

/**
 * THE MYSTERY BRIEF — PRD §24.3.
 *
 * "One question per step, with the brief ASSEMBLING VISIBLY beside it as a
 *  growing summary card, and the price quote UPDATING LIVE FROM STEP 4 ONWARD.
 *  This is the §59 requirement from v1.0 ('should not feel like a generic form')
 *  MADE CONCRETE."
 *
 * All nine steps. Every option list comes from §9.
 */

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BUDGET_BANDS, BUDGET_LABEL, COLORS, COLOR_LABEL, COLOR_SWATCH, MYSTERY_CAPS,
  PIECE_TYPES, PIECE_TYPE_DESC, PIECE_TYPE_LABEL, SIZES, SIZE_HINT, SIZE_LABEL,
  SIZE_RANGE, STYLES, STYLE_LABEL, USER_ROOMS, USER_ROOM_LABEL, sizeCategory,
  type BudgetBand, type PieceType, type Size, type UserRoom,
} from '@/lib/taxonomy'
import { MYSTERY_MAX_PIECES, MYSTERY_MIN_PIECES, MYSTERY_MINIMUM_TERM_MONTHS, MYSTERY_RATE_CENTS } from '@/lib/pricing/config'
import { BoldnessSlider } from '@/components/survey/BoldnessSlider'
import { MultiSelectChips } from '@/components/survey/MultiSelectChips'
import { PricingCalculator } from './PricingCalculator'
import { BriefSummary, type BriefState } from './BriefSummary'
import { createSubscription } from '@/lib/actions/mystery'
import { dollars } from '@/components/ui/Money'
import type { PieceCount } from '@/lib/pricing/mystery'

export function MysteryForm({
  signedIn, presetType, presetArtist, presetArtistName,
}: {
  signedIn: boolean
  presetType?: PieceType
  presetArtist?: string
  presetArtistName?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const [brief, setBrief] = useState<BriefState>({
    piece_type: presetType,
    number_of_pieces: 1,
    colors: [],
    styles: [],
    boldness: 5,
  })

  const set = <K extends keyof BriefState>(k: K, v: BriefState[K]) => {
    setError(null)
    setBrief((b) => ({ ...b, [k]: v }))
  }

  // §24.3 — "Custom dimensions collects width and height and maps to a size
  // bucket via §9.5. The quote and the summary BOTH display the resolved bucket."
  const resolvedSize: Size | undefined = useMemo(() => {
    if (brief.size === 'custom') {
      if (!brief.custom_width_in || !brief.custom_height_in) return undefined
      return sizeCategory(brief.custom_width_in, brief.custom_height_in)
    }
    return brief.size
  }, [brief.size, brief.custom_width_in, brief.custom_height_in])

  const sizeNote = brief.size === 'custom' && resolvedSize
    ? `${brief.custom_width_in} × ${brief.custom_height_in} in — priced as ${SIZE_LABEL[resolvedSize]}`
    : undefined

  const steps: Array<{ q: string; help?: string; body: React.ReactNode; ready: boolean }> = [
    {
      q: 'Curated, custom, or surprise?',
      body: (
        <div className="single-select">
          {PIECE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={brief.piece_type === t}
              className={`option-row${brief.piece_type === t ? ' is-selected' : ''}`}
              onClick={() => set('piece_type', t)}
            >
              <span className="option-mark" aria-hidden="true">{brief.piece_type === t ? '●' : '○'}</span>
              <span className="option-body">
                <span className="option-label">{PIECE_TYPE_LABEL[t]}</span>
                <span className="option-hint">{PIECE_TYPE_DESC[t]}</span>
                <span className="option-hint tnum">
                  from {dollars(MYSTERY_RATE_CENTS[t].small)}/mo per small piece
                </span>
              </span>
            </button>
          ))}
        </div>
      ),
      ready: !!brief.piece_type,
    },
    {
      q: 'How many pieces?',
      help: 'Bundles are cheaper — 10% off two, 15% off three, 20% off four.',
      body: (
        // §24.3 — "a STEPPER capped at 4, not v1.0's '4+' — the pricing formula
        // multiplies by this value and '4+' is not a number."
        <div className="stepper" role="group" aria-label="Number of pieces">
          <button
            type="button" className="stepper-btn"
            aria-label="One fewer piece"
            disabled={brief.number_of_pieces <= MYSTERY_MIN_PIECES}
            onClick={() => set('number_of_pieces', Math.max(MYSTERY_MIN_PIECES, brief.number_of_pieces - 1))}
          >−</button>
          <output className="stepper-value tnum" aria-live="polite">{brief.number_of_pieces}</output>
          <button
            type="button" className="stepper-btn"
            aria-label="One more piece"
            disabled={brief.number_of_pieces >= MYSTERY_MAX_PIECES}
            onClick={() => set('number_of_pieces', Math.min(MYSTERY_MAX_PIECES, brief.number_of_pieces + 1))}
          >+</button>
        </div>
      ),
      ready: true,
    },
    {
      q: 'What size?',
      body: (
        <div className="single-select">
          {SIZES.map((s) => (
            <button
              key={s} type="button" role="radio" aria-checked={brief.size === s}
              className={`option-row${brief.size === s ? ' is-selected' : ''}`}
              onClick={() => set('size', s)}
            >
              <span className="option-mark" aria-hidden="true">{brief.size === s ? '●' : '○'}</span>
              <span className="option-body">
                <span className="option-label">{SIZE_LABEL[s]}</span>
                <span className="option-hint">{SIZE_RANGE[s]} — {SIZE_HINT[s]}</span>
              </span>
            </button>
          ))}
          <button
            type="button" role="radio" aria-checked={brief.size === 'custom'}
            className={`option-row${brief.size === 'custom' ? ' is-selected' : ''}`}
            onClick={() => set('size', 'custom')}
          >
            <span className="option-mark" aria-hidden="true">{brief.size === 'custom' ? '●' : '○'}</span>
            <span className="option-body">
              <span className="option-label">Custom dimensions</span>
              <span className="option-hint">We’ll price it by its longest edge.</span>
            </span>
          </button>

          {brief.size === 'custom' ? (
            <div className="custom-dims">
              <div className="field-block">
                <label htmlFor="cw" className="label">Width (in)</label>
                <input
                  id="cw" type="number" min={1} max={400} className="field tnum"
                  value={brief.custom_width_in ?? ''}
                  onChange={(e) => set('custom_width_in', Number(e.target.value) || undefined)}
                />
              </div>
              <div className="field-block">
                <label htmlFor="ch" className="label">Height (in)</label>
                <input
                  id="ch" type="number" min={1} max={400} className="field tnum"
                  value={brief.custom_height_in ?? ''}
                  onChange={(e) => set('custom_height_in', Number(e.target.value) || undefined)}
                />
              </div>
              {sizeNote ? <p className="hint custom-dims-note" aria-live="polite">{sizeNote}</p> : null}
            </div>
          ) : null}
        </div>
      ),
      ready: !!resolvedSize,
    },
    {
      q: 'Which colours?',
      help: `Pick ${MYSTERY_CAPS.colors.min}–${MYSTERY_CAPS.colors.max}.`,
      body: (
        <MultiSelectChips
          name="mystery-colors"
          options={COLORS.map((c) => ({ value: c, label: COLOR_LABEL[c] }))}
          selected={brief.colors}
          onChange={(v) => set('colors', v)}
          min={MYSTERY_CAPS.colors.min}
          max={MYSTERY_CAPS.colors.max}
          swatches={COLOR_SWATCH}
        />
      ),
      ready: brief.colors.length >= MYSTERY_CAPS.colors.min,
    },
    {
      q: 'Which styles?',
      help: `Pick ${MYSTERY_CAPS.styles.min}–${MYSTERY_CAPS.styles.max}.`,
      body: (
        <MultiSelectChips
          name="mystery-styles"
          options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))}
          selected={brief.styles}
          onChange={(v) => set('styles', v)}
          min={MYSTERY_CAPS.styles.min}
          max={MYSTERY_CAPS.styles.max}
        />
      ),
      ready: brief.styles.length >= MYSTERY_CAPS.styles.min,
    },
    {
      q: 'Which room?',
      body: (
        <div className="single-select">
          {USER_ROOMS.map((r) => (
            <button
              key={r} type="button" role="radio" aria-checked={brief.room === r}
              className={`option-row${brief.room === r ? ' is-selected' : ''}`}
              onClick={() => set('room', r as UserRoom)}
            >
              <span className="option-mark" aria-hidden="true">{brief.room === r ? '●' : '○'}</span>
              <span className="option-label">{USER_ROOM_LABEL[r]}</span>
            </button>
          ))}
        </div>
      ),
      ready: !!brief.room,
    },
    {
      q: 'How bold?',
      body: <BoldnessSlider value={brief.boldness} onChange={(v) => set('boldness', v)} />,
      ready: true,
    },
    {
      q: 'What’s your monthly budget?',
      help: 'Mystery Art is billed monthly, unlike library rentals. We’ll tell you straight away if the brief costs more than this.',
      body: (
        <div className="single-select">
          {BUDGET_BANDS.map((b) => (
            <button
              key={b} type="button" role="radio" aria-checked={brief.budget_band === b}
              className={`option-row${brief.budget_band === b ? ' is-selected' : ''}`}
              onClick={() => set('budget_band', b as BudgetBand)}
            >
              <span className="option-mark" aria-hidden="true">{brief.budget_band === b ? '●' : '○'}</span>
              <span className="option-label">{BUDGET_LABEL[b]}</span>
            </button>
          ))}
        </div>
      ),
      ready: !!brief.budget_band,
    },
    {
      q: 'Anything else?',
      // §24.3 — "A human reads this before we choose." Stated, because it does
      // not affect matching in the MVP and pretending otherwise would be a lie.
      help: 'Optional. A human reads this before we choose — it doesn’t change the matching itself.',
      body: (
        <div className="field-block">
          <label htmlFor="special" className="label">Notes for whoever picks your pieces</label>
          <textarea
            id="special" className="field" rows={4} maxLength={500}
            value={brief.special_requests ?? ''}
            onChange={(e) => set('special_requests', e.target.value)}
            placeholder="Anything we should know about the wall, the light, or what you’re tired of looking at."
          />
          <p className="hint tnum">{(brief.special_requests ?? '').length} / 500</p>
        </div>
      ),
      ready: true,
    },
  ]

  const current = steps[step]
  const last = step === steps.length - 1
  // §24.3 — the quote appears from step 4 onward (index 3), once size and count
  // are both known.
  const showQuote = step >= 2 && !!brief.piece_type && !!resolvedSize

  const submit = () => {
    start(async () => {
      setError(null)
      const res = await createSubscription({
        piece_type: brief.piece_type,
        number_of_pieces: brief.number_of_pieces,
        size: brief.size,
        custom_width_in: brief.custom_width_in ?? null,
        custom_height_in: brief.custom_height_in ?? null,
        colors: brief.colors,
        styles: brief.styles,
        room: brief.room,
        boldness: brief.boldness,
        budget_band: brief.budget_band,
        special_requests: brief.special_requests ?? null,
        preferred_artist: presetArtist ?? null,
      })
      if (!res.ok || !res.subscriptionId) { setError(res.error ?? 'Something went wrong.'); return }
      router.push(`/mystery/${res.subscriptionId}`)
      router.refresh()
    })
  }

  return (
    <div className="mystery-form">
      <div className="mystery-form-main">
        <div className="quiz-progress">
          <div className="quiz-progress-bar">
            <div className="quiz-progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <p className="quiz-progress-label tnum" aria-live="polite">Step {step + 1} of {steps.length}</p>
        </div>

        {presetArtistName ? (
          <p className="preset-note">
            Commissioning <strong>{presetArtistName}</strong>. Tell us what to ask for.
          </p>
        ) : null}

        <div className="quiz-body" key={step}>
          <h1 className="quiz-question">{current.q}</h1>
          {current.help ? <p className="quiz-help">{current.help}</p> : null}
          {current.body}
        </div>

        {error ? <p className="error-text" role="alert">{error}</p> : null}

        {!signedIn && last ? (
          <p className="quiz-signin-note">
            You’ll need to be signed in to start a subscription. The demo sign-in is in the footer.
          </p>
        ) : null}

        <div className="quiz-nav">
          <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </button>
          {last ? (
            <button type="button" className="btn btn-primary" disabled={!current.ready || pending} onClick={submit}>
              {pending ? 'Matching…' : 'Start my subscription'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={!current.ready} onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          )}
        </div>
      </div>

      <div className="mystery-form-side">
        <BriefSummary brief={brief} resolvedSize={resolvedSize} />

        {showQuote && brief.budget_band ? (
          <PricingCalculator
            pieceType={brief.piece_type!}
            size={resolvedSize!}
            pieces={brief.number_of_pieces as PieceCount}
            band={brief.budget_band}
            sizeNote={sizeNote}
            onApply={({ pieces, size }) => {
              setBrief((b) => ({ ...b, number_of_pieces: pieces, size }))
            }}
          />
        ) : showQuote ? (
          <PricingCalculator
            pieceType={brief.piece_type!}
            size={resolvedSize!}
            pieces={brief.number_of_pieces as PieceCount}
            band={'200-plus' as BudgetBand}
            sizeNote={sizeNote}
          />
        ) : null}

        <p className="mystery-terms">
          Billed monthly. {MYSTERY_MINIMUM_TERM_MONTHS}-month minimum, then cancel anytime.
          Pieces rotate every 3 months. Shipping included, both ways.
        </p>
      </div>
    </div>
  )
}
