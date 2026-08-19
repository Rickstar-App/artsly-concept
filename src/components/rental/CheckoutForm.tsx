'use client'

/**
 * CHECKOUT — PRD §17.1, §17.2, §17.3, §20.3.
 *
 * §17.2 order summary:
 *   3-month rental                    $200
 *                               ($67/month)
 *   Shipping, both ways              Included
 *   ─────────────────────────────────────────
 *   Charged today                     $200
 *   Your rental ends March 12, 2027.
 *
 * §17.4 — "NEVER show a shipping line item with a dollar value. Never offer
 * shipping options."
 *
 * §41.3 — "Inline, field-level, on blur and on submit. Name the field, state
 * what's wrong, FOCUS THE FIRST INVALID INPUT, and announce the count to screen
 * readers."
 */

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Artwork } from '@/lib/db/types'
import type { RentalTerm } from '@/lib/taxonomy'
import { SIZE_LABEL } from '@/lib/taxonomy'
import { monthlyEquivalentCents, rentalTotalCents } from '@/lib/pricing/rental'
import { addMonths, daysRemaining, today } from '@/lib/db/state'
import { PriceLadder } from '@/components/artwork/PriceLadder'
import { SwapDisclosure } from './SwapDisclosure'
import { dollars, termLabel } from '@/components/ui/Money'
import { createRental } from '@/lib/actions/rentals'
import { formatDate } from '@/lib/format'
import { NO_CREDIT_COPY } from '@/lib/pricing/config'

const FIELDS = ['contact_name', 'contact_email', 'line1', 'city', 'state', 'zip'] as const

