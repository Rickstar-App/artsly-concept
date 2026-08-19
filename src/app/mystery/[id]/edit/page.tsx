/**
 * §7.5 — "Changing the brief: allowed anytime; takes effect at the NEXT
 * ROTATION. Price re-quotes and the user must CONFIRM the new monthly amount."
 */
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getViewer } from '@/lib/session'
import { EditBriefForm } from '@/components/mystery/EditBriefForm'

export const metadata: Metadata = { title: 'Edit your brief' }

export default async function EditBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const viewer = await getViewer()
  if (!viewer.signedIn) redirect('/mystery')
  const sub = viewer.state!.subscriptions.find((s) => s.id === id)
  if (!sub) notFound()
  return <div className="page section-top narrow"><EditBriefForm subscription={sub} /></div>
}
