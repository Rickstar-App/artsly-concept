'use client'

/**
 * TOAST — PRD §13.4.
 *
 * The visible-learning moment: "You've been loving abstract — added to your
 * taste profile." Both actions are one-click reversible from the toast (§13.4).
 *
 * Toasts are announced politely to screen readers; §45 requires the learning
 * moment to be perceivable without seeing it.
 */

import { useCallback, useEffect, useState } from 'react'

export interface ToastPayload {
  id: string
  title: string
  body?: string
  /** One-click reversal, per §13.4. */
  undo?: { label: string; action: () => void | Promise<void> }
  tone?: 'default' | 'success' | 'warning'
  ttl?: number
}

const EVENT = 'artsly:toast'

export function toast(payload: Omit<ToastPayload, 'id'>) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(EVENT, {
      detail: { ...payload, id: Math.random().toString(36).slice(2) },
    }),
  )
}

export function ToastHost() {
  const [items, setItems] = useState<ToastPayload[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
  }, [])

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastPayload>).detail
      setItems((xs) => [...xs.slice(-2), detail])
      const ttl = detail.ttl ?? 9000
      window.setTimeout(() => dismiss(detail.id), ttl)
    }
    window.addEventListener(EVENT, onToast)
    return () => window.removeEventListener(EVENT, onToast)
  }, [dismiss])

  if (items.length === 0) return null

  return (
    <div className="toast-host" role="region" aria-label="Notifications">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone ?? 'default'}`} role="status" aria-live="polite">
          <div className="toast-copy">
            <p className="toast-title">{t.title}</p>
            {t.body ? <p className="toast-body">{t.body}</p> : null}
          </div>
          <div className="toast-actions">
            {t.undo ? (
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                onClick={async () => { await t.undo!.action(); dismiss(t.id) }}
              >
                {t.undo.label}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
