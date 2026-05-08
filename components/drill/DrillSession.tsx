'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { Prompt, DrillPhase } from '@/types'
import { useTimer } from '@/hooks/useTimer'
import { useRecorder } from '@/hooks/useRecorder'
import { useVisualTelemetry } from '@/hooks/useVisualTelemetry'
import { CircularTimer } from './CircularTimer'
import { MicWaveform } from './MicWaveform'
import { WebcamPreview } from './WebcamPreview'
import { PromptCard } from './PromptCard'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { isVisualTelemetryEnabled } from '@/lib/vision/flags'

const PREP_SECONDS = 20
const SPEAK_SECONDS = 60

interface DrillSessionProps {
  sessionId: string
  prompt: Prompt
  attemptNumber?: number
  retryMode?: boolean
}

export function DrillSession({ sessionId, prompt, attemptNumber = 1, retryMode }: DrillSessionProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<DrillPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [rescueCue, setRescueCue] = useState<string | null>(null)

  const recorder = useRecorder()
  const visualEnabled = isVisualTelemetryEnabled()
  const visualTelemetry = useVisualTelemetry({
    stream: recorder.stream,
    active: phase === 'speaking',
    enabled: visualEnabled,
  })

  const prepTimer = useTimer(PREP_SECONDS, {
    onComplete: () => beginSpeaking(),
  })

  const speakTimer = useTimer(SPEAK_SECONDS, {
    onComplete: () => endSpeaking(),
    onTick: (s) => {
      // Trigger rescue cue at 20s remaining if user might be struggling
      if (s === 20 && recorder.audioLevel < 0.05) {
        showRescueCue()
      }
    },
  })

  const showRescueCue = () => {
    const phrases = [
      '"Let me approach this from another angle…"',
      '"The key tension here is…"',
      '"One way to think about this is…"',
      '"What matters most is…"',
    ]
    setRescueCue(phrases[Math.floor(Math.random() * phrases.length)])
    setTimeout(() => setRescueCue(null), 4000)
  }

  const init = useCallback(async () => {
    setPhase('loading')
    setError(null)
    try {
      await recorder.requestPermissions()
      setPhase('prep')
      prepTimer.reset(PREP_SECONDS)
    } catch {
      setError('Camera and microphone access is required. Please allow permissions and refresh.')
      setPhase('error')
    }
  }, [recorder, prepTimer])

  const beginSpeaking = useCallback(() => {
    setPhase('speaking')
    speakTimer.reset(SPEAK_SECONDS)
    recorder.startRecording()
    speakTimer.start()
  }, [recorder, speakTimer])

  const endSpeaking = useCallback(async () => {
    if (phase !== 'speaking') return
    setPhase('uploading')

    try {
      const blob = await recorder.stopRecording()
      await uploadAndAnalyse(blob)
    } catch (err) {
      console.error(err)
      setError('Recording failed. Please retry.')
      setPhase('error')
    }
  }, [phase, recorder])

  const uploadAndAnalyse = async (blob: Blob) => {
    setPhase('analysing')

    const form = new FormData()
    form.append('audio', blob, `attempt-${Date.now()}.webm`)
    form.append('sessionId', sessionId)
    form.append('promptId', prompt.id)
    if (prompt.topic_id) form.append('topicId', prompt.topic_id)
    if (prompt.topic_prompt_id) form.append('topicPromptId', prompt.topic_prompt_id)
    form.append('sourceMode', prompt.topic_prompt_id ? 'curiosity_topic' : 'legacy_prompt')
    form.append('attemptNumber', String(attemptNumber))
    form.append('durationSec', String(SPEAK_SECONDS))
    const telemetry = visualTelemetry.getTelemetry()
    if (telemetry && visualTelemetry.captureEnabled) {
      form.append('visualTelemetry', JSON.stringify(telemetry))
    }

    const res = await fetch('/api/attempts', { method: 'POST', body: form })
    if (!res.ok) throw new Error('Analysis failed')

    const { attemptId } = await res.json()
    router.push(`/results/${attemptId}`)
  }

  // Auto-start prep timer once in prep phase
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === 'prep') {
      prepTimer.start()
    }
  }, [phase]) // intentionally only re-run when phase changes

  // Cleanup on unmount
  useEffect(() => {
    return () => recorder.cleanup()
  }, [])

  if (phase === 'idle' || phase === 'loading') {
    return <DrillIntro prompt={prompt} retryMode={retryMode} onStart={init} loading={phase === 'loading'} />
  }

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-danger text-sm">{error}</p>
        <Button variant="secondary" onClick={() => setPhase('idle')}>Go back</Button>
      </div>
    )
  }

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Rescue cue overlay */}
      <AnimatePresence>
        {rescueCue && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-bg-overlay border border-accent/30 rounded-xl px-5 py-3 shadow-glow-accent"
          >
            <p className="text-sm text-accent font-medium text-center">
              Bridge phrase: {rescueCue}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {(phase === 'prep' || phase === 'speaking') && (
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
          >
            {/* Left: Timer + prompt info */}
            <div className="flex flex-col items-center gap-6">
              <CircularTimer
                secondsLeft={phase === 'prep' ? prepTimer.secondsLeft : speakTimer.secondsLeft}
                totalSeconds={phase === 'prep' ? PREP_SECONDS : SPEAK_SECONDS}
                phase={phase}
                running={phase === 'prep' ? prepTimer.running : speakTimer.running}
                className="mt-2"
              />

              {/* Phase label */}
              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1"
                  >
                    <p className="text-lg font-semibold text-text-primary">
                      {phase === 'prep' ? 'Prepare your response' : 'Speak now'}
                    </p>
                    <p className="text-sm text-text-muted">
                      {phase === 'prep'
                        ? 'Read the context. Plan your opening sentence.'
                        : 'Keep going. Structure matters more than perfection.'}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Mic waveform during speaking */}
              {phase === 'speaking' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <MicWaveform level={recorder.audioLevel} active={true} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={endSpeaking}
                    className="text-text-muted hover:text-text-secondary"
                  >
                    End early
                  </Button>
                </motion.div>
              )}

              {/* Skip prep */}
              {phase === 'prep' && (
                <Button variant="ghost" size="sm" onClick={beginSpeaking} className="text-text-muted">
                  Skip prep
                </Button>
              )}
            </div>

            {/* Right: Webcam + prompt */}
            <div className="flex flex-col gap-4">
              <WebcamPreview
                stream={recorder.stream}
                recording={phase === 'speaking'}
                centerCue={visualTelemetry.captureEnabled && visualTelemetry.offCenterTooLong}
                className="aspect-[4/3] w-full"
              />
              <PromptCard prompt={prompt} showRetryAngle={retryMode} compact />
            </div>
          </motion.div>
        )}

        {(phase === 'uploading' || phase === 'analysing') && (
          <motion.div
            key="analysing"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 py-20"
          >
            <AnalysingState phase={phase} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DrillIntro({
  prompt,
  retryMode,
  onStart,
  loading,
}: {
  prompt: Prompt
  retryMode?: boolean
  onStart: () => void
  loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-8 max-w-2xl mx-auto"
    >
      {retryMode && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl px-4 py-2.5 text-sm text-accent font-medium">
          Retry: same topic, different angle
        </div>
      )}

      <PromptCard prompt={prompt} showRetryAngle={retryMode} />

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-muted max-w-xs">
          You will have <strong className="text-text-secondary">20 seconds</strong> to prepare,
          then <strong className="text-text-secondary">60 seconds</strong> to speak.
        </p>
        <p className="text-xs text-text-muted">Camera and microphone required.</p>

        <Button size="xl" onClick={onStart} loading={loading} className="mt-2 min-w-[200px]">
          {loading ? 'Requesting access…' : retryMode ? 'Start Retry' : 'Start Drill'}
        </Button>
      </div>
    </motion.div>
  )
}

function AnalysingState({ phase }: { phase: DrillPhase }) {
  const labels = {
    uploading: { title: 'Uploading recording…', sub: 'Hang tight.' },
    analysing: { title: 'Analysing your response…', sub: 'Transcribing audio and computing metrics.' },
  } as const

  const { title, sub } = labels[phase as 'uploading' | 'analysing'] ?? labels.analysing

  return (
    <>
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-full border-2 border-accent/20"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border-t-2 border-accent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse-soft" />
        </div>
      </div>
      <div className="text-center">
        <p className="font-medium text-text-primary">{title}</p>
        <p className="text-sm text-text-muted mt-1">{sub}</p>
      </div>
    </>
  )
}
