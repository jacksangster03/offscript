import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { formatPauseMs } from '@/lib/metrics/compute'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return <DashboardShell firstName="Demo" streakCount={0} recentAttempts={[]} trendData={[]} profile={null} />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Recent sessions with feedback
  const { data: recentAttempts } = await supabase
    .from('attempts')
    .select(`
      id, created_at, duration_sec, transcript,
      sessions!inner(id, mode, started_at, prompts(topic, category, difficulty)),
      metrics(words_per_minute, longest_pause_ms, time_to_first_sentence_ms),
      feedback(freeze_resilience_score, clarity_score, strength_text, priority_fix_text, rescue_phrase)
    `)
    .eq('sessions.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Progress trend (last 10 attempts)
  const { data: trendData } = await supabase
    .from('attempts')
    .select(`
      id, created_at,
      feedback(freeze_resilience_score, clarity_score)
    `)
    .eq('sessions.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const streakCount = profile?.streak_count ?? 0

  const avgFRS = trendData?.length
    ? Math.round(trendData.reduce((sum, a) => {
        const fb = a.feedback as { freeze_resilience_score?: number } | null
        return sum + (fb?.freeze_resilience_score ?? 0)
      }, 0) / trendData.length)
    : null

  return <DashboardShell firstName={firstName} streakCount={streakCount} recentAttempts={recentAttempts ?? []} trendData={trendData ?? []} profile={profile} avgFRS={avgFRS} />
}

function DashboardShell({ firstName, streakCount, recentAttempts, trendData, profile, avgFRS }: {
  firstName: string
  streakCount: number
  recentAttempts: unknown[]
  trendData: unknown[]
  profile: { preferred_mode?: string } | null
  avgFRS?: number | null
}) {
  const recentFeedback = (recentAttempts[0] as { feedback?: { freeze_resilience_score?: number; strength_text?: string; priority_fix_text?: string } } | undefined)?.feedback ?? null

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-light text-text-primary">
            Morning, {firstName}.
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Ready for today&apos;s drill?</p>
        </div>

        <div className="flex items-center gap-3">
          {streakCount > 0 && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-4 py-2">
              <span className="text-warning text-lg">🔥</span>
              <div>
                <p className="text-sm font-semibold text-warning">{streakCount}</p>
                <p className="text-[10px] text-warning/70">day streak</p>
              </div>
            </div>
          )}

          <Link
            href="/drill"
            className="h-11 px-6 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-all hover:shadow-glow-accent inline-flex items-center gap-2 text-sm"
          >
            Start Drill
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Freeze Resilience"
          value={avgFRS != null ? `${avgFRS}/10` : '—'}
          sub="avg last 10"
          accent
        />
        <StatCard
          label="Sessions total"
          value={String(trendData?.length ?? 0)}
          sub="completed"
        />
        <StatCard
          label="Streak"
          value={streakCount > 0 ? `${streakCount} days` : '—'}
          sub="current"
        />
        <StatCard
          label="Mode"
          value={profile?.preferred_mode ?? 'daily'}
          sub="active"
        />
      </div>

      {/* Recent feedback highlight */}
      {recentFeedback && (
        <div className="grid sm:grid-cols-2 gap-4">
          {recentFeedback.strength_text && (
            <Card className="p-5 border-success/15 bg-success/5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-success mb-2">Recent strength</p>
              <p className="text-sm text-text-secondary leading-relaxed">{recentFeedback.strength_text}</p>
            </Card>
          )}
          {recentFeedback.priority_fix_text && (
            <Card className="p-5 border-warning/15 bg-warning/5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-warning mb-2">Last priority fix</p>
              <p className="text-sm text-text-secondary leading-relaxed">{recentFeedback.priority_fix_text}</p>
            </Card>
          )}
        </div>
      )}

      {/* Mode selector */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-3">Drill modes</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <ModeCard
            mode="daily"
            title="Daily Random"
            desc="One random topic. Short prep. One live response."
            active={profile?.preferred_mode === 'daily'}
          />
          <ModeCard
            mode="chaos"
            title="Chaos Mode"
            desc="More unfamiliar, unusual, or slightly unsettling prompts."
            active={profile?.preferred_mode === 'chaos'}
          />
          <ModeCard
            mode="retry"
            title="Retry Mode"
            desc="Same topic reframed with a new angle after feedback."
            active={profile?.preferred_mode === 'retry'}
            comingSoon={false}
          />
        </div>
      </div>

      {/* Recent sessions */}
      {recentAttempts && recentAttempts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Recent sessions</p>
            <Link href="/progress" className="text-xs text-accent hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {(recentAttempts as Array<Record<string, unknown>>).map((attempt) => {
              const session = attempt['sessions'] as { mode?: string; prompts?: { topic?: string; category?: string; difficulty?: number } } | null
              const fb = attempt['feedback'] as { freeze_resilience_score?: number } | null
              const m = attempt['metrics'] as { words_per_minute?: number; longest_pause_ms?: number } | null
              return (
                <Link
                  key={attempt['id'] as string}
                  href={`/results/${attempt['id']}`}
                  className="block"
                >
                  <Card className="p-4 hover:border-border-default transition-all cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {session?.prompts?.topic ?? 'Session'}
                          </p>
                          <Badge variant="outline">{session?.mode ?? 'daily'}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {m?.words_per_minute && (
                            <span className="text-xs text-text-muted">{m.words_per_minute} wpm</span>
                          )}
                          {m?.longest_pause_ms && (
                            <span className="text-xs text-text-muted">
                              longest pause: {formatPauseMs(m.longest_pause_ms)}
                            </span>
                          )}
                          <span className="text-xs text-text-disabled">
                            {new Date(attempt['created_at'] as string).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {fb?.freeze_resilience_score && (
                        <ScoreRing score={fb.freeze_resilience_score} size={48} strokeWidth={4} />
                      )}
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!recentAttempts || recentAttempts.length === 0) && (
        <EmptyState />
      )}
    </div>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <Card className="p-5">
      <p className={`text-2xl font-light tabular ${accent ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
      <p className="text-xs font-medium text-text-secondary mt-1">{label}</p>
      <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>
    </Card>
  )
}

function ModeCard({ mode, title, desc, active, comingSoon }: {
  mode: string; title: string; desc: string; active?: boolean; comingSoon?: boolean
}) {
  return (
    <Link href={comingSoon ? '#' : `/drill?mode=${mode}`}>
      <Card className={`p-5 cursor-pointer transition-all hover:border-border-default ${active ? 'border-accent/30 bg-accent/5' : ''} ${comingSoon ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          {active && <Badge variant="accent">Active</Badge>}
          {comingSoon && <Badge variant="default">Soon</Badge>}
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
      </Card>
    </Link>
  )
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>
      <h3 className="text-base font-medium text-text-primary mb-2">No sessions yet</h3>
      <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
        Your first drill will take about 90 seconds. Start with a random prompt and see where you stand.
      </p>
      <Link
        href="/drill"
        className="inline-flex items-center gap-2 h-10 px-6 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl transition-all"
      >
        Start first drill
      </Link>
    </Card>
  )
}
