'use client'

/**
 * ARTWORK IMAGE — PRD §35.4, §41.5, §44.
 *
 * §35.4 — "PRESERVE NATIVE ASPECT RATIOS. Never crop artwork to a uniform
 * square — cropping an artist's composition is the one visual sin this product
 * cannot commit."
 *
 * So: `object-fit: contain` on a sunk ground, never `cover`. The cell has a
 * consistent WIDTH with variable height (DESIGN.md §6), which is the choice we
 * hold everywhere.
 *
 * §41.5 — "Image failure: onError swaps to a neutral --surface-sunk block with
 * the title and artist in text. NEVER a broken-image icon, never a collapsed
 * layout."
 */

import Image from 'next/image'
import { useState } from 'react'

export function ArtworkImage({
  src, alt, widthIn, heightIn, blurDataURL, title, artistName, sizes, priority, className,
}: {
  src: string
  alt: string
  widthIn: number
  heightIn: number
  blurDataURL?: string | null
  title: string
  artistName: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  // The wrapper reserves the artwork's true aspect ratio, so nothing shifts
  // when the image arrives and the fallback occupies identical space (§41.6).
  const ratio = `${widthIn} / ${heightIn}`

  if (failed) {
    return (
      <div className={`artwork-fallback ${className ?? ''}`} style={{ aspectRatio: ratio }} role="img" aria-label={alt}>
        <span className="artwork-fallback-title">{title}</span>
        <span className="artwork-fallback-artist">{artistName}</span>
      </div>
    )
  }

  return (
    <div className={`artwork-frame ${className ?? ''}`} style={{ aspectRatio: ratio }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="artwork-img"
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL ?? undefined}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onError={() => setFailed(true)}
      />
    </div>
  )
}
