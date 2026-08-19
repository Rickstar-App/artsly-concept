/**
 * §27.3 — the commission outcome.
 *
 *   MAYA CHEN IS ON IT.
 *   She'll create a large abstract piece in blue and neutral tones for your living room.
 *   Expect your first look in 3–4 weeks.
 *
 * §27.3 also notes the honest boundary: "The MVP does not simulate delivery of
 * commissioned work beyond this state."
 */
import Link from 'next/link'
import Image from 'next/image'
import type { Artist, MysterySubscription } from '@/lib/db/types'
import { COLOR_LABEL, SIZE_LABEL, STYLE_LABEL, USER_ROOM_LABEL, joinLabels,
  type Color, type Style } from '@/lib/taxonomy'

export function CommissionState({ artist, subscription }: { artist: Artist; subscription: MysterySubscription }) {
  const styles = joinLabels(subscription.styles.map((s) => STYLE_LABEL[s as Style].toLowerCase()))
  const colors = joinLabels(subscription.colors.map((c) => COLOR_LABEL[c as Color].toLowerCase()))
  const size = SIZE_LABEL[subscription.size].toLowerCase()

  return (
    <section className="commission">
      {artist.profile_image_url ? (
        <Image src={artist.profile_image_url} alt="" width={96} height={96} className="artist-avatar artist-avatar-lg" />
      ) : null}
      <h1 className="commission-title">{artist.name} is on it.</h1>
      <p className="commission-brief">
        A {size} {styles} piece in {colors} tones
        {subscription.room !== 'any' ? ` for your ${USER_ROOM_LABEL[subscription.room].toLowerCase()}` : ''}.
      </p>
      <p className="commission-eta">
        Expect your first look in 3–4 weeks. We’ll email you when there’s something to see.
      </p>
      <p className="commission-caveat">
        This is a demo build — commissioned work isn’t simulated beyond this point.
      </p>
      <div className="extend-actions">
        <Link href="/my-space" className="btn btn-primary">See it in My Space</Link>
        <Link href={`/artist/${artist.slug}`} className="btn btn-secondary">View {artist.name.split(' ')[0]}’s work</Link>
      </div>
    </section>
  )
}
