import type {
  AttemptFeatureVector,
  FreezeEpisode,
  HybridAnalysisResult,
  SpeechEvent,
  TranscriptWord,
} from '@/types'

const FILLER_TOKENS = new Set([
  'um', 'uh', 'er', 'ah', 'like', 'basically', 'literally', 'actually', 'right',
  'okay', 'well', 'hmm', 'uhh', 'umm', 'ehh',
])

const BRIDGE_PHRASES = [
  'one way to think about it is',
  'one way to think about this is',
  'let me approach this from another angle',
  'the key issue here is',
  'the key tension here is',
  'what matters most is',
  'another way to see it is',
]

const SHORT_PAUSE_MS = 500
const FREEZE_PAUSE_MS = 2000
const HESITATION_PAUSE_MS = 300
const HESITATION_WINDOW_MS = 3500

interface TokenWord extends TranscriptWord {
  token: string
}

export function detectSpeechDisfluencyEvents(
  words: TranscriptWord[],
  transcript: string,
  durationSec: number
): HybridAnalysisResult {
  const tokenWords = words
    .map((word) => ({ ...word, token: normalizeToken(word.word) }))
    .filter((word) => word.token.length > 0)

  if (!tokenWords.length) {
    return {
      speech_events: [],
      freeze_episodes: [],
      feature_vector: emptyFeatureVector(durationSec),
    }
  }

  const events: SpeechEvent[] = []
  const freezeEpisodes: FreezeEpisode[] = []

  const pauses: number[] = []
  const pause500: number[] = []
  const pause2000: number[] = []
  const bursts: number[] = []

  let repeatedTokenCount = 0
  let repeatedBigramCount = 0
  let restartCount = 0
  let fillerClusters = 0
  let bridgePhraseCount = 0

  // Speech bursts between long pauses.
  let burstStartMs = Math.round(tokenWords[0].start * 1000)
  let hesitationSignals = 0
  let windowStartMs = burstStartMs

  for (let i = 1; i < tokenWords.length; i++) {
    const prev = tokenWords[i - 1]
    const current = tokenWords[i]
    const gapMs = Math.max(0, Math.round((current.start - prev.end) * 1000))
    pauses.push(gapMs)

    if (gapMs >= SHORT_PAUSE_MS) pause500.push(gapMs)
    if (gapMs >= FREEZE_PAUSE_MS) pause2000.push(gapMs)

    if (gapMs >= FREEZE_PAUSE_MS) {
      const freezeStartMs = Math.round(prev.end * 1000)
      const freezeEndMs = Math.round(current.start * 1000)
      const resumedText = collectWindowText(tokenWords, i, 8)
      const usedBridge = hasBridgePhrase(resumedText)
      if (usedBridge) {
        bridgePhraseCount++
      }

      const restartAttempts = countRestartSignals(tokenWords, i)
      const severity = clamp01((gapMs - FREEZE_PAUSE_MS) / 5000 + restartAttempts * 0.15)

      events.push({
        event_type: 'freeze',
        start_ms: freezeStartMs,
        end_ms: freezeEndMs,
        severity,
        metadata: {
          gap_ms: gapMs,
          restart_attempts: restartAttempts,
          bridge_phrase_used: usedBridge,
        },
      })

      events.push({
        event_type: usedBridge ? 'bridge_phrase_recovery' : 'recovery',
        start_ms: freezeEndMs,
        end_ms: Math.round(Math.max(current.end, current.start) * 1000),
        severity: usedBridge ? 0.25 : 0.45,
        metadata: { after_gap_ms: gapMs },
      })

      freezeEpisodes.push({
        start_ms: freezeStartMs,
        end_ms: freezeEndMs,
        recovered: true,
        speech_signals: {
          gap_ms: gapMs,
          restart_attempts: restartAttempts,
          hesitation_signals_before_freeze: hesitationSignals,
        },
        visual_signals: {},
        recovery_phrase_used: usedBridge,
      })

      bursts.push(Math.max(0, freezeStartMs - burstStartMs))
      burstStartMs = freezeEndMs
      hesitationSignals = 0
      windowStartMs = freezeEndMs
    }

    if (gapMs >= HESITATION_PAUSE_MS && gapMs < FREEZE_PAUSE_MS) {
      hesitationSignals++
    }

    // Repeated token ("I think ... I think").
    if (current.token === prev.token && gapMs <= 1800) {
      repeatedTokenCount++
      events.push({
        event_type: 'repeated_start',
        start_ms: Math.round(prev.start * 1000),
        end_ms: Math.round(current.end * 1000),
        severity: clamp01(0.35 + gapMs / 3000),
        metadata: { token: current.token, gap_ms: gapMs },
      })
    }

    // Repeated bigram in nearby window.
    if (i >= 2) {
      const currentBigram = `${tokenWords[i - 1].token} ${current.token}`
      const priorBigram = `${tokenWords[i - 2].token} ${tokenWords[i - 1].token}`
      if (currentBigram === priorBigram && gapMs <= 2200) {
        repeatedBigramCount++
      }
    }

    // False starts: short burst then reset with another opening token.
    if (isFalseStart(tokenWords, i)) {
      restartCount++
      const startMs = Math.round(tokenWords[Math.max(0, i - 3)].start * 1000)
      const endMs = Math.round(current.end * 1000)
      events.push({
        event_type: 'false_start',
        start_ms: startMs,
        end_ms: endMs,
        severity: 0.5,
        metadata: { token: current.token },
      })
    }

    // Hesitation clusters accumulate several nearby hesitation signals.
    if (Math.round(current.end * 1000) - windowStartMs > HESITATION_WINDOW_MS) {
      if (hesitationSignals >= 3) {
        fillerClusters++
        events.push({
          event_type: 'hesitation_cluster',
          start_ms: windowStartMs,
          end_ms: Math.round(current.end * 1000),
          severity: clamp01(0.3 + hesitationSignals * 0.1),
          metadata: { hesitation_signals: hesitationSignals },
        })
      }
      windowStartMs = Math.round(current.end * 1000)
      hesitationSignals = 0
    }

    if (FILLER_TOKENS.has(current.token)) {
      hesitationSignals++
    }
  }

  // trailing burst
  const lastEndMs = Math.round(tokenWords[tokenWords.length - 1].end * 1000)
  bursts.push(Math.max(0, lastEndMs - burstStartMs))

  // trailing freeze (ended without recovery)
  const durationMs = durationSec * 1000
  const trailingGapMs = Math.max(0, durationMs - lastEndMs)
  if (trailingGapMs >= FREEZE_PAUSE_MS) {
    const severity = clamp01((trailingGapMs - FREEZE_PAUSE_MS) / 5000 + 0.25)
    events.push({
      event_type: 'freeze',
      start_ms: lastEndMs,
      end_ms: durationMs,
      severity,
      metadata: { gap_ms: trailingGapMs, recovered: false },
    })
    freezeEpisodes.push({
      start_ms: lastEndMs,
      end_ms: durationMs,
      recovered: false,
      speech_signals: { gap_ms: trailingGapMs },
      visual_signals: {},
      recovery_phrase_used: false,
    })
  }

  bridgePhraseCount += countBridgePhrases(transcript)

  const featureVector: AttemptFeatureVector = {
    start_latency_ms: Math.round(tokenWords[0].start * 1000),
    pause_count_500ms: pause500.length,
    pause_count_2000ms: pause2000.length + freezeEpisodes.filter((f) => !f.recovered).length,
    longest_pause_ms: pauses.length > 0 ? Math.max(...pauses, trailingGapMs) : trailingGapMs,
    total_silence_ms: pause500.reduce((sum, p) => sum + p, 0) + (trailingGapMs >= SHORT_PAUSE_MS ? trailingGapMs : 0),
    word_count: tokenWords.length,
    filler_count: tokenWords.filter((w) => FILLER_TOKENS.has(w.token)).length,
    filler_clusters: fillerClusters,
    repeated_token_count: repeatedTokenCount,
    repeated_bigram_count: repeatedBigramCount,
    restart_count: restartCount,
    bridge_phrase_count: bridgePhraseCount,
    speech_burst_mean_ms: bursts.length ? Math.round(mean(bursts)) : 0,
    speech_burst_std_ms: bursts.length > 1 ? Math.round(stdDev(bursts)) : 0,
    trailing_off_flag: trailingGapMs >= FREEZE_PAUSE_MS,
  }

  return {
    speech_events: sortEvents(events),
    freeze_episodes: freezeEpisodes.sort((a, b) => a.start_ms - b.start_ms),
    feature_vector: featureVector,
  }
}

