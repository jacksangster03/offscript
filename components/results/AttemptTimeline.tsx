'use client'

import { Card } from '@/components/ui/Card'
import type { FreezeEpisode, TimelineEventView } from '@/types'

interface AttemptTimelineProps {
  durationSec: number
  events: TimelineEventView[]
  episodes: FreezeEpisode[]
}

export function AttemptTimeline({ durationSec, events, episodes }: AttemptTimelineProps) {
  const durationMs = Math.max(1, durationSec * 1000)

  return (
    <Card className="p-5 space-y-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Freeze timeline</p>
        <p className="text-xs text-text-muted mt-1">Moments where flow destabilized and where recovery happened.</p>
      </div>

      <div className="relative h-14 rounded-xl border border-border-subtle bg-bg-elevated overflow-hidden">
        {episodes.map((episode, index) => {
          const left = pct(episode.start_ms, durationMs)
          const width = Math.max(1.5, pct(episode.end_ms - episode.start_ms, durationMs))
          return (
            <div
              key={`${episode.start_ms}-${episode.end_ms}-${index}`}
              className="absolute top-0 bottom-0 bg-danger/10 border-x border-danger/30"
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`Freeze episode ${formatSecond(episode.start_ms)}-${formatSecond(episode.end_ms)}${episode.recovered ? ' (recovered)' : ' (not recovered)'}`}
            />
          )
        })}

        {events.map((event, index) => {
          const left = pct(event.start_ms, durationMs)
          const color =
            event.tone === 'positive'
              ? 'bg-success border-success/60'
              : event.tone === 'warning'
              ? 'bg-warning border-warning/60'
              : 'bg-danger border-danger/70'
          return (
            <div
              key={`${event.event_type}-${event.start_ms}-${index}`}
              className={`absolute top-2 bottom-2 w-1.5 rounded-full border ${color}`}
              style={{ left: `calc(${left}% - 3px)` }}
              title={describeEvent(event)}
            />
          )
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-disabled">
        <span>0s</span>
        <span>{durationSec}s</span>
      </div>
    </Card>
  )
}

function pct(value: number, total: number): number {
  return (Math.max(0, Math.min(value, total)) / total) * 100
}

function formatSecond(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

function describeEvent(event: TimelineEventView): string {
  const gapMs = asNumber(event.metadata?.gap_ms)
  const restarts = asNumber(event.metadata?.restart_attempts)
  const parts = [`${event.label} at ${formatSecond(event.start_ms)}`]
  if (gapMs > 0) parts.push(`gap ${formatSecond(gapMs)}`)
  if (restarts > 0) parts.push(`${restarts} restart attempt${restarts === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

function asNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
