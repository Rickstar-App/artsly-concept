/**
 * TASTE PROFILE — PRD §33.4.
 *
 * "v1.0 required 'changing preferences should meaningfully change
 *  recommendations' as an acceptance criterion and NEVER SPECIFIED WHERE A USER
 *  CHANGES PREFERENCES." (§33.4)
 *
 * "Saving invalidates the feed cache and recomputes immediately. THE USER MUST
 *  BE ABLE TO SEE THE FEED CHANGE — that is the acceptance test."
 */
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { TasteProfile } from '@/components/survey/TasteProfile'

export const metadata: Metadata = { title: 'Your taste' }

export default async function TastePage() {
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/onboarding')
  const state = viewer.state!

  return (
    <div className="page section-top narrow">
      <TasteProfile
        preferences={state.preferences}
        affinity={state.affinity.map((a) => ({ tag_type: a.tag_type, tag: a.tag, weight: a.weight }))}
      />
    </div>
  )
}
