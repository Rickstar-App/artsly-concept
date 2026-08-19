'use client'

/**
 * THE REVEAL — PRD §26.3, §26.4.
 *
 *   IT'S A SURPRISE.
 *   We've matched your brief with three pieces from three different artists.
 *              [ Reveal my pieces ]
 *
 * "On Reveal: pieces animate in ONE AT A TIME, ~600ms apart, each showing the
 *  artwork, artist, and a one-line reason." (§26.3)
 *
 * §41.6 — "The Mystery reveal is a DELIBERATE ANIMATION, NOT A LOADING STATE.
 *          Do not skeleton it."
 *
 * §45 — "The reveal animation respects prefers-reduced-motion; reveal falls back
 *        to an INSTANT, NON-ANIMATED display."
 */

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Artwork, MysterySubscription } from '@/lib/db/types'
import { revealSubscription } from '@/lib/actions/mystery'
import { COLOR_LABEL, MOOD_LABEL, STYLE_LABEL, joinLabels, USER_ROOM_LABEL, SIZE_LABEL,
  type Color, type Mood, type Style } from '@/lib/taxonomy'

const STAGGER_MS = 600

export interface RevealPiece {
  artwork: Artwork
  artistName: string
  artistSlug: string
  matchScore: number
}

export function RevealSequence({
  subscription, pieces, alreadyRevealed, widened,
}: {
  subscription: MysterySubscription
  pieces: RevealPiece[]
  alreadyRevealed: boolean
  widened: boolean
}) {
  const router = useRouter()
  const [revealed, setRevealed] = useState(alreadyRevealed)
  const [shown, setShown] = useState(alreadyRevealed ? pieces.length : 0)
  const [pending, start] = useTransition()

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (!revealed || shown >= pieces.length) return
    // §45 — reduced motion collapses the sequence to an instant display.
    const delay = reducedMotion ? 0 : STAGGER_MS
    const t = window.setTimeout(() => setShown((n) => n + 1), delay)
    return () => window.clearTimeout(t)
  }, [revealed, shown, pieces.length, reducedMotion])

  const count = pieces.length
  const countWord = ['no', 'one', 'two', 'three', 'four'][count] ?? String(count)

  // §26.4 — the one-line reason, drawn from the brief the user themselves wrote.
  const briefLine = joinLabels([
    ...subscription.colors.map((c) => COLOR_LABEL[c as Color].toLowerCase()),
    ...subscription.styles.map((s) => STYLE_LABEL[s as Style].toLowerCase()),
    SIZE_LABEL[subscription.size].toLowerCase(),
  ])

  // §41.5 — "Mystery matching finds too few pieces: widen size buckets (§26.2);
  // if still short, deliver fewer and SAY SO PLAINLY." Zero is the limit case,
  // and it must never render as an empty reveal with a dead button.
  if (count === 0) {
    return (
      <section className="reveal-gate">
        <p className="eyebrow">Your brief</p>
        <h1 className="reveal-gate-title">Nothing in the library honours that brief.</h1>
        <p className="reveal-gate-copy">
          We won’t send you something that contradicts what you asked for — that’s the
          one rule of Mystery Art. Widening the styles or colours will almost always find
          a match.
        </p>
        <div className="extend-actions" style={{ justifyContent: 'center' }}>
          <Link href={`/mystery/${subscription.id}/edit`} className="btn btn-primary">Widen my brief</Link>
          <Link href="/discover" className="btn btn-secondary">Browse the library instead</Link>
        </div>
      </section>
    )
  }

  if (!revealed) {
    return (
      <section className="reveal-gate">
        <p className="eyebrow">Your first pieces</p>
        <h1 className="reveal-gate-title">It’s a surprise.</h1>
        <p className="reveal-gate-copy">
          We’ve matched your brief with {countWord} {count === 1 ? 'piece' : 'pieces'}
          {count > 1 ? ` from ${countWord} different artists` : ''}.
        </p>

        <button
          type="button"
          className="btn btn-primary reveal-button"
          disabled={pending || count === 0}
          onClick={() =>
            start(async () => {
              const res = await revealSubscription(subscription.id)
              if (res.ok) { setRevealed(true); router.refresh() }
            })
          }
        >
          {pending ? 'Revealing…' : 'Reveal my pieces'}
        </button>

        <p className="reveal-gate-wait">Or wait — they’ll be here when they arrive.</p>
      </section>
    )
  }

  return (
    <section className="reveal">
      {/* "Your cycle 2 two" is not English. Cycle 1 is "your first N"; later
          cycles name the cycle and the count separately. */}
      <p className="eyebrow">
        {subscription.cycle > 1
          ? `Cycle ${subscription.cycle} · ${countWord} ${count === 1 ? 'piece' : 'pieces'}`
          : `Your first ${count === 1 ? 'piece' : countWord}`}
      </p>
      <h1 className="reveal-title">
        {count === 1 ? 'Here it is.' : 'Here they are.'}
      </h1>

      <div className="reveal-grid" style={{ '--n': count } as React.CSSProperties}>
        {pieces.slice(0, shown).map((p, i) => (
          <article
            key={p.artwork.id}
            className={reducedMotion ? 'reveal-card' : 'reveal-card reveal-in'}
            style={{ animationDelay: reducedMotion ? undefined : '0ms' }}
          >
            <Link href={`/artwork/${p.artwork.slug}`} className="reveal-media" aria-label={p.artwork.title}>
              <Image
                src={p.artwork.image_url}
                alt={p.artwork.alt_text}
                fill
                sizes="(max-width: 900px) 90vw, 30vw"
                style={{ objectFit: 'contain', padding: 12 }}
                priority={i === 0}
              />
            </Link>
            <h2 className="reveal-card-title">
              <Link href={`/artwork/${p.artwork.slug}`}>{p.artwork.title}</Link>
            </h2>
            <Link href={`/artist/${p.artistSlug}`} className="reveal-card-artist">{p.artistName}</Link>
            <p className="reveal-card-tags">
              {[
                p.artwork.styles[0] ? STYLE_LABEL[p.artwork.styles[0] as Style] : null,
                p.artwork.moods[0] ? MOOD_LABEL[p.artwork.moods[0] as Mood] : null,
              ].filter(Boolean).join(' · ')}
            </p>
            <p className="reveal-card-colors">
              {p.artwork.colors.map((c) => COLOR_LABEL[c as Color]).join(', ')}
            </p>
          </article>
        ))}
      </div>

      {shown >= count ? (
        <div className="reveal-foot fade-in">
          {/* §24.2 — the surprise is the artwork, NEVER the preferences. Say so. */}
          <p className="reveal-because">
            Because you asked for {briefLine}
            {subscription.room !== 'any' ? ` for your ${USER_ROOM_LABEL[subscription.room].toLowerCase()}` : ''}.
          </p>
          {widened ? (
            <p className="reveal-widened">
              We stretched one size to find the right piece.
            </p>
          ) : null}
          <Link href="/my-space" className="btn btn-primary">See them in My Space</Link>
        </div>
      ) : null}
    </section>
  )
}
