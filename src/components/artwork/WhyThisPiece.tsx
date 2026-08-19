'use client'

/**
 * "WHY THIS PIECE" — PRD §39.3.
 *
 * §50.4 makes it a Definition-of-Done item that a user can "UNDERSTAND WHY a
 * specific piece was recommended, in plain language." §39.3: "A chip alone
 * doesn't get there."
 *
 * Non-matching attributes render with a neutral dash and an honest note, NEVER
 * HIDDEN. Plain language, no numbers beyond the ones the user themselves chose.
 */

import { useId, useState } from 'react'
import type { WhyLine } from '@/lib/recommend/explain'

export function WhyThisPiece({
  lines, matchScore, defaultOpen = true,
}: { lines: WhyLine[]; matchScore: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section className="why-panel">
      <button
        type="button"
        className="why-head"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="eyebrow">Why this piece</span>
        <span className="why-score tnum">{matchScore}% match</span>
        <span className="why-caret" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      <ul id={id} className="why-list" hidden={!open}>
        {lines.map((l, i) => (
          <li key={i} className={l.matched ? 'why-line is-match' : 'why-line'}>
            <span className="why-mark" aria-hidden="true">{l.matched ? '✓' : '–'}</span>
            <span className="why-text">{l.text}</span>
            <span className="sr-only">{l.matched ? ' — matches your profile' : ' — does not match your profile'}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
