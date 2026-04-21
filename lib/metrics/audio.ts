export interface AudioWindowFeature {
  start_ms: number
  end_ms: number
  rms: number
  silent: boolean
}

export interface AudioFeatureSummary {
  rms_mean: number
  rms_std: number
  silence_windows: number
  silence_ratio: number
  onset_irregularity: number
  amplitude_collapse_count: number
  windows: AudioWindowFeature[]
}

// Deterministic frame-level audio features from PCM samples.
// This is used by hybrid freeze analysis when raw PCM is available.
export function computeAudioFeaturesFromPcm(
  pcm: Float32Array,
  sampleRate: number,
  options?: { frameMs?: number; silenceRmsThreshold?: number }
): AudioFeatureSummary {
  const frameMs = options?.frameMs ?? 50
  const silenceThreshold = options?.silenceRmsThreshold ?? 0.015
  const frameSize = Math.max(1, Math.round((sampleRate * frameMs) / 1000))
  const windows: AudioWindowFeature[] = []
  const rmsValues: number[] = []
  const onsets: number[] = []

  let amplitudeCollapseCount = 0
  let previousRms = 0

  for (let offset = 0; offset < pcm.length; offset += frameSize) {
    const end = Math.min(pcm.length, offset + frameSize)
    let sumSq = 0
    for (let i = offset; i < end; i++) {
      sumSq += pcm[i] * pcm[i]
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - offset))
    const silent = rms < silenceThreshold

    if (previousRms > 0.05 && rms < previousRms * 0.35) {
      amplitudeCollapseCount++
    }
    if (previousRms < silenceThreshold && rms >= silenceThreshold) {
      onsets.push(offset / sampleRate)
    }
    previousRms = rms

    windows.push({
      start_ms: Math.round((offset / sampleRate) * 1000),
      end_ms: Math.round((end / sampleRate) * 1000),
      rms,
      silent,
    })
    rmsValues.push(rms)
  }

  const silenceWindows = windows.filter((window) => window.silent).length
  const onsetIrregularity = computeIntervalStdDev(onsets)

  return {
    rms_mean: mean(rmsValues),
    rms_std: stdDev(rmsValues),
    silence_windows: silenceWindows,
    silence_ratio: silenceWindows / Math.max(1, windows.length),
    onset_irregularity: onsetIrregularity,
    amplitude_collapse_count: amplitudeCollapseCount,
    windows,
  }
}

function computeIntervalStdDev(values: number[]): number {
  if (values.length < 3) return 0
  const intervals: number[] = []
  for (let i = 1; i < values.length; i++) {
    intervals.push(values[i] - values[i - 1])
  }
  return stdDev(intervals)
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
