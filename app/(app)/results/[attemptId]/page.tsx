import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FeedbackPanel } from '@/components/results/FeedbackPanel'
import { TranscriptView } from '@/components/results/TranscriptView'
import { AttemptTimeline } from '@/components/results/AttemptTimeline'
import { PromptCard } from '@/components/drill/PromptCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { buildKeyMomentSummary, mapTimelineEvents } from '@/lib/results/timeline'
import type { FreezeEpisode, SpeechEvent } from '@/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Results' }

interface Props {
  params: Promise<{ attemptId: string }>
}

export default async function ResultsPage({ params }: Props) {
  const { attemptId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: attempt } = await supabase
    .from('attempts')
    .select(`
      *,
      sessions!inner(*, user_id, prompts(*)),
      metrics(*),
      feedback(*),
      curiosity_feedback(*),
      speech_events(*),
      freeze_episodes(*),
      visual_metrics(*)
    `)
    .eq('id', attemptId)
    .single()

  if (!attempt) notFound()

  const session = attempt.sessions as { user_id: string; id: string; mode: string; prompts: Record<string, unknown> }
  if (session.user_id !== user.id) redirect('/dashboard')

  const prompt = session.prompts
  const metrics = attempt.metrics
  const feedback = attempt.feedback
  const speechEvents = (attempt.speech_events ?? []) as SpeechEvent[]
  const freezeEpisodes = (attempt.freeze_episodes ?? []) as FreezeEpisode[]
  const durationSec = Number(attempt.duration_sec ?? 60)
  const timelineEvents = mapTimelineEvents(speechEvents)
  const keyMoment = buildKeyMomentSummary(speechEvents, freezeEpisodes)
  const isMock = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-mock')

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1 mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <h1 className="text-2xl font-light text-text-primary">Your results</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Attempt {attempt.attempt_number} ·{' '}
            {new Date(attempt.created_at).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short'
            })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/drill?retry=${session.id}&mode=retry`}
            className="h-9 px-4 bg-bg-elevated hover:bg-bg-overlay text-text-primary text-sm font-medium rounded-xl border border-border-default hover:border-border-strong transition-all inline-flex items-center gap-2"
          >
            Retry prompt
          </Link>
          <Link
            href="/drill"
            className="h-9 px-4 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl transition-all inline-flex items-center gap-2"
          >
            New drill
          </Link>
        </div>
      </div>

      {/* Prompt recap */}
      {prompt && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">Prompt</p>
          <PromptCard prompt={prompt as unknown as Parameters<typeof PromptCard>[0]['prompt']} compact />
        </div>
      )}

      {/* Feedback */}
      {timelineEvents.length > 0 && (
        <AttemptTimeline
          durationSec={durationSec}
          events={timelineEvents}
          episodes={freezeEpisodes}
        />
      )}

      {keyMoment && (
        <Card className="p-5 border-accent/20 bg-accent/5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-accent mb-2">Key moment</p>
          <p className="text-sm text-text-primary">{keyMoment}</p>
        </Card>
      )}

      {feedback && metrics && (
        <FeedbackPanel
          feedback={feedback as Parameters<typeof FeedbackPanel>[0]['feedback']}
          metrics={metrics as Parameters<typeof FeedbackPanel>[0]['metrics']}
          mock={isMock}
        />
      )}

      {/* Transcript */}
      {attempt.transcript && (
        <TranscriptView transcript={attempt.transcript} mock={isMock} />
      )}

      {/* Bottom CTA */}
      <div className="pt-4 flex items-center justify-center gap-4">
        <Link
          href={`/drill?retry=${session.id}&mode=retry`}
          className="inline-flex items-center gap-2 h-11 px-6 bg-bg-elevated border border-border-default hover:border-border-strong text-text-primary text-sm font-medium rounded-xl transition-all"
        >
          Retry with new angle
        </Link>
        <Link
          href="/drill"
          className="inline-flex items-center gap-2 h-11 px-6 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl transition-all hover:shadow-glow-accent"
        >
          Next drill
        </Link>
      </div>
    </div>
  )
}
