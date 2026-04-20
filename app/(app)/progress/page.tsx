import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProgressCharts } from '@/components/dashboard/ProgressCharts'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Progress' }

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: attempts } = await supabase
    .from('attempts')
    .select(`
      id, created_at, duration_sec,
      sessions!inner(user_id, mode, prompts(topic, category, difficulty)),
      metrics(*),
      feedback(*)
    `)
    .eq('sessions.user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, display_name')
    .eq('id', user.id)
    .single()

  const dataPoints = (attempts ?? []).map(a => {
    const fb = a.feedback as { freeze_resilience_score?: number; clarity_score?: number; structure_score?: number; composure_score?: number } | null
    const m = a.metrics as { words_per_minute?: number; time_to_first_sentence_ms?: number; longest_pause_ms?: number; filler_per_minute?: number } | null
    return {
      date: new Date(a.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      freeze_resilience_score: fb?.freeze_resilience_score ?? 0,
      clarity_score: fb?.clarity_score ?? 0,
      structure_score: fb?.structure_score ?? 0,
      composure_score: fb?.composure_score ?? 0,
      words_per_minute: m?.words_per_minute ?? 0,
      time_to_first_sentence_ms: m?.time_to_first_sentence_ms ?? 0,
      longest_pause_ms: m?.longest_pause_ms ?? 0,
      filler_per_minute: m?.filler_per_minute ?? 0,
      attempt_id: a.id,
    }
  })

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-light text-text-primary">Progress</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {dataPoints.length} sessions recorded
          {profile?.streak_count ? ` · ${profile.streak_count}-day streak` : ''}
        </p>
      </div>

      {dataPoints.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-text-muted text-sm">Complete your first drill to see progress.</p>
        </div>
      ) : (
        <ProgressCharts data={dataPoints} />
      )}
    </div>
  )
}
