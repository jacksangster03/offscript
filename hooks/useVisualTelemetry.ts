'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { VisionFrameSample, VisualTelemetryPayload } from '@/types'

const SAMPLE_INTERVAL_MS = 200 // 5 FPS
const MAX_SAMPLES = 360
const MAX_DETECTOR_FAILURES = 8
const OFF_CENTER_ALERT_MS = 2500
const MEDIAPIPE_VERSION = '0.10.34'

interface UseVisualTelemetryArgs {
  stream: MediaStream | null
  active: boolean
  enabled: boolean
}

interface UseVisualTelemetryReturn {
  offCenterTooLong: boolean
  captureEnabled: boolean
  getTelemetry: () => VisualTelemetryPayload | null
}

interface FaceLandmarkerLike {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => {
    faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>>
  }
  close?: () => void
}

export function useVisualTelemetry({
  stream,
  active,
  enabled,
}: UseVisualTelemetryArgs): UseVisualTelemetryReturn {
  const [offCenterTooLong, setOffCenterTooLong] = useState(false)
  const [captureEnabled, setCaptureEnabled] = useState(enabled)
  const samplesRef = useRef<VisionFrameSample[]>([])
  const startedAtRef = useRef<number>(0)
  const intervalRef = useRef<number | null>(null)
  const landmarkerRef = useRef<FaceLandmarkerLike | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorFailuresRef = useRef(0)
  const offCenterAccumulatedMsRef = useRef(0)

  const stopSampling = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const cleanup = useCallback(() => {
    stopSampling()
    if (landmarkerRef.current?.close) {
      landmarkerRef.current.close()
    }
    landmarkerRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    videoRef.current = null
  }, [stopSampling])

  useEffect(() => {
    setCaptureEnabled(enabled)
  }, [enabled])

  useEffect(() => {
    if (!active) {
      stopSampling()
      setOffCenterTooLong(false)
      offCenterAccumulatedMsRef.current = 0
      return
    }
    if (!enabled || !stream) {
      return
    }

    let cancelled = false

    async function setup() {
      try {
        const [{ FaceLandmarker, FilesetResolver }] = await Promise.all([
          import('@mediapipe/tasks-vision'),
        ])
        if (cancelled) return

        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`
        )
        if (cancelled) return

        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (cancelled) {
          landmarker.close()
          return
        }
        landmarkerRef.current = landmarker as FaceLandmarkerLike

        const video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        video.autoplay = true
        video.srcObject = stream
        await video.play()
        if (cancelled) return
        videoRef.current = video

        startedAtRef.current = performance.now()
        samplesRef.current = []
        detectorFailuresRef.current = 0
        offCenterAccumulatedMsRef.current = 0
        setOffCenterTooLong(false)

        intervalRef.current = window.setInterval(() => {
          const activeLandmarker = landmarkerRef.current
          const activeVideo = videoRef.current
          if (!activeLandmarker || !activeVideo || activeVideo.readyState < 2) return

          try {
            const nowMs = performance.now()
            const elapsedMs = Math.max(0, Math.round(nowMs - startedAtRef.current))
            const detection = activeLandmarker.detectForVideo(activeVideo, nowMs)
            const landmarks = detection.faceLandmarks?.[0]
            const sample = buildSample(elapsedMs, landmarks)
            samplesRef.current.push(sample)

            if (samplesRef.current.length > MAX_SAMPLES) {
              samplesRef.current.shift()
            }

            if (!sample.centered || !sample.face_detected) {
              offCenterAccumulatedMsRef.current += SAMPLE_INTERVAL_MS
              setOffCenterTooLong(offCenterAccumulatedMsRef.current >= OFF_CENTER_ALERT_MS)
            } else {
              offCenterAccumulatedMsRef.current = 0
              setOffCenterTooLong(false)
            }
          } catch {
            detectorFailuresRef.current += 1
            if (detectorFailuresRef.current >= MAX_DETECTOR_FAILURES) {
              setCaptureEnabled(false)
              cleanup()
            }
          }
        }, SAMPLE_INTERVAL_MS)
      } catch {
        setCaptureEnabled(false)
      }
    }

    setup()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [active, cleanup, enabled, stopSampling, stream])

  const getTelemetry = useCallback((): VisualTelemetryPayload | null => {
    if (!samplesRef.current.length) return null
    return {
      samples: [...samplesRef.current],
      duration_ms: samplesRef.current[samplesRef.current.length - 1].timestamp_ms,
      sample_rate_hz: Math.round(1000 / SAMPLE_INTERVAL_MS),
    }
  }, [])

  return {
    offCenterTooLong,
    captureEnabled,
    getTelemetry,
  }
}

function buildSample(
  timestampMs: number,
  landmarks?: Array<{ x: number; y: number; z: number }>
): VisionFrameSample {
  if (!landmarks?.length) {
    return {
      timestamp_ms: timestampMs,
      face_detected: false,
      centered: false,
      yaw_deg: 0,
      pitch_deg: 0,
      looking_away: true,
    }
  }

  const nose = landmarks[1]
  const leftEye = landmarks[33]
  const rightEye = landmarks[263]
  const chin = landmarks[152]

  const eyeMidX = (leftEye.x + rightEye.x) / 2
  const eyeMidY = (leftEye.y + rightEye.y) / 2
  const eyeDistance = Math.max(0.0001, Math.abs(rightEye.x - leftEye.x))
  const chinDistance = Math.max(0.0001, Math.abs(chin.y - eyeMidY))

  const yawDeg = clamp(((nose.x - eyeMidX) / (eyeDistance / 2)) * 22, -45, 45)
  const pitchDeg = clamp((((nose.y - eyeMidY) / chinDistance) - 0.5) * 36, -35, 35)

  const centered = nose.x > 0.35 && nose.x < 0.65 && nose.y > 0.28 && nose.y < 0.72
  const lookingAway = Math.abs(yawDeg) > 20 || Math.abs(pitchDeg) > 18

  return {
    timestamp_ms: timestampMs,
    face_detected: true,
    centered,
    yaw_deg: round(yawDeg),
    pitch_deg: round(pitchDeg),
    looking_away: lookingAway,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