export function CheckoutForm({
  artwork, artistName, initialTerm, defaultName, defaultEmail, swap, available,
}: {
  artwork: Artwork
  artistName: string
  initialTerm: RentalTerm
  defaultName: string
  defaultEmail: string
  swap: { rentalId: string; title: string; endDate: string } | null
  available: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [term, setTerm] = useState<RentalTerm>(initialTerm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const total = rentalTotalCents(artwork, term)
  const monthly = monthlyEquivalentCents(total, term)
  const endDate = useMemo(() => addMonths(today(), term), [term])

  const submit = () => {
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    const payload = Object.fromEntries(fd.entries())

    start(async () => {
      setFormError(null)
      const res = await createRental(artwork.id, { ...payload, term }, swap?.rentalId ?? null)

      if (!res.ok) {
        if (res.fieldErrors) {
          setErrors(res.fieldErrors)
          // §41.3 — focus the FIRST invalid input.
          const first = FIELDS.find((f) => res.fieldErrors![f])
          if (first) form.querySelector<HTMLInputElement>(`[name="${first}"]`)?.focus()
          setFormError(`${Object.keys(res.fieldErrors).length} ${Object.keys(res.fieldErrors).length === 1 ? 'field needs' : 'fields need'} another look.`)
          return
        }
        setFormError(res.error ?? 'Something went wrong.')
        return
      }
      router.push(`/my-space?welcome=${artwork.slug}`)
      router.refresh()
    })
  }

  if (!available) {
    return (
      <div className="checkout-unavailable">
        <h1 className="page-title">This piece was just rented.</h1>
        <p className="lede">
          Every piece here is a single original, so it can only be in one home at a time.
          Nothing was charged.
        </p>
        <Link href="/discover" className="btn btn-primary">Find something else</Link>
      </div>
    )
  }

  return (
    <div className="checkout">
      <div className="checkout-main">
        <h1 className="page-title">{swap ? 'Confirm your swap' : 'Checkout'}</h1>

        {/* §20.3 — REQUIRED disclosure, before anything else on the page. */}
        {swap ? (
          <SwapDisclosure
            outgoingTitle={swap.title}
            outgoingRentalId={swap.rentalId}
            daysLeft={daysRemaining(swap.endDate)}
            endDate={swap.endDate}
            newTotalCents={total}
            onConfirm={submit}
            pending={pending}
          />
        ) : null}

        <form
          ref={formRef}
          className="checkout-form"
          onSubmit={(e) => { e.preventDefault(); submit() }}
          noValidate
        >
          <section className="checkout-step">
            <h2 className="checkout-step-title"><span className="tnum">1</span> Choose a term</h2>
            <PriceLadder ladder={artwork} selected={term} onSelect={setTerm} name="checkout-term" />
          </section>

          <section className="checkout-step">
            <h2 className="checkout-step-title"><span className="tnum">2</span> Where should it go?</h2>
            {/* §17.1 — name and email default from the account but stay editable:
                the delivery recipient may differ from the account holder. */}
            <div className="field-grid">
              <Field name="contact_name" label="Full name" defaultValue={defaultName} error={errors.contact_name} autoComplete="name" />
              <Field name="contact_email" label="Email" type="email" defaultValue={defaultEmail} error={errors.contact_email} autoComplete="email" />
              <Field name="line1" label="Address" error={errors.line1} autoComplete="address-line1" full />
              <Field name="line2" label="Apartment, suite (optional)" error={errors.line2} autoComplete="address-line2" full required={false} />
              <Field name="city" label="City" error={errors.city} autoComplete="address-level2" />
              <Field name="state" label="State" error={errors.state} autoComplete="address-level1" maxLength={2} placeholder="NC" />
              <Field name="zip" label="ZIP" error={errors.zip} autoComplete="postal-code" maxLength={5} inputMode="numeric" placeholder="27701" />
            </div>
          </section>

          <section className="checkout-step">
            <h2 className="checkout-step-title"><span className="tnum">3</span> Confirm</h2>
            <p className="checkout-sim-note">
              This is a demonstration. No card details are collected, and nothing is charged.
            </p>
            {formError ? <p className="error-text" role="alert">{formError}</p> : null}
            {!swap ? (
              <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
                {pending ? 'Confirming…' : `Confirm — ${dollars(total)} for ${termLabel(term)}`}
              </button>
            ) : null}
          </section>
        </form>
      </div>

      {/* §17.2 — the persistent order summary. */}
      <aside className="order-summary" aria-label="Order summary">
        <div className="order-summary-art">
          <Image src={artwork.thumbnail_url} alt="" width={72} height={72} style={{ objectFit: 'contain' }} />
          <div>
            <p className="order-summary-title">{artwork.title}</p>
            <p className="order-summary-artist">{artistName}</p>
            <p className="order-summary-dims tnum">
              {artwork.width_in} × {artwork.height_in} in · {SIZE_LABEL[artwork.size_category]}
            </p>
          </div>
        </div>

        <dl className="order-rows">
          <div>
            <dt>{termLabel(term)} rental</dt>
            <dd className="tnum">{dollars(total)}</dd>
          </div>
          <div className="order-row-sub">
            <dt />
            <dd className="tnum">({dollars(monthly)}/month)</dd>
          </div>
          <div>
            {/* §17.4 — never a dollar value on shipping. */}
            <dt>Shipping, both ways</dt>
            <dd>Included</dd>
          </div>
        </dl>

        <div className="order-total">
          <span>Charged today</span>
          <span className="tnum">{dollars(total)}</span>
        </div>

        <p className="order-note">
          Your rental ends {formatDate(endDate)}.<br />
          We’ll remind you 14 days before.
        </p>
        <p className="order-note order-note-faint">{NO_CREDIT_COPY}</p>
      </aside>
    </div>
  )
}

function Field({
  name, label, error, full, required = true, ...rest
}: {
  name: string
  label: string
  error?: string
  full?: boolean
  required?: boolean
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `f-${name}`
  return (
    <div className={`field-block${full ? ' field-block-full' : ''}`}>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        name={name}
        className="field"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        required={required}
        {...rest}
      />
      {error ? <p id={`${id}-err`} className="error-text">{error}</p> : null}
    </div>
  )
}
