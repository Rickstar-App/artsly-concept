'use client'

/** PURCHASE — PRD §21.2. */

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Artwork, ShippingAddress } from '@/lib/db/types'
import { SIZE_LABEL } from '@/lib/taxonomy'
import { dollars } from '@/components/ui/Money'
import { purchaseArtwork } from '@/lib/actions/rentals'
import { NO_CREDIT_COPY_LONG } from '@/lib/pricing/config'
import { formatDate } from '@/lib/format'
import { artistSaleEarningsCents } from '@/lib/pricing/rental'

export function PurchaseForm({
  artwork, artistName, activeRental, blocked, blockedReason, defaultName, defaultEmail,
}: {
  artwork: Artwork
  artistName: string
  activeRental: { id: string; endDate: string; address: ShippingAddress } | null
  blocked: boolean
  blockedReason: 'sold' | 'rented'
  defaultName: string
  defaultEmail: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (blocked) {
    return (
      <section className="purchase">
        <p className="eyebrow">Own it</p>
        <h1 className="page-title">
          {blockedReason === 'sold' ? 'This piece has sold.' : 'This piece is in someone’s home.'}
        </h1>
        <p className="lede">
          {blockedReason === 'sold'
            ? 'Every piece here is a single original — once it sells, it’s gone.'
            : 'While a piece is out on loan, only the person living with it can buy it. That’s how we keep a single-original marketplace honest.'}
        </p>
        <Link href="/discover" className="btn btn-primary">Find something else</Link>
      </section>
    )
  }

  const a = activeRental?.address

  return (
    <section className="purchase">
      <p className="eyebrow">Own it</p>

      <div className="purchase-art">
        <Image src={artwork.thumbnail_url} alt="" width={96} height={96} style={{ objectFit: 'contain' }} />
        <div>
          <h1 className="purchase-title">{artwork.title}</h1>
          <p className="purchase-artist">{artistName}</p>
          <p className="purchase-dims tnum">
            {artwork.width_in} × {artwork.height_in} in · {SIZE_LABEL[artwork.size_category]}, {artwork.medium.toLowerCase()}
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          start(async () => {
            setError(null)
            const res = await purchaseArtwork(artwork.id, Object.fromEntries(fd.entries()))
            if (!res.ok) { setError(res.error ?? 'Something went wrong.'); return }
            router.push('/my-space?owned=' + artwork.slug)
            router.refresh()
          })
        }}
      >
        {!activeRental ? (
          <div className="field-grid purchase-address">
            <Field name="contact_name" label="Full name" defaultValue={defaultName} autoComplete="name" />
            <Field name="contact_email" label="Email" type="email" defaultValue={defaultEmail} autoComplete="email" />
            <Field name="line1" label="Address" autoComplete="address-line1" full />
            <Field name="line2" label="Apartment, suite (optional)" autoComplete="address-line2" full required={false} />
            <Field name="city" label="City" autoComplete="address-level2" />
            <Field name="state" label="State" autoComplete="address-level1" maxLength={2} placeholder="NC" />
            <Field name="zip" label="ZIP" autoComplete="postal-code" maxLength={5} inputMode="numeric" placeholder="27701" />
          </div>
        ) : (
          <>
            <input type="hidden" name="line1" value={a?.line1 ?? ''} />
            <input type="hidden" name="line2" value={a?.line2 ?? ''} />
            <input type="hidden" name="city" value={a?.city ?? ''} />
            <input type="hidden" name="state" value={a?.state ?? ''} />
            <input type="hidden" name="zip" value={a?.zip ?? ''} />
            <p className="purchase-kept">
              It’s already on your wall — nothing ships, nothing goes back.
            </p>
          </>
        )}

        <dl className="order-rows purchase-rows">
          <div><dt>Purchase price</dt><dd className="tnum">{dollars(artwork.purchase_price_cents)}</dd></div>
          <div><dt>Shipping</dt><dd>Included</dd></div>
        </dl>
        <div className="order-total">
          <span>Total</span>
          <span className="tnum">{dollars(artwork.purchase_price_cents)}</span>
        </div>

        {activeRental ? (
          <p className="purchase-note">
            Your rental ends when you buy — it was due back {formatDate(activeRental.endDate)}.
          </p>
        ) : null}

        {/* §7.4 — required. Banned copy is asserted against by a test. */}
        <p className="panel-disclosure">{NO_CREDIT_COPY_LONG}</p>

        <p className="purchase-artist-share tnum">
          {artistName} receives {dollars(artistSaleEarningsCents(artwork.purchase_price_cents))} of this sale.
        </p>

        {error ? <p className="error-text" role="alert">{error}</p> : null}

        <div className="extend-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Confirming…' : 'Confirm purchase'}
          </button>
          <Link href={`/artwork/${artwork.slug}`} className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </section>
  )
}

function Field({
  name, label, full, required = true, ...rest
}: { name: string; label: string; full?: boolean; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `p-${name}`
  return (
    <div className={`field-block${full ? ' field-block-full' : ''}`}>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} name={name} className="field" required={required} {...rest} />
    </div>
  )
}
