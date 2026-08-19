/** §41.6 — skeletons match the real layout's dimensions, so nothing shifts. */
import { ArtworkGridSkeleton } from '@/components/ui/Skeleton'
import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="page section-top">
      <Skeleton h={36} w={220} />
      <div style={{ height: 24 }} />
      <Skeleton h={44} />
      <div style={{ height: 40 }} />
      <ArtworkGridSkeleton count={8} />
    </div>
  )
}
