import type { Metadata } from 'next'
import { PreferenceQuiz } from '@/components/survey/PreferenceQuiz'
import { getViewer } from '@/lib/session'

export const metadata: Metadata = { title: 'Discover My Art' }

export default async function OnboardingPage() {
  const viewer = await getViewer()
  const p = viewer.state?.preferences
  return (
    <div className="page quiz-page">
      <PreferenceQuiz
        signedIn={viewer.signedIn}
        initial={p ? {
          room: p.room, styles: p.styles, colors: p.colors, moods: p.moods,
          boldness: p.boldness, size_preference: p.size_preference,
          change_frequency: p.change_frequency, budget_band: p.budget_band,
        } : undefined}
      />
    </div>
  )
}
