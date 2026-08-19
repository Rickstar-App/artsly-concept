'use client'

/**
 * §33.4 — the taste profile, editable inline.
 *
 *   YOUR TASTE
 *   Room            Living room                    [edit]
 *   Styles          Abstract, Contemporary,        [edit]
 *                   + Blue  ← we added this after you saved
 *                     3 blue pieces          [keep] [undo]
 *   ...
 *                             [ Retake the quiz ]
 *
 * §13.4 — auto-added and auto-removed tags are listed WITH THE REASON and a
 * ONE-CLICK UNDO.
 */

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UserPreferences } from '@/lib/db/types'
import {
  BUDGET_LABEL, CHANGE_FREQUENCIES, CHANGE_FREQUENCY_LABEL, COLORS, COLOR_LABEL,
  COLOR_SWATCH, MOODS, MOOD_LABEL, SIZES, SIZE_LABEL, SIZE_RANGE, STYLES,
  STYLE_LABEL, SURVEY_CAPS, USER_ROOMS, USER_ROOM_LABEL, BUDGET_BANDS,
  boldnessLabel, joinLabels,
  type BudgetBand, type ChangeFrequency, type Color, type Mood, type Size, type Style, type UserRoom,
} from '@/lib/taxonomy'
import { savePreferences, undoPreferenceShift } from '@/lib/actions/preferences'
import { MultiSelectChips } from './MultiSelectChips'
import { BoldnessSlider } from './BoldnessSlider'
import { EmptyState } from '@/components/ui/EmptyState'
import { toast } from '@/components/ui/Toast'

type Field = 'room' | 'styles' | 'colors' | 'moods' | 'boldness' | 'size_preference' | 'change_frequency' | 'budget_band'

