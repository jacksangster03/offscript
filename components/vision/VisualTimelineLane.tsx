'use client'

import type { VisualEvent } from '@/types'

export function VisualTimelineLane({
  durationMs,
  events,
}: {
  durationMs: number
  events: VisualEvent[]
}) {
  if (!events.length) return null
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-text-muted">Visual steadiness lane</p>
      <div className="relative h-8 rounded-lg border border-border-subtle bg-bg-surface overflow-hidden">
        {events.map((event, index) => {
          const left = pct(event.start_ms, durationMs)
          const width = Math.max(1, pct(event.end_ms - event.start_ms, durationMs))
          const tone = colorFor(event.event_type)
          return (
            <div
              key={`${event.event_type}-${event.start_ms}-${index}`}
              className={`absolute top-1 bottom-1 rounded ${tone}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${labelFor(event.event_type)} ${formatSecond(event.start_ms)}-${formatSecond(event.end_ms)}`}
            />
          )
        })}
      </div>
    </div>
  )
}

function pct(value: number, total: number): number {
  if (total <= 0) return 0
  return (Math.max(0, Math.min(value, total)) / total) * 100
}

function labelFor(type: VisualEvent['event_type']): string {
  const map: Record<VisualEvent['event_type'], string> = {
    face_lost: 'Face lost',
    off_center: 'Off-center',
    looking_away: 'Looking-away proxy',
    large_head_movement: 'Large head movement',
    low_visual_energy: 'Low visual energy',
    gesture_burst: 'Gesture burst',
    hands_not_visible: 'Hands not visible',
    camera_framing_issue: 'Framing issue',
    head_drop: 'Head drop',
    out_of_frame: 'Out of frame',
    excessive_jitter: 'Excessive jitter',
  }
  return map[type]
}

function colorFor(type: VisualEvent['event_type']): string {
  if (type === 'face_lost' || type === 'camera_framing_issue') return 'bg-danger/50 border border-danger/70'
  if (type === 'looking_away' || type === 'off_center') return 'bg-warning/50 border border-warning/70'
  return 'bg-accent/45 border border-accent/70'
}

function formatSecond(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}
