import type { FreezeEpisode, SpeechEvent, TimelineEventView } from '@/types'

const EVENT_LABELS: Record<SpeechEvent['event_type'], string> = {
  false_start: 'False start',
  repeated_start: 'Repeated start',
  hesitation_cluster: 'Hesitation cluster',
  freeze: 'Freeze',
  recovery: 'Recovery',
  bridge_phrase_recovery: 'Bridge recovery',
}

export function mapTimelineEvents(events: SpeechEvent[]): TimelineEventView[] {
  return [...events]
    .sort((a, b) => a.start_ms - b.start_ms)
    .map((event) => ({
      event_type: event.event_type,
      start_ms: event.start_ms,
      end_ms: event.end_ms,
      severity: event.severity,
      label: EVENT_LABELS[event.event_type],
      tone:
        event.event_type === 'recovery' || event.event_type === 'bridge_phrase_recovery'
          ? 'positive'
          : event.event_type === 'hesitation_cluster'
          ? 'warning'
          : 'negative',
      metadata: event.metadata,
    }))
}

export function buildKeyMomentSummary(
  events: SpeechEvent[],
  episodes: FreezeEpisode[]
): string | null {
  if (!events.length) return null

  const topFreeze = [...events]
    .filter((event) => event.event_type === 'freeze')
    .sort((a, b) => b.severity - a.severity)[0]

  if (!topFreeze) return null

  const nearestRecovery = [...events]
    .filter((event) => event.start_ms >= topFreeze.end_ms && (event.event_type === 'recovery' || event.event_type === 'bridge_phrase_recovery'))
    .sort((a, b) => a.start_ms - b.start_ms)[0]

  const matchedEpisode = episodes.find(
    (episode) => Math.abs(episode.start_ms - topFreeze.start_ms) <= 600
  )

  const freezeSec = Math.round(topFreeze.start_ms / 1000)
  const freezeDurationMs = topFreeze.end_ms - topFreeze.start_ms
  const restartAttempts = asNumber(topFreeze.metadata?.restart_attempts)
  const bridgeUsed =
    nearestRecovery?.event_type === 'bridge_phrase_recovery' ||
    Boolean(matchedEpisode?.recovery_phrase_used)

  return `Key moment at ${freezeSec}s: ${formatMs(freezeDurationMs)} freeze${
    restartAttempts ? ` with ${restartAttempts} restart attempt${restartAttempts === 1 ? '' : 's'}` : ''
  }${bridgeUsed ? ', then bridge-phrase recovery.' : nearestRecovery ? ', then verbal recovery.' : '.'}`
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
