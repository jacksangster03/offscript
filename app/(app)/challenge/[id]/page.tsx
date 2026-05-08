import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChallengeDayCard } from '@/components/challenges/ChallengeDayCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Challenge Details' }

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-sm text-text-muted">Challenge detail unavailable in demo mode.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!challenge) notFound()

  const { data: days } = await supabase
    .from('challenge_days')
    .select('*')
    .eq('challenge_id', id)
    .order('day_number', { ascending: true })

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-light text-text-primary">{challenge.title}</h1>
        <p className="text-sm text-text-muted mt-0.5">{challenge.total_days} day challenge</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(days ?? []).map((day) => (
          <ChallengeDayCard
            key={day.id}
            challengeId={id}
            dayNumber={day.day_number}
            dueDate={day.due_date}
            status={day.status}
          />
        ))}
      </div>
    </div>
  )
}
