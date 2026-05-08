import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { CHALLENGE_TEMPLATES } from '@/lib/challenges/templates'
import { ChallengeProgress } from '@/components/challenges/ChallengeProgress'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Challenge' }

export default async function ChallengePage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-light text-text-primary">Challenge</h1>
        <p className="text-sm text-text-muted">Create a challenge from templates to start a daily streak.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: days } = await supabase
    .from('challenge_days')
    .select('*')
    .in('challenge_id', (challenges ?? []).map((c) => c.id))

  const dayMap = new Map<string, { completed: number; total: number }>()
  for (const c of challenges ?? []) dayMap.set(c.id, { completed: 0, total: c.total_days })
  for (const d of days ?? []) {
    const row = dayMap.get(d.challenge_id)
    if (!row) continue
    if (d.status === 'completed') row.completed += 1
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-light text-text-primary">Challenge</h1>
          <p className="text-sm text-text-muted mt-0.5">Structured daily reps to build speaking resilience.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {CHALLENGE_TEMPLATES.map((template) => (
          <form key={template.key} action="/api/challenges" method="post" className="contents">
            <Card className="p-5 space-y-3">
              <p className="text-sm font-medium text-text-primary">{template.title}</p>
              <p className="text-xs text-text-muted">{template.description}</p>
              <p className="text-xs text-text-disabled">{template.total_days} days</p>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white"
                onClick={async () => {
                  await fetch('/api/challenges', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template_key: template.key }),
                  })
                  window.location.reload()
                }}
              >
                Start challenge
              </button>
            </Card>
          </form>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Your challenges</p>
        {(challenges ?? []).map((c) => (
          <Link key={c.id} href={`/challenge/${c.id}`}>
            <ChallengeProgress
              title={c.title}
              totalDays={c.total_days}
              completedDays={dayMap.get(c.id)?.completed ?? 0}
            />
          </Link>
        ))}
        {(!challenges || challenges.length === 0) && (
          <p className="text-xs text-text-muted">No active challenges yet.</p>
        )}
      </div>
    </div>
  )
}
