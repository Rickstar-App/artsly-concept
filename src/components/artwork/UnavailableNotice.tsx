/**
 * §14.3 / §21.3 / §41.2 — the unavailable states.
 *
 * §21.3 — "Only the current renter [may buy a rented piece], until the rental
 * ends. Everyone else sees: 'In someone's home until March 12.' … In the
 * meantime, three pieces with a similar feel."
 *
 * §41.2 requires the same shape on a checkout race: "never create the rental and
 * then apologise."
 */
import Link from 'next/link'
import type { ArtworkAvailability } from '@/lib/taxonomy'
import { ArtworkGrid, type GridItem } from './ArtworkGrid'
import { NotifyMeButton } from './NotifyMeButton'

export function UnavailableNotice({
  availability, similar, endDate, heading,
}: {
  availability: ArtworkAvailability
  similar: GridItem[]
  endDate?: string
  heading?: string
}) {
  const sold = availability === 'sold'
  return (
    <section className="panel panel-unavailable">
      <p className="unavailable-title">
        {heading ?? (sold
          ? 'This piece has sold.'
          : endDate
            ? `In someone’s home until ${endDate}.`
            : 'This piece is in someone’s home.')}
      </p>
      <p className="panel-note">
        {sold
          ? 'Every piece here is a single original — once it sells, it’s gone.'
          : 'Every piece here is a single original, so it can only be in one home at a time.'}
      </p>

      {!sold ? <NotifyMeButton /> : null}

      {similar.length > 0 ? (
        <>
          <p className="eyebrow unavailable-rail-label">Three with a similar feel</p>
          <div className="unavailable-rail">
            <ArtworkGrid items={similar} eagerCount={0} />
          </div>
        </>
      ) : (
        <Link href="/discover" className="btn btn-secondary btn-block">Explore the library</Link>
      )}
    </section>
  )
}
