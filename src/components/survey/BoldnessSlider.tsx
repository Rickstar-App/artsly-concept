'use client'

/**
 * BOLDNESS SLIDER — PRD §45.
 *
 * "role='slider' with aria-valuemin/max/now, aria-valuetext='4 of 10 — fairly
 *  subtle', arrow-key stepping, and A PAIRED NUMBER INPUT. A drag-only control
 *  excludes keyboard users from a required question."
 *
 * §36 — "The onboarding slider needs a large touch target and a visible numeric
 * readout."
 */

import { useId } from 'react'
import { BOLDNESS_MAX, BOLDNESS_MIN, boldnessLabel } from '@/lib/taxonomy'

export function BoldnessSlider({
  value, onChange, label = 'How bold should it be?',
}: { value: number; onChange: (v: number) => void; label?: string }) {
  const id = useId()
  const valueText = `${value} of ${BOLDNESS_MAX} — ${boldnessLabel(value)}`

  return (
    <div className="boldness">
      <div className="boldness-readout">
        <span className="boldness-value tnum" aria-hidden="true">{value}</span>
        <span className="boldness-word">{boldnessLabel(value)}</span>
      </div>

      <input
        id={id}
        type="range"
        className="boldness-range"
        min={BOLDNESS_MIN}
        max={BOLDNESS_MAX}
        step={1}
        value={value}
        aria-label={label}
        aria-valuemin={BOLDNESS_MIN}
        aria-valuemax={BOLDNESS_MAX}
        aria-valuenow={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="boldness-scale" aria-hidden="true">
        <span>Quiet — recedes into the room</span>
        <span>A statement piece</span>
      </div>

      {/* The paired number input §45 requires. Not decoration. */}
      <div className="boldness-paired">
        <label htmlFor={`${id}-num`} className="hint">Or type a number, 1–10</label>
        <input
          id={`${id}-num`}
          type="number"
          className="field boldness-number tnum"
          min={BOLDNESS_MIN}
          max={BOLDNESS_MAX}
          step={1}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (Number.isFinite(n)) onChange(Math.min(BOLDNESS_MAX, Math.max(BOLDNESS_MIN, Math.round(n))))
          }}
        />
      </div>
    </div>
  )
}
