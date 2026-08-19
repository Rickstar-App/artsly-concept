'use client'

/**
 * §30.2 — "Add artwork: image upload, title, description, artist note, medium,
 * materials, width/height in inches, year, tags from §9, boldness, purchase
 * price. `size_category` DERIVES AUTOMATICALLY; THE LADDER AUTO-FILLS ALL FOUR
 * RENTAL RUNGS, and each rung is editable within the §7.2 validation rule."
 *
 * The ladder preview below is live and uses the same pure module the seed uses,
 * so what an artist sees here is exactly what a collector will be charged.
 *
 * §51.2 — "Do not claim it works until it works." Persisting new artwork would
 * require writing images to a read-only serverless filesystem, so this panel is
 * a working PRICING TOOL and is explicit that publishing is not wired up. It
 * does not pretend to save.
 */

import { useState } from 'react'
import { buildLadder, validateLadder, comparisonPriceDollars, artistRentalEarningsCents, artistSaleEarningsCents } from '@/lib/pricing/rental'
import { sizeCategory, SIZE_LABEL, bandForMonthly, BUDGET_LABEL } from '@/lib/taxonomy'
import { dollars } from '@/components/ui/Money'
import { PriceLadderStatic } from '@/components/artwork/PriceLadder'

export function AddArtworkPanel() {
  const [price, setPrice] = useState(1200)
  const [w, setW] = useState(48)
  const [h, setH] = useState(36)

  const cents = Math.max(0, Math.round(price)) * 100
  const ladder = buildLadder(cents)
  const check = validateLadder(ladder, cents)
  const size = sizeCategory(w || 1, h || 1)
  const comparison = comparisonPriceDollars(ladder)

  return (
    <section className="section add-artwork" id="add-artwork">
      <h2 className="section-title">Add artwork</h2>
      <p className="lede">
        Enter the dimensions and what it costs to own. Everything else is worked out
        for you — the size class, all four rental rungs, and your share.
      </p>

      <div className="add-grid">
        <div className="add-inputs">
          <div className="field-block">
            <label htmlFor="aw" className="label">Width (in)</label>
            <input id="aw" type="number" min={1} max={400} className="field tnum" value={w}
              onChange={(e) => setW(Number(e.target.value))} />
          </div>
          <div className="field-block">
            <label htmlFor="ah" className="label">Height (in)</label>
            <input id="ah" type="number" min={1} max={400} className="field tnum" value={h}
              onChange={(e) => setH(Number(e.target.value))} />
          </div>
          <div className="field-block field-block-full">
            <label htmlFor="ap" className="label">Purchase price ($)</label>
            <input id="ap" type="number" min={50} max={50000} step={10} className="field tnum" value={price}
              onChange={(e) => setPrice(Number(e.target.value))} />
          </div>

          <div className="add-derived">
            <p><span className="eyebrow">Size class</span> <strong>{SIZE_LABEL[size]}</strong> — derived from the longest edge</p>
            <p><span className="eyebrow">Budget band</span> <strong>{BUDGET_LABEL[bandForMonthly(comparison)]}</strong> — where collectors will find it</p>
          </div>
        </div>

        <div className="add-preview">
          <p className="eyebrow">What collectors will see</p>
          <PriceLadderStatic ladder={ladder} />
          <div className="add-share">
            <p>
              A 3-month rental pays you{' '}
              <strong className="tnum">{dollars(artistRentalEarningsCents(ladder.rental_3m_cents))}</strong>.
            </p>
            <p>
              A sale pays you{' '}
              <strong className="tnum">{dollars(artistSaleEarningsCents(cents))}</strong>.
            </p>
          </div>
          {!check.ok ? <p className="error-text">{check.error}</p> : null}
        </div>
      </div>

      <p className="dash-gap">
        Image upload and publishing aren’t wired up in this demo build — this panel is the
        live pricing calculator that would sit beside them.
      </p>
    </section>
  )
}
