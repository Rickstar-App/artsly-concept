/**
 * §22.6 — "Land the user on a 'What's next?' screen with THREE FRESH
 * RECOMMENDATIONS, BIASED AWAY FROM THE RETURNED PIECE'S TAGS when the reason
 * was `style`."
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { ARTWORKS, getArtwork, getArtist } from '@/lib/db/catalog'
import { buildFeed } from '@/lib/recommend/feed'
import { reasonChip } from '@/lib/recommend/explain'
import { ArtworkGrid } from '@/components/artwork/ArtworkGrid'
import { STYLE_LABEL, type Style } from '@/lib/taxonomy'

export const metadata: Metadata = { title: 'What’s next?' }

export default async function ReturnedPage({
  searchParams,
}: { searchParams: Promise<{ from?: string; reason?: string }> }) {
  const { from, reason } = await searchParams
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')

  const rental = from ? viewer.state!.rentals.find((r) => r.id === from) : undefined
  const returned = rental ? getArtwork(rental.artwork_id) : undefined

  // §22.6 — bias AWAY from the returned styles when the reason was "style".
  const avoidStyles = reason === 'style' && returned ? new Set(returned.styles) : new Set<string>()
  const candidates = avoidStyles.size > 0
    ? ARTWORKS.filter((a) => !a.styles.some((s) => avoidStyles.has(s)))
    : ARTWORKS

  const feed = buildFeed({
    candidates,
    profile: viewer.profile,
    affinity: viewer.affinity,
    availabilityOf: viewer.availabilityOf,
    excludeIds: viewer.excludeIds,
    limit: 3,
  })

  return (
    <div className="page section-top narrow-wide">
      <p className="eyebrow">On its way back</p>
      <h1 className="page-title">
        {returned ? `“${returned.title}” is heading home.` : 'Thanks — that’s on its way back.'}
      </h1>
      <p className="lede">
        A prepaid return label will arrive by email. Shipping is on us, both ways.
        {avoidStyles.size > 0 ? (
          <>
            {' '}We’ve steered these away from{' '}
            {[...avoidStyles].map((s) => STYLE_LABEL[s as Style].toLowerCase()).join(' and ')}.
          </>
        ) : null}
      </p>

      <section className="section">
        <h2 className="section-title">What’s next?</h2>
        <div style={{ height: 20 }} />
        <ArtworkGrid
          items={feed.items.map((i) => {
            const artist = getArtist(i.artwork.artist_id)
            return {
              artwork: i.artwork,
              artistName: artist?.name ?? '',
              artistSlug: artist?.slug ?? '',
              reason: reasonChip(i.result, viewer.profile),
              saved: viewer.state!.favorites.some((f) => f.artwork_id === i.artwork.id),
              availability: viewer.availabilityOf(i.artwork.id),
            }
          })}
        />
        <div style={{ height: 24 }} />
        <Link href="/discover" className="btn btn-secondary">Explore everything</Link>
      </section>
    </div>
  )
}