export function TasteProfile({
  preferences, affinity, announced,
}: {
  preferences: UserPreferences | null
  affinity: Array<{ tag_type: 'style' | 'color' | 'mood'; tag: string; weight: number }>
  /** §13.4 — `${kind}:${tag_type}:${tag}` for every shift the system made. */
  announced: string[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Field | null>(null)
  const [draft, setDraft] = useState<UserPreferences | null>(preferences)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!preferences || !draft) {
    return (
      <>
        <h1 className="page-title">Your taste</h1>
        <div style={{ height: 24 }} />
        <EmptyState
          title="You haven’t taken the quiz yet."
          body="Eight questions, about ninety seconds. It’s what makes the feed yours."
          ctaLabel="Discover My Art"
          ctaHref="/onboarding"
        />
      </>
    )
  }

  const commit = (next: UserPreferences) => {
    start(async () => {
      setError(null)
      const res = await savePreferences({
        room: next.room, styles: next.styles, colors: next.colors, moods: next.moods,
        boldness: next.boldness, size_preference: next.size_preference,
        change_frequency: next.change_frequency, budget_band: next.budget_band,
      })
      if (!res.ok) { setError(res.error ?? 'Couldn’t save that.'); return }
      setEditing(null)
      router.refresh()
    })
  }

  // §13.4 — ONLY tags the system actually moved. `announced` is the authoritative
  // record, written at the moment the threshold was crossed. Recomputing this
  // from affinity weight alone credited the system with every tag the user had
  // picked in the survey, which is wrong on the facts and reads as the product
  // taking credit for the user's own answers.
  const weightOf = new Map(affinity.map((a) => [`${a.tag_type}:${a.tag}`, a.weight]))
  const learned = announced
    .map((key) => {
      const [kind, tag_type, tag] = key.split(':') as ['added' | 'removed', 'style' | 'color' | 'mood', string]
      return { kind, tag_type, tag, weight: weightOf.get(`${tag_type}:${tag}`) ?? 0 }
    })
    .filter((l) => l.tag && (l.kind === 'added' || l.kind === 'removed'))

  return (
    <>
      <div className="section-head">
        <h1 className="page-title">Your taste</h1>
        <Link href="/discover" className="btn btn-ghost btn-compact">See your feed →</Link>
      </div>

      <p className="lede">
        Change anything here and your recommendations update straight away.
      </p>

      {error ? <p className="error-text" role="alert">{error}</p> : null}

      <dl className="taste-list">
        <TasteRow
          label="Room" field="room" editing={editing} onEdit={setEditing}
          value={USER_ROOM_LABEL[draft.room]}
          editor={
            <ChipRow
              options={USER_ROOMS.map((r) => [r, USER_ROOM_LABEL[r]])}
              value={draft.room}
              onPick={(v) => commit({ ...draft, room: v as UserRoom })}
            />
          }
        />

        <TasteRow
          label="Styles" field="styles" editing={editing} onEdit={setEditing}
          value={joinLabels(draft.styles.map((s) => STYLE_LABEL[s as Style]))}
          editor={
            <MultiEditor
              options={STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))}
              selected={draft.styles}
              min={SURVEY_CAPS.styles.min} max={SURVEY_CAPS.styles.max}
              onSave={(v) => commit({ ...draft, styles: v as Style[] })}
              pending={pending}
            />
          }
        />

        <TasteRow
          label="Colours" field="colors" editing={editing} onEdit={setEditing}
          value={joinLabels(draft.colors.map((c) => COLOR_LABEL[c as Color]))}
          editor={
            <MultiEditor
              options={COLORS.map((c) => ({ value: c, label: COLOR_LABEL[c] }))}
              selected={draft.colors}
              min={SURVEY_CAPS.colors.min} max={SURVEY_CAPS.colors.max}
              swatches={COLOR_SWATCH}
              onSave={(v) => commit({ ...draft, colors: v as Color[] })}
              pending={pending}
            />
          }
        />

        <TasteRow
          label="Feeling" field="moods" editing={editing} onEdit={setEditing}
          value={joinLabels(draft.moods.map((m) => MOOD_LABEL[m as Mood]))}
          editor={
            <MultiEditor
              options={MOODS.map((m) => ({ value: m, label: MOOD_LABEL[m] }))}
              selected={draft.moods}
              min={SURVEY_CAPS.moods.min} max={SURVEY_CAPS.moods.max}
              onSave={(v) => commit({ ...draft, moods: v as Mood[] })}
              pending={pending}
            />
          }
        />

        <TasteRow
          label="Boldness" field="boldness" editing={editing} onEdit={setEditing}
          value={`${draft.boldness} of 10 — ${boldnessLabel(draft.boldness)}`}
          editor={
            <div className="taste-editor-stack">
              <BoldnessSlider value={draft.boldness} onChange={(v) => setDraft({ ...draft, boldness: v })} />
              <button type="button" className="btn btn-primary btn-compact" disabled={pending} onClick={() => commit(draft)}>
                Save
              </button>
            </div>
          }
        />

        <TasteRow
          label="Size" field="size_preference" editing={editing} onEdit={setEditing}
          value={`${SIZE_LABEL[draft.size_preference]} (${SIZE_RANGE[draft.size_preference]})`}
          editor={
            <ChipRow
              options={SIZES.map((s) => [s, `${SIZE_LABEL[s]} · ${SIZE_RANGE[s]}`])}
              value={draft.size_preference}
              onPick={(v) => commit({ ...draft, size_preference: v as Size })}
            />
          }
        />

        <TasteRow
          label="Change it" field="change_frequency" editing={editing} onEdit={setEditing}
          value={CHANGE_FREQUENCY_LABEL[draft.change_frequency]}
          editor={
            <ChipRow
              options={CHANGE_FREQUENCIES.map((f) => [f, CHANGE_FREQUENCY_LABEL[f]])}
              value={draft.change_frequency}
              onPick={(v) => commit({ ...draft, change_frequency: v as ChangeFrequency })}
            />
          }
        />

        <TasteRow
          label="Budget" field="budget_band" editing={editing} onEdit={setEditing}
          value={BUDGET_LABEL[draft.budget_band]}
          editor={
            <ChipRow
              options={BUDGET_BANDS.map((b) => [b, BUDGET_LABEL[b]])}
              value={draft.budget_band}
              onPick={(v) => commit({ ...draft, budget_band: v as BudgetBand })}
            />
          }
        />
      </dl>

      {/* §13.4 — what the system learned, with the reason and an undo. */}
      {learned.length > 0 ? (
        <section className="learned">
          <p className="eyebrow">What we picked up</p>
          <ul className="learned-list">
            {learned.map((l) => (
              <li key={`${l.tag_type}:${l.tag}`} className="learned-row">
                <span className="learned-tag">
                  {l.kind === 'added' ? '+ ' : '– '}
                  {labelOf(l.tag_type, l.tag)}
                </span>
                <span className="learned-why">
                  {/* The human LABEL, never the slug — the chip above already
                      gets this right and the sentence must agree with it. */}
                  {l.kind === 'added'
                    ? `we added this after you kept saving ${labelOf(l.tag_type, l.tag).toLowerCase()} pieces`
                    : `we removed this after you kept passing on ${labelOf(l.tag_type, l.tag).toLowerCase()} pieces`}
                </span>
                <span className="learned-actions">
                  <button type="button" className="btn btn-ghost btn-compact" disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await undoPreferenceShift(l.tag_type, l.tag, l.kind)
                        toast({ title: 'Reverted.', tone: 'default' })
                        router.refresh()
                      })
                    }>
                    Undo
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="taste-foot">
        <Link href="/onboarding" className="btn btn-secondary">Retake the quiz</Link>
      </div>
    </>
  )
}

function labelOf(type: 'style' | 'color' | 'mood', tag: string): string {
  if (type === 'style') return STYLE_LABEL[tag as Style] ?? tag
  if (type === 'color') return COLOR_LABEL[tag as Color] ?? tag
  return MOOD_LABEL[tag as Mood] ?? tag
}

function TasteRow({
  label, value, field, editing, onEdit, editor,
}: {
  label: string
  value: string
  field: Field
  editing: Field | null
  onEdit: (f: Field | null) => void
  editor: React.ReactNode
}) {
  const open = editing === field
  return (
    <div className="taste-row">
      <dt className="taste-label">{label}</dt>
      <dd className="taste-value">
        {open ? editor : <span>{value}</span>}
      </dd>
      <button
        type="button"
        className="btn btn-ghost btn-compact taste-edit"
        aria-expanded={open}
        onClick={() => onEdit(open ? null : field)}
      >
        {open ? 'Done' : 'Edit'}
      </button>
    </div>
  )
}

function ChipRow({
  options, value, onPick,
}: { options: Array<[string, string]>; value: string; onPick: (v: string) => void }) {
  return (
    <div className="facet-chips">
      {options.map(([v, label]) => (
        <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => onPick(v)}>
          {value === v ? <span aria-hidden="true">✓</span> : null}{label}
        </button>
      ))}
    </div>
  )
}

function MultiEditor({
  options, selected, min, max, swatches, onSave, pending,
}: {
  options: Array<{ value: string; label: string }>
  selected: string[]
  min: number
  max: number
  swatches?: Record<string, string>
  onSave: (v: string[]) => void
  pending: boolean
}) {
  const [local, setLocal] = useState(selected)
  return (
    <div className="taste-editor-stack">
      <MultiSelectChips name="taste" options={options} selected={local} onChange={setLocal} min={min} max={max} swatches={swatches} />
      <button
        type="button" className="btn btn-primary btn-compact"
        disabled={pending || local.length < min}
        onClick={() => onSave(local)}
      >
        Save
      </button>
    </div>
  )
}
