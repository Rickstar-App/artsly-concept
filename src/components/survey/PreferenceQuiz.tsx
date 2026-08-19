'use client'

/**
 * ONBOARDING SURVEY — PRD §10.
 *
 * "Eight questions, ONE PER SCREEN, with a progress indicator and a persistent
 *  back control. Target completion time: UNDER 90 SECONDS. Saves to
 *  user_preferences on submit; partial progress persists in sessionStorage so a
 *  refresh doesn't lose work."
 *
 * EVERY OPTION LIST IS DRAWN FROM §9. Not one is restated here — that is the
 * regression guard against v1.0's silent-zero defect, enforced by
 * `taxonomy.test.ts`.
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BOLDNESS_DEFAULT, BUDGET_BANDS, BUDGET_LABEL, CHANGE_FREQUENCIES,
  CHANGE_FREQUENCY_LABEL, COLORS, COLOR_LABEL, COLOR_SWATCH, MOODS, MOOD_LABEL,
  SIZES, SIZE_HINT, SIZE_LABEL, SIZE_RANGE, STYLES, STYLE_LABEL, SURVEY_CAPS,
  USER_ROOMS, USER_ROOM_LABEL,
  type BudgetBand, type ChangeFrequency, type Size, type UserRoom,
} from '@/lib/taxonomy'
import { BoldnessSlider } from './BoldnessSlider'
import { MultiSelectChips } from './MultiSelectChips'
import { savePreferences } from '@/lib/actions/preferences'

const DRAFT_KEY = 'artsly:survey-draft'

interface Draft {
  room?: UserRoom
  styles: string[]
  colors: string[]
  moods: string[]
  boldness: number
  size_preference?: Size
  change_frequency?: ChangeFrequency
  budget_band?: BudgetBand
}

const EMPTY_DRAFT: Draft = { styles: [], colors: [], moods: [], boldness: BOLDNESS_DEFAULT }

export function PreferenceQuiz({
  initial, signedIn,
}: { initial?: Partial<Draft>; signedIn: boolean }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  /**
   * §10 — "partial progress persists in sessionStorage so a refresh doesn't lose
   * work." Read LAZILY on first render rather than in an effect: setState inside
   * an effect body causes a cascading render, and the survey is the first thing
   * a new user touches.
   *
   * An existing taste profile always wins over a stale draft.
   */
  const [draft, setDraft] = useState<Draft>(() => {
    if (initial && Object.keys(initial).length > 0) return { ...EMPTY_DRAFT, ...initial }
    if (typeof window === 'undefined') return EMPTY_DRAFT
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      return raw ? { ...EMPTY_DRAFT, ...JSON.parse(raw) } : EMPTY_DRAFT
    } catch {
      return EMPTY_DRAFT // a corrupt draft is not worth surfacing
    }
  })

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* private mode */ }
  }, [draft])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setError(null)
    setDraft((d) => ({ ...d, [k]: v }))
  }

  const steps: Array<{ q: string; help?: string; body: React.ReactNode; ready: boolean }> = [
    {
      q: 'Which space are you decorating?',
      body: (
        <SingleSelect
          options={USER_ROOMS.map((r) => ({ value: r, label: USER_ROOM_LABEL[r] }))}
          value={draft.room}
          onChange={(v) => set('room', v as UserRoom)}
        />
      ),
      ready: !!draft.room,
    },
    {
      q: 'Which styles do you like?',
      help: `Pick ${SURVEY_CAPS.styles.min}–${SURVEY_CAPS.styles.max}.`,
      body: (
        <MultiSelectChips
          name="styles"
          options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))}
          selected={draft.styles}
          onChange={(v) => set('styles', v)}
          min={SURVEY_CAPS.styles.min}
          max={SURVEY_CAPS.styles.max}
        />
      ),
      ready: draft.styles.length >= SURVEY_CAPS.styles.min,
    },
    {
      q: 'Which colours work in your space?',
      help: `Pick ${SURVEY_CAPS.colors.min}–${SURVEY_CAPS.colors.max}.`,
      body: (
        <MultiSelectChips
          name="colors"
          options={COLORS.map((c) => ({ value: c, label: COLOR_LABEL[c] }))}
          selected={draft.colors}
          onChange={(v) => set('colors', v)}
          min={SURVEY_CAPS.colors.min}
          max={SURVEY_CAPS.colors.max}
          swatches={COLOR_SWATCH}
        />
      ),
      ready: draft.colors.length >= SURVEY_CAPS.colors.min,
    },
    {
      q: 'What should the art make you feel?',
      help: `Pick ${SURVEY_CAPS.moods.min}–${SURVEY_CAPS.moods.max}.`,
      body: (
        <MultiSelectChips
          name="moods"
          options={MOODS.map((m) => ({ value: m, label: MOOD_LABEL[m] }))}
          selected={draft.moods}
          onChange={(v) => set('moods', v)}
          min={SURVEY_CAPS.moods.min}
          max={SURVEY_CAPS.moods.max}
        />
      ),
      ready: draft.moods.length >= SURVEY_CAPS.moods.min,
    },
    {
      q: 'How bold should it be?',
      help: 'One means it recedes into the room. Ten means it owns the wall.',
      body: <BoldnessSlider value={draft.boldness} onChange={(v) => set('boldness', v)} />,
      ready: true,
    },
    {
      q: 'What size fits your wall?',
      // §10 — "Most users do not know what 'Large' means. Show the inch ranges."
      body: (
        <SingleSelect
          options={SIZES.map((s) => ({
            value: s,
            label: SIZE_LABEL[s],
            hint: `${SIZE_RANGE[s]} — ${SIZE_HINT[s]}`,
          }))}
          value={draft.size_preference}
          onChange={(v) => set('size_preference', v as Size)}
        />
      ),
      ready: !!draft.size_preference,
    },
    {
      q: 'How often do you want to change it?',
      body: (
        <SingleSelect
          options={CHANGE_FREQUENCIES.map((f) => ({ value: f, label: CHANGE_FREQUENCY_LABEL[f] }))}
          value={draft.change_frequency}
          onChange={(v) => set('change_frequency', v as ChangeFrequency)}
        />
      ),
      ready: !!draft.change_frequency,
    },
    {
      q: 'What’s your monthly budget?',
      // §10 — "must label the bands as monthly and state that it's an
      // equivalent, not a bill."
      help: 'About what you’d want to spend per month. Rentals are prepaid by term — we’ll always show you both numbers.',
      body: (
        <SingleSelect
          options={BUDGET_BANDS.map((b) => ({ value: b, label: BUDGET_LABEL[b] }))}
          value={draft.budget_band}
          onChange={(v) => set('budget_band', v as BudgetBand)}
        />
      ),
      ready: !!draft.budget_band,
    },
  ]

  const current = steps[step]
  const last = step === steps.length - 1

  const submit = () => {
    start(async () => {
      const res = await savePreferences({
        room: draft.room,
        styles: draft.styles,
        colors: draft.colors,
        moods: draft.moods,
        boldness: draft.boldness,
        size_preference: draft.size_preference,
        change_frequency: draft.change_frequency,
        budget_band: draft.budget_band,
      })
      if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
      try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* private mode */ }
      router.push('/discover')
      router.refresh()
    })
  }

  return (
    <div className="quiz">
      <div className="quiz-progress">
        <div className="quiz-progress-bar">
          <div className="quiz-progress-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="quiz-progress-label tnum" aria-live="polite">
          Question {step + 1} of {steps.length}
        </p>
      </div>

      <div className="quiz-body" key={step}>
        <h1 className="quiz-question">{current.q}</h1>
        {current.help ? <p className="quiz-help">{current.help}</p> : null}
        {current.body}
      </div>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      {!signedIn && last ? (
        <p className="quiz-signin-note">
          You’ll need to be signed in to save this. Use the demo sign-in in the footer — it takes one click.
        </p>
      ) : null}

      <div className="quiz-nav">
        {/* §10 — a PERSISTENT back control. */}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </button>

        {last ? (
          <button type="button" className="btn btn-primary" disabled={!current.ready || pending} onClick={submit}>
            {pending ? 'Saving…' : 'See my recommendations'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!current.ready}
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}

function SingleSelect({
  options, value, onChange,
}: {
  options: Array<{ value: string; label: string; hint?: string }>
  value: string | undefined
  onChange: (v: string) => void
}) {
  return (
    <div className="single-select" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`option-row${value === o.value ? ' is-selected' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span className="option-mark" aria-hidden="true">{value === o.value ? '●' : '○'}</span>
          <span className="option-body">
            <span className="option-label">{o.label}</span>
            {o.hint ? <span className="option-hint">{o.hint}</span> : null}
          </span>
        </button>
      ))}
    </div>
  )
}
