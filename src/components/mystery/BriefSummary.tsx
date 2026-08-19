'use client'

/**
 * §24.3 — "the brief assembling VISIBLY beside it as a growing summary card".
 *
 * §36 — "The Mystery form's live summary card collapses to a sticky one-line
 * price bar" on mobile.
 */
import {
  COLOR_LABEL, MOOD_LABEL, PIECE_TYPE_LABEL, SIZE_LABEL, STYLE_LABEL,
  USER_ROOM_LABEL, BUDGET_LABEL, boldnessLabel,
  type BudgetBand, type Color, type PieceType, type Size, type Style, type UserRoom,
} from '@/lib/taxonomy'

export interface BriefState {
  piece_type?: PieceType
  number_of_pieces: number
  size?: Size | 'custom'
  custom_width_in?: number
  custom_height_in?: number
  colors: string[]
  styles: string[]
  room?: UserRoom
  boldness: number
  budget_band?: BudgetBand
  special_requests?: string
}

export function BriefSummary({ brief, resolvedSize }: { brief: BriefState; resolvedSize?: Size }) {
  const rows: Array<[string, string | null]> = [
    ['Type', brief.piece_type ? PIECE_TYPE_LABEL[brief.piece_type] : null],
    ['How many', brief.number_of_pieces ? `${brief.number_of_pieces} ${brief.number_of_pieces === 1 ? 'piece' : 'pieces'}` : null],
    ['Size', brief.size === 'custom'
      ? (brief.custom_width_in && brief.custom_height_in
          ? `${brief.custom_width_in} × ${brief.custom_height_in} in — priced as ${resolvedSize ? SIZE_LABEL[resolvedSize] : '…'}`
          : 'Custom dimensions')
      : brief.size ? SIZE_LABEL[brief.size] : null],
    ['Colours', brief.colors.length ? brief.colors.map((c) => COLOR_LABEL[c as Color]).join(', ') : null],
    ['Styles', brief.styles.length ? brief.styles.map((s) => STYLE_LABEL[s as Style]).join(', ') : null],
    ['Room', brief.room ? USER_ROOM_LABEL[brief.room] : null],
    ['Boldness', brief.boldness ? `${brief.boldness} of 10 — ${boldnessLabel(brief.boldness)}` : null],
    ['Budget', brief.budget_band ? BUDGET_LABEL[brief.budget_band] : null],
  ]

  const filled = rows.filter(([, v]) => v !== null)

  return (
    <aside className="brief-card" aria-label="Your brief so far">
      <p className="eyebrow">Your brief</p>
      {filled.length === 0 ? (
        <p className="brief-empty">It’ll build up here as you answer.</p>
      ) : (
        <dl className="brief-rows">
          {filled.map(([k, v]) => (
            <div key={k} className="brief-row fade-in">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {brief.special_requests ? (
        <p className="brief-note">“{brief.special_requests}”</p>
      ) : null}
    </aside>
  )
}

void MOOD_LABEL
