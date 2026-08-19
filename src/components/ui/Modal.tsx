'use client'

/**
 * MODAL — PRD §45.
 *
 * "Modals trap focus, close on Escape, restore focus to the trigger, and use
 *  `aria-modal`."
 *
 * Built on <dialog> so focus trapping and the top layer come from the platform
 * rather than from a hand-rolled loop that will eventually get it wrong.
 */

import { useEffect, useRef } from 'react'

export function Modal({
  open, onClose, title, children, footer, wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      opener.current = document.activeElement
      el.showModal()
    } else if (!open && el.open) {
      el.close()
    }
  }, [open])

  // Restore focus to whatever opened the dialog (§45).
  useEffect(() => {
    if (!open && opener.current instanceof HTMLElement) {
      opener.current.focus()
      opener.current = null
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className={`modal${wide ? ' modal-wide' : ''}`}
      aria-modal="true"
      aria-label={title}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="toast-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </dialog>
  )
}