function emptyFeatureVector(durationSec: number): AttemptFeatureVector {
  const durationMs = durationSec * 1000
  return {
    start_latency_ms: durationMs,
    pause_count_500ms: 0,
    pause_count_2000ms: 0,
    longest_pause_ms: durationMs,
    total_silence_ms: durationMs,
    word_count: 0,
    filler_count: 0,
    filler_clusters: 0,
    repeated_token_count: 0,
    repeated_bigram_count: 0,
    restart_count: 0,
    bridge_phrase_count: 0,
    speech_burst_mean_ms: 0,
    speech_burst_std_ms: 0,
    trailing_off_flag: true,
  }
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z']/g, '')
}

function isFalseStart(words: TokenWord[], index: number): boolean {
  if (index < 3) return false
  const a = words[index - 3]
  const b = words[index - 2]
  const c = words[index - 1]
  const d = words[index]

  const burstDurationMs = Math.round((c.end - a.start) * 1000)
  const resetGapMs = Math.round((d.start - c.end) * 1000)
  const restartsQuickly = resetGapMs >= 400 && resetGapMs <= 2500
  const changedOpening = d.token !== a.token && d.token !== b.token

  return burstDurationMs <= 2600 && restartsQuickly && changedOpening
}

function countRestartSignals(words: TokenWord[], resumeIndex: number): number {
  const windowStart = Math.max(0, resumeIndex - 6)
  const slice = words.slice(windowStart, resumeIndex + 1)
  let restarts = 0
  for (let i = 1; i < slice.length; i++) {
    if (slice[i].token === slice[i - 1].token) {
      restarts++
    }
  }
  return restarts
}

function collectWindowText(words: TokenWord[], startIndex: number, size: number): string {
  return words
    .slice(startIndex, startIndex + size)
    .map((word) => word.token)
    .join(' ')
}

function hasBridgePhrase(text: string): boolean {
  return BRIDGE_PHRASES.some((phrase) => text.includes(phrase))
}

function countBridgePhrases(transcript: string): number {
  const lower = transcript.toLowerCase()
  return BRIDGE_PHRASES.reduce((count, phrase) => {
    return count + (lower.includes(phrase) ? 1 : 0)
  }, 0)
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function stdDev(values: number[]): number {
  const avg = mean(values)
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function sortEvents(events: SpeechEvent[]): SpeechEvent[] {
  return [...events].sort((a, b) => {
    if (a.start_ms !== b.start_ms) return a.start_ms - b.start_ms
    return a.end_ms - b.end_ms
  })
}
