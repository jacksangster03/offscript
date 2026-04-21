import type {
  AttemptFeatureVector,
  CompositeFreezeScores,
  ComputedMetrics,
  VisualMetricsSummary,
} from '@/types'

const DEFAULT_VISUAL: VisualMetricsSummary = {
  face_visible_ratio: 0.75,
  face_centered_ratio: 0.7,
  avg_head_yaw: 0,
  head_yaw_std: 12,
  avg_head_pitch: 0,
  looking_away_ms: 0,
  visual_steadiness_score: 6,
}

export function computeCompositeFreezeScores(
  metrics: ComputedMetrics,
  featureVector: AttemptFeatureVector,
  options?: {
    visual?: VisualMetricsSummary
    aiFreezeResilience?: number
  }
): CompositeFreezeScores {
  const visual = options?.visual ?? DEFAULT_VISUAL
  const aiScore = options?.aiFreezeResilience ?? 6

  const durationMs = Math.max(1, metrics.speech_duration_ms)
  const silenceRatio = metrics.total_silence_ms / durationMs
  const longestPauseNorm = scale01(metrics.longest_pause_ms, 1500, 12000)
  const delayedStartNorm = scale01(metrics.time_to_first_sentence_ms, 1200, 9000)
  const totalSilenceNorm = scale01(silenceRatio, 0.08, 0.6)
  const restartFailureRate = featureVector.restart_count / Math.max(1, featureVector.pause_count_2000ms + featureVector.restart_count)
  const hesitationNorm = scale01(featureVector.filler_clusters + featureVector.repeated_token_count * 0.5, 0, 8)

  // 1 = severe freeze behaviour, 0 = stable.
  const freezeSeverityRaw =
    longestPauseNorm * 0.3 +
    totalSilenceNorm * 0.2 +
    clamp01(restartFailureRate) * 0.2 +
    delayedStartNorm * 0.15 +
    hesitationNorm * 0.15
  const freezeSeverityIndex = toScore10(1 - clamp01(freezeSeverityRaw))

  const restartEfficiencyRaw =
    clamp01(featureVector.bridge_phrase_count / Math.max(1, featureVector.restart_count + 1)) * 0.45 +
    (1 - clamp01(featureVector.pause_count_2000ms / 6)) * 0.35 +
    (featureVector.trailing_off_flag ? 0 : 1) * 0.2
  const restartEfficiencyScore = toScore10(restartEfficiencyRaw)

  const visualSteadinessRaw =
    clamp01(visual.face_centered_ratio) * 0.35 +
    clamp01(visual.face_visible_ratio) * 0.25 +
    (1 - scale01(visual.head_yaw_std, 6, 30)) * 0.2 +
    (1 - scale01(visual.looking_away_ms, 1000, 15000)) * 0.2
  const visualSteadinessScore = toScore10(visualSteadinessRaw)

  const recoveryQualityRaw =
    clamp01(featureVector.pause_count_2000ms > 0 ? metrics.recovery_count / featureVector.pause_count_2000ms : 1) * 0.4 +
    (1 - delayedStartNorm) * 0.25 +
    clamp01(featureVector.bridge_phrase_count / 3) * 0.2 +
    (featureVector.trailing_off_flag ? 0 : 1) * 0.15
  const recoveryQualityScore = toScore10(recoveryQualityRaw)

  const speechTimingComposite = toScore10(1 - clamp01((longestPauseNorm + totalSilenceNorm + delayedStartNorm) / 3))
  const disfluencyComposite = toScore10(
    1 - clamp01((featureVector.restart_count * 0.35 + featureVector.repeated_token_count * 0.2 + featureVector.filler_clusters * 0.45) / 6)
  )

  const freezeResilienceRaw =
    (speechTimingComposite / 10) * 0.45 +
    (disfluencyComposite / 10) * 0.25 +
    (visualSteadinessScore / 10) * 0.15 +
    (clamp01(aiScore / 10)) * 0.15

  return {
    freeze_severity_index: freezeSeverityIndex,
    restart_efficiency_score: restartEfficiencyScore,
    visual_steadiness_score: visualSteadinessScore,
    recovery_quality_score: recoveryQualityScore,
    freeze_resilience_score: toScore10(freezeResilienceRaw),
  }
}

function scale01(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return clamp01((value - min) / (max - min))
}

function toScore10(raw: number): number {
  return Math.max(1, Math.min(10, Math.round(raw * 9 + 1)))
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}
