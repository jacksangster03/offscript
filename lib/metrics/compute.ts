import type { TranscriptWord, ComputedMetrics } from '@/types'

// Common filler words to detect
const FILLERS = [
  'um', 'uh', 'er', 'ah', 'like', 'you know', 'i mean', 'sort of',
  'kind of', 'basically', 'literally', 'actually', 'so', 'right',
  'okay', 'well', 'hmm', 'uhh', 'umm', 'ehh',
]

// Pause threshold: gaps longer than this (ms) count as a meaningful pause
const PAUSE_THRESHOLD_MS = 1500

// Recovery: a pause followed by speech is a recovery moment
const RECOVERY_THRESHOLD_MS = 2000

export function computeMetricsFromWords(
  words: TranscriptWord[],
  durationSec: number
): ComputedMetrics {
  if (!words.length) {
    return emptyMetrics(durationSec)
  }

  const durationMs = durationSec * 1000
  const wordCount = words.length
  const speechDurationMs = durationMs

  // Time to first sentence (first word onset)
  const timeToFirstSentenceMs = Math.round(words[0].start * 1000)

  // Pause analysis: gaps between consecutive words
  let totalSilenceMs = timeToFirstSentenceMs
  let longestPauseMs = timeToFirstSentenceMs
  let recoveryCount = 0

  for (let i = 1; i < words.length; i++) {
    const gapMs = Math.round((words[i].start - words[i - 1].end) * 1000)
    if (gapMs > PAUSE_THRESHOLD_MS) {
      totalSilenceMs += gapMs
      if (gapMs > longestPauseMs) longestPauseMs = gapMs
    }
    if (gapMs > RECOVERY_THRESHOLD_MS) {
      recoveryCount++
    }
  }

  // Add trailing silence
  if (words.length > 0) {
    const trailingSilence = Math.round((durationSec - words[words.length - 1].end) * 1000)
    if (trailingSilence > PAUSE_THRESHOLD_MS) {
      totalSilenceMs += trailingSilence
    }
  }

  // Filler count
  const transcript = words.map(w => w.word.toLowerCase().replace(/[^a-z\s]/g, '')).join(' ')
  let fillerCount = 0
  for (const filler of FILLERS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = transcript.match(regex)
    if (matches) fillerCount += matches.length
  }

  // Words per minute (net of silence)
  const activeSpeechSec = Math.max(1, durationSec - totalSilenceMs / 1000)
  const wordsPerMinute = Math.round((wordCount / activeSpeechSec) * 60)
  const fillerPerMinute = parseFloat((fillerCount / (durationSec / 60)).toFixed(2))

  return {
    filler_count: fillerCount,
    filler_per_minute: fillerPerMinute,
    words_per_minute: wordsPerMinute,
    total_silence_ms: totalSilenceMs,
    longest_pause_ms: longestPauseMs,
    time_to_first_sentence_ms: timeToFirstSentenceMs,
    recovery_count: recoveryCount,
    speech_duration_ms: speechDurationMs,
    word_count: wordCount,
  }
}

// Estimate metrics from plain transcript (no timestamps)
export function computeMetricsFromTranscript(
  transcript: string,
  durationSec: number
): ComputedMetrics {
  const words = transcript.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const durationMs = durationSec * 1000

  // Estimate filler count from plain text
  const lower = transcript.toLowerCase()
  let fillerCount = 0
  for (const filler of FILLERS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi')
    const matches = lower.match(regex)
    if (matches) fillerCount += matches.length
  }

  // Rough estimates when no timestamps are available
  const wordsPerMinute = wordCount > 0 ? Math.round((wordCount / durationSec) * 60) : 0
  const fillerPerMinute = parseFloat((fillerCount / Math.max(1, durationSec / 60)).toFixed(2))

  // Heuristic: assume some silence based on WPM (normal speech 130–150 wpm)
  const expectedSilenceRatio = wordsPerMinute < 80 ? 0.3 : 0.15
  const totalSilenceMs = Math.round(durationMs * expectedSilenceRatio)
  const longestPauseMs = Math.round(totalSilenceMs * 0.4)

  return {
    filler_count: fillerCount,
    filler_per_minute: fillerPerMinute,
    words_per_minute: wordsPerMinute,
    total_silence_ms: totalSilenceMs,
    longest_pause_ms: longestPauseMs,
    time_to_first_sentence_ms: 2500, // conservative estimate
    recovery_count: 0,
    speech_duration_ms: durationMs,
    word_count: wordCount,
  }
}

function emptyMetrics(durationSec: number): ComputedMetrics {
  return {
    filler_count: 0,
    filler_per_minute: 0,
    words_per_minute: 0,
    total_silence_ms: durationSec * 1000,
    longest_pause_ms: durationSec * 1000,
    time_to_first_sentence_ms: durationSec * 1000,
    recovery_count: 0,
    speech_duration_ms: durationSec * 1000,
    word_count: 0,
  }
}

// Compute the Freeze Resilience Score (0–10) from metrics
export function computeFreezeResilienceScore(metrics: ComputedMetrics): number {
  let score = 10

  // Penalise long time to first sentence
  if (metrics.time_to_first_sentence_ms > 8000) score -= 3
  else if (metrics.time_to_first_sentence_ms > 5000) score -= 2
  else if (metrics.time_to_first_sentence_ms > 3000) score -= 1

  // Penalise long pauses
  if (metrics.longest_pause_ms > 10000) score -= 3
  else if (metrics.longest_pause_ms > 6000) score -= 2
  else if (metrics.longest_pause_ms > 3500) score -= 1

  // Penalise high total silence ratio
  const silenceRatio = metrics.total_silence_ms / Math.max(1, metrics.speech_duration_ms)
  if (silenceRatio > 0.5) score -= 2
  else if (silenceRatio > 0.35) score -= 1

  // Reward recoveries
  score += Math.min(2, metrics.recovery_count)

  // Ensure word count reached something meaningful
  if (metrics.word_count < 20) score -= 2
  else if (metrics.word_count < 50) score -= 1

  return Math.max(1, Math.min(10, score))
}

export function formatPauseMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function scoreColour(score: number): string {
  if (score >= 8) return 'text-success'
  if (score >= 6) return 'text-accent'
  if (score >= 4) return 'text-warning'
  return 'text-danger'
}

export function scoreBg(score: number): string {
  if (score >= 8) return 'bg-success/10 border-success/30'
  if (score >= 6) return 'bg-accent/10 border-accent/30'
  if (score >= 4) return 'bg-warning/10 border-warning/30'
  return 'bg-danger/10 border-danger/30'
}
