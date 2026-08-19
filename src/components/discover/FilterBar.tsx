'use client'

/**
 * FILTER BAR — PRD §29.
 *
 * §29.2 — "Filters are AND across facets, OR within a facet. Filter state lives
 * in the URL query string so views are shareable and the back button behaves.
 * Show the active count and a Clear all. Show the result count live."
 *
 * §36 — "Filter bar becomes a bottom sheet" below 768px.
 */

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  BUDGET_BANDS, BUDGET_LABEL, COLORS, COLOR_LABEL, ROOMS, ROOM_LABEL,
  SIZES, SIZE_LABEL, SIZE_RANGE, STYLES, STYLE_LABEL,
} from '@/lib/taxonomy'

const FACETS = ['styles', 'colors', 'rooms', 'sizes', 'budgets', 'mediums', 'artists'] as const
type Facet = (typeof FACETS)[number]

export function FilterBar({
  total, artists, mediums,
}: {
  total: number
  artists: Array<{ id: string; name: string }>
  mediums: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(params.get('query') ?? '')

  const selected = useCallback(
    (facet: Facet): string[] => (params.get(facet)?.split(',').filter(Boolean) ?? []),
    [params],
  )

  const activeCount = FACETS.reduce((n, f) => n + selected(f).length, 0) + (params.get('query') ? 1 : 0)

  const push = useCallback((next: URLSearchParams) => {
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }))
  }, [router, pathname])

  const toggle = (facet: Facet, value: string) => {
    const next = new URLSearchParams(params.toString())
    const cur = selected(facet)
    const after = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    if (after.length) next.set(facet, after.join(','))
    else next.delete(facet)
    push(next)
  }

  const clearAll = () => {
    const next = new URLSearchParams()
    const tab = params.get('tab')
    const swap = params.get('swapFrom')
    if (tab) next.set('tab', tab)
    if (swap) next.set('swapFrom', swap)
    setQuery('')
    push(next)
  }

  // §29.1 — debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const current = params.get('query') ?? ''
    if (query === current) return
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (query.trim()) next.set('query', query.trim())
      else next.delete('query')
      push(next)
    }, 280)
    return () => window.clearTimeout(t)
  }, [query, params, push])

  return (
    <div className="filter-bar">
      <div className="filter-bar-top">
        <div className="search-field">
          <SearchGlyph />
          <input
            type="search"
            className="field search-input"
            placeholder="Search by title, artist, medium, or feeling"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search artwork"
          />
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-compact filter-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          Filters
          {activeCount > 0 ? <span className="filter-count tnum">{activeCount}</span> : null}
        </button>

        <p className="result-count tnum" aria-live="polite">{total} pieces</p>

        {activeCount > 0 ? (
          <button type="button" className="btn btn-ghost btn-compact" onClick={clearAll}>Clear all</button>
        ) : null}
      </div>

      <div className={`filter-panel${open ? ' is-open' : ''}`} hidden={!open}>
        <Facet label="Style" items={STYLES.map((s) => [s, STYLE_LABEL[s]])} selected={selected('styles')} onToggle={(v) => toggle('styles', v)} />
        <Facet label="Colour" items={COLORS.map((c) => [c, COLOR_LABEL[c]])} selected={selected('colors')} onToggle={(v) => toggle('colors', v)} />
        <Facet label="Room" items={ROOMS.map((r) => [r, ROOM_LABEL[r]])} selected={selected('rooms')} onToggle={(v) => toggle('rooms', v)} />
        <Facet label="Size" items={SIZES.map((s) => [s, `${SIZE_LABEL[s]} · ${SIZE_RANGE[s]}`])} selected={selected('sizes')} onToggle={(v) => toggle('sizes', v)} />
        <Facet label="Price" items={BUDGET_BANDS.map((b) => [b, BUDGET_LABEL[b]])} selected={selected('budgets')} onToggle={(v) => toggle('budgets', v)} />
        <Facet label="Medium" items={mediums.map((m) => [m, m])} selected={selected('mediums')} onToggle={(v) => toggle('mediums', v)} />
        <Facet label="Artist" items={artists.map((a) => [a.id, a.name])} selected={selected('artists')} onToggle={(v) => toggle('artists', v)} />

        <div className="filter-panel-foot">
          <button type="button" className="btn btn-primary btn-compact" onClick={() => setOpen(false)}>
            Show {total} pieces
          </button>
        </div>
      </div>
    </div>
  )
}

function Facet({
  label, items, selected, onToggle,
}: {
  label: string
  items: Array<[string, string]>
  selected: string[]
  onToggle: (v: string) => void
}) {
  return (
    <fieldset className="facet">
      <legend className="eyebrow">{label}</legend>
      <div className="facet-chips">
        {items.map(([value, text]) => {
          const on = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => onToggle(value)}
            >
              {/* §45 — never colour alone; the selected state carries a glyph. */}
              {on ? <span aria-hidden="true">✓</span> : null}
              {text}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function SearchGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="search-glyph">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
