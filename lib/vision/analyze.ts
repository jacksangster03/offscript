import type { VisualEvent, VisualMetricsSummary, VisionFrameSample } from '@/types'

export interface VisionAnalysisResult {
  metrics: VisualMetricsSummary
  events: VisualEvent[]
}

// Deterministic visual steadiness summary from browser-provided frame samples.
// v1 intentionally avoids hard claims about eye contact accuracy.
export function analyzeVisualSteadiness(
  frames: VisionFrameSample[],
  durationMs: number
): VisionAnalysisResult {
  if (!frames.length) {
    return {
      metrics: {
        face_visible_ratio: 0,
        face_centered_ratio: 0,
        avg_head_yaw: 0,
        head_yaw_std: 0,
        avg_head_pitch: 0,
        looking_away_ms: 0,
        visual_steadiness_score: 1,
      },
      events: [],
    }
  }

  const detected = frames.filter((frame) => frame.face_detected)
  const centered = detected.filter((frame) => frame.centered)
  const yaw = detected.map((frame) => frame.yaw_deg)
  const pitch = detected.map((frame) => frame.pitch_deg)
  const lookingAway = frames.filter((frame) => frame.looking_away)

  const lookingAwayMs = estimateDurationMs(lookingAway.length, frames.length, durationMs)
  const faceVisibleRatio = detected.length / frames.length
  const faceCenteredRatio = centered.length / Math.max(1, detected.length)
  const yawStd = stdDev(yaw)

  const steadinessRaw =
    clamp01(faceCenteredRatio) * 0.35 +
    clamp01(faceVisibleRatio) * 0.25 +
    (1 - clamp01(yawStd / 30)) * 0.2 +
    (1 - clamp01(lookingAwayMs / Math.max(1, durationMs))) * 0.2

  return {
    metrics: {
      face_visible_ratio: round(faceVisibleRatio),
      face_centered_ratio: round(faceCenteredRatio),
      avg_head_yaw: round(mean(yaw)),
      head_yaw_std: round(yawStd),
      avg_head_pitch: round(mean(pitch)),
      looking_away_ms: lookingAwayMs,
      visual_steadiness_score: Math.max(1, Math.min(10, Math.round(steadinessRaw * 9 + 1))),
    },
    events: [],
  }
}

function estimateDurationMs(subsetCount: number, totalCount: number, durationMs: number): number {
  if (totalCount === 0) return 0
  return Math.round((subsetCount / totalCount) * durationMs)
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
