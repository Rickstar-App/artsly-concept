/**
 * §39.2 — reason chips.
 *
 * §39.1 draws the line: a match percentage and plain-language statements of
 * WHICH attributes matched are allowed; weights, the formula, and component
 * sub-scores are not. Nothing here emits a number the user did not choose.
 */
import type { Reason } from '@/lib/recommend/explain'

export function ReasonChip({ reason }: { reason: Reason }) {
  return <p className="reason-chip">{reason.text}</p>
}

/** §39.3 — the percentage is a friendly summary, and is allowed (§39.1). */
export function MatchScore({ score }: { score: number }) {
  return (
    <span className="match-score tnum" title="How well this piece matches your taste profile">
      {score}% match
    </span>
  )
}
