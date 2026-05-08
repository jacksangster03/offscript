import type { VisualEvent, VisionFrameSample } from '@/types'

interface EventOptions {
  minRunMs?: number
}

const DEFAULT_MIN_RUN_MS = 1400

export function deriveVisualEvents(
  samples: VisionFrameSample[],
  durationMs: number,
  options: EventOptions = {}
): VisualEvent[] {
  if (!samples.length) return []
  const minRunMs = options.minRunMs ?? DEFAULT_MIN_RUN_MS
  const sorted = [...samples].sort((a, b) => a.timestamp_ms - b.timestamp_ms)
  const frameMs = estimateFrameMs(sorted, durationMs)
  const minFrames = Math.max(2, Math.round(minRunMs / Math.max(1, frameMs)))

  const events: VisualEvent[] = []

  events.push(...collectRuns(sorted, (s) => !s.face_detected, minFrames, frameMs, 'face_lost', 0.72))
  events.push(...collectRuns(sorted, (s) => s.face_detected && !s.centered, minFrames, frameMs, 'off_center', 0.62))
  events.push(...collectRuns(sorted, (s) => s.looking_away, minFrames, frameMs, 'looking_away', 0.6))

  const highMovement = sorted.map((s) => Math.abs(s.yaw_deg) + Math.abs(s.pitch_deg))
  const movementThreshold = 42
  events.push(
    ...collectRuns(
      sorted,
      (_s, i) => highMovement[i] > movementThreshold,
      Math.max(2, Math.round((minRunMs * 0.8) / Math.max(1, frameMs))),
      frameMs,
      'large_head_movement',
      0.58
    )
  )

  const lowEnergy = sorted.map((s, i) => {
    if (i === 0) return true
    const p = sorted[i - 1]
    const delta = Math.abs(s.yaw_deg - p.yaw_deg) + Math.abs(s.pitch_deg - p.pitch_deg)
    return delta < 2.2
  })
  events.push(
    ...collectRuns(
      sorted,
      (_s, i) => lowEnergy[i],
      Math.max(3, Math.round(2200 / Math.max(1, frameMs))),
      frameMs,
      'low_visual_energy',
      0.5
    )
  )

  return mergeOverlaps(events)
}

function collectRuns(
  samples: VisionFrameSample[],
  predicate: (sample: VisionFrameSample, index: number) => boolean,
  minFrames: number,
  frameMs: number,
  eventType: VisualEvent['event_type'],
  baseSeverity: number
): VisualEvent[] {
  const events: VisualEvent[] = []
  let start = -1
  for (let i = 0; i < samples.length; i++) {
    const hit = predicate(samples[i], i)
    if (hit && start < 0) start = i
    if (!hit && start >= 0) {
      pushIfLongEnough(events, samples, start, i - 1, minFrames, frameMs, eventType, baseSeverity)
      start = -1
    }
  }
  if (start >= 0) {
    pushIfLongEnough(events, samples, start, samples.length - 1, minFrames, frameMs, eventType, baseSeverity)
  }
  return events
}

function pushIfLongEnough(
  events: VisualEvent[],
  samples: VisionFrameSample[],
  startIndex: number,
  endIndex: number,
  minFrames: number,
  frameMs: number,
  eventType: VisualEvent['event_type'],
  baseSeverity: number
) {
  const frames = endIndex - startIndex + 1
  if (frames < minFrames) return
  const startMs = samples[startIndex].timestamp_ms
  const endMs = samples[endIndex].timestamp_ms + Math.round(frameMs)
  const severity = clamp01(baseSeverity + (frames - minFrames) * 0.015)
  events.push({
    event_type: eventType,
    start_ms: startMs,
    end_ms: endMs,
    severity,
    metadata: { frames, duration_ms: Math.max(0, endMs - startMs) },
  })
}

function estimateFrameMs(samples: VisionFrameSample[], durationMs: number): number {
  if (samples.length < 2) return Math.max(180, Math.round(durationMs / Math.max(1, samples.length)))
  const gaps: number[] = []
  for (let i = 1; i < samples.length; i++) {
    const gap = samples[i].timestamp_ms - samples[i - 1].timestamp_ms
    if (gap > 0 && gap < 1500) gaps.push(gap)
  }
  if (!gaps.length) return 200
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
}

function mergeOverlaps(events: VisualEvent[]): VisualEvent[] {
  if (!events.length) return []
  const sorted = [...events].sort((a, b) => a.start_ms - b.start_ms || a.event_type.localeCompare(b.event_type))
  const out: VisualEvent[] = []
  for (const current of sorted) {
    const prev = out[out.length - 1]
    if (
      prev &&
      prev.event_type === current.event_type &&
      current.start_ms <= prev.end_ms + 250
    ) {
      prev.end_ms = Math.max(prev.end_ms, current.end_ms)
      prev.severity = clamp01(Math.max(prev.severity, current.severity))
      continue
    }
    out.push({ ...current })
  }
  return out
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
