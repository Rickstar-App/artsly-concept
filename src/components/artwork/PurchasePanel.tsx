'use client'

/**
 * PRICING PANEL — PRD §15.2, §21.
 *
 * The exact required layout:
 *
 *   RENT                          Total    Per month
 *     1 month … 12 months
 *     Shipping included, both ways.
 *     [ Rent for 3 months — $200 ]
 *   OWN IT
 *     $1,200                       [ Buy ]
 *     Renting doesn't reduce the purchase price.
 *
 * "The selected rung updates the CTA label to INCLUDE THE EXACT AMOUNT CHARGED.
 *  The disclosure about no rent credit is REQUIRED (§7.4) — it prevents the most
 *  likely user misunderstanding, and it prevents the demo from being
 *  contradicted by a sharp audience member."
 */

import { useState } from 'react'
import Link from 'next/link'
import type { Artwork } from '@/lib/db/types'
import type { RentalTerm } from '@/lib/taxonomy'
import { rentalTotalCents } from '@/lib/pricing/rental'
import { PriceLadder } from './PriceLadder'
import { dollars, termLabel } from '@/components/ui/Money'
import { NO_CREDIT_COPY, SHIPPING_COPY } from '@/lib/pricing/config'

export function PurchasePanel({
  artwork, artistName, canRent, activeRentalId, owned, swapFrom, signedIn,
}: {
  artwork: Artwork
  artistName: string
  canRent: boolean
  activeRentalId: string | null
  owned: boolean
  swapFrom: string | null
  signedIn: boolean
}) {
  const [term, setTerm] = useState<RentalTerm>(3)
  const total = rentalTotalCents(artwork, term)

  if (owned) {
    return (
      <section className="panel panel-owned">
        <p className="eyebrow">Owned</p>
        <p className="panel-owned-copy">
          “{artwork.title}” is yours. Nothing to send back, no countdown.
        </p>
        <Link href="/my-space" className="btn btn-secondary btn-block">See it in My Space</Link>
      </section>
    )
  }

  const checkoutHref = `/checkout/${artwork.slug}?term=${term}${swapFrom ? `&swapFrom=${encodeURIComponent(swapFrom)}` : ''}`
  const purchaseHref = `/checkout/${artwork.slug}/purchase`

  return (
    <section className="panel" aria-label="Pricing">
      {canRent ? (
        <>
          <PriceLadder ladder={artwork} selected={term} onSelect={setTerm} name={`term-${artwork.id}`} />

          <p className="panel-note">
            {SHIPPING_COPY}
            <br />
            Return or swap anytime — <Link href="/terms" className="inline-link">see terms</Link>.
          </p>

          {signedIn ? (
            <Link href={checkoutHref} className="btn btn-primary btn-block">
              {swapFrom ? 'Swap for this' : 'Rent'} for {termLabel(term)} — {dollars(total)}
            </Link>
          ) : (
            <Link href="/onboarding" className="btn btn-primary btn-block">
              Sign in to rent — {dollars(total)} for {termLabel(term)}
            </Link>
          )}
        </>
      ) : (
        <div className="panel-current">
          <p className="eyebrow">On your walls</p>
          <p className="panel-note">
            You’re renting this piece. Manage it — extend, swap, return — from My Space.
          </p>
          <Link href="/my-space" className="btn btn-secondary btn-block">Go to My Space</Link>
        </div>
      )}

      <hr className="panel-rule" />

      <div className="panel-own">
        <div>
          <p className="eyebrow">Own it</p>
          <p className="panel-own-price tnum">{dollars(artwork.purchase_price_cents)}</p>
          <p className="panel-own-sub">Yours permanently. {artistName} keeps 70%.</p>
        </div>
        {signedIn ? (
          <Link href={purchaseHref} className="btn btn-secondary">Buy</Link>
        ) : (
          <Link href="/onboarding" className="btn btn-secondary">Buy</Link>
        )}
      </div>

      {/* §7.4 — REQUIRED. Banned copy is asserted against in tests. */}
      <p className="panel-disclosure">{NO_CREDIT_COPY}</p>

      {activeRentalId ? (
        <p className="panel-note panel-note-tight">
          Buying ends your rental — nothing to send back.
        </p>
      ) : null}
    </section>
  )
}
