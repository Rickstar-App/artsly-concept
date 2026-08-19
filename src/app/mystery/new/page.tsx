import type { Metadata } from 'next'
import { getViewer } from '@/lib/session'
import { getArtistBySlug } from '@/lib/db/catalog'
import { MysteryForm } from '@/components/mystery/MysteryForm'
import { PIECE_TYPES, type PieceType } from '@/lib/taxonomy'

export const metadata: Metadata = { title: 'Build your brief' }

export default async function MysteryNewPage({
  searchParams,
}: { searchParams: Promise<{ type?: string; artist?: string }> }) {
  const { type, artist } = await searchParams
  const viewer = await getViewer()

  // §16 / §27.3 — "Request a commission" enters here pre-set to `custom` with
  // that artist pre-selected.
  const presetType = (PIECE_TYPES as readonly string[]).includes(type ?? '') ? (type as PieceType) : undefined
  const presetArtist = artist ? getArtistBySlug(artist) : undefined

  return (
    <div className="page section-top">
      <MysteryForm
        signedIn={viewer.signedIn}
        presetType={presetType}
        presetArtist={presetArtist?.id}
        presetArtistName={presetArtist?.name}
      />
    </div>
  )
}
