'use client'

/**
 * §10 — "SELECTION CAPS MATTER. The overlap-coefficient scoring in §12 degrades
 * toward noise if a user selects all twelve styles — everything matches equally
 * and the feed stops being personal. CAPS ARE A PRODUCT DECISION, NOT A UI
 * NICETY. Enforce them with a clear inline message."
 */

import { useId } from 'react'

export function MultiSelectChips({
  options, selected, onChange, min, max, name, swatches,
}: {
  options: Array<{ value: string; label: string; hint?: string }>
  selected: string[]
  onChange: (next: string[]) => void
  min: number
  max: number
  name: string
  swatches?: Record<string, string>
}) {
  const id = useId()
  const atCap = selected.length >= max

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value))
    else if (!atCap) onChange([...selected, value])
  }

  return (
    <div className="multiselect">
      <div className="multiselect-chips" role="group" aria-describedby={`${id}-cap`}>
        {options.map((o) => {
          const on = selected.includes(o.value)
          const blocked = !on && atCap
          return (
            <button
              key={o.value}
              type="button"
              className={`chip chip-lg${blocked ? ' is-blocked' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(o.value)}
              name={name}
            >
              {swatches?.[o.value] ? (
                <span className="chip-swatch" style={{ background: swatches[o.value] }} aria-hidden="true" />
              ) : null}
              {/* §45 — never colour alone. */}
              {on ? <span aria-hidden="true">✓</span> : null}
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>

      <p id={`${id}-cap`} className={`hint multiselect-cap${atCap ? ' is-at-cap' : ''}`} aria-live="polite">
        {atCap
          ? `That’s ${max} — the maximum. Unpick one to swap it out.`
          : `Pick ${selected.length === 0 ? `at least ${min}` : `up to ${max}`} — the fewer you choose, the sharper your recommendations.`}
      </p>
    </div>
  )
}
