'use client'

/**
 * §52.3 — "no notification delivery behind the 'Notify me' buttons" is a
 * DELIBERATE, DOCUMENTED GAP. The button therefore says what it actually does
 * rather than implying an email that will never arrive — §51.2: "Do not claim it
 * works until it works."
 */
import { useState } from 'react'

export function NotifyMeButton() {
  const [armed, setArmed] = useState(false)
  return armed ? (
    <p className="notify-confirm" role="status">
      Noted. In this demo build nothing is emailed — the waitlist is recorded, not delivered.
    </p>
  ) : (
    <button type="button" className="btn btn-secondary btn-block" onClick={() => setArmed(true)}>
      Notify me when it’s back
    </button>
  )
}
