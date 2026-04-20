'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DrillRecorder, type RecorderState } from '@/lib/media/recorder'

interface UseRecorderReturn {
  state: RecorderState
  stream: MediaStream | null
  audioLevel: number
  blob: Blob | null
  requestPermissions: () => Promise<MediaStream>
  startRecording: () => void
  stopRecording: () => Promise<Blob>
  cleanup: () => void
  error: string | null
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<DrillRecorder | null>(null)

  const getRecorder = useCallback((): DrillRecorder => {
    if (!recorderRef.current) {
      recorderRef.current = new DrillRecorder({
        onStateChange: setState,
        onAudioLevel: setAudioLevel,
        onError: (err) => setError(err.message),
      })
    }
    return recorderRef.current
  }, [])

  const requestPermissions = useCallback(async (): Promise<MediaStream> => {
    setError(null)
    const recorder = getRecorder()
    const s = await recorder.requestPermissions()
    setStream(s)
    return s
  }, [getRecorder])

  const startRecording = useCallback(() => {
    setBlob(null)
    getRecorder().start()
  }, [getRecorder])

  const stopRecording = useCallback(async (): Promise<Blob> => {
    const b = await getRecorder().stop()
    setBlob(b)
    return b
  }, [getRecorder])

  const cleanup = useCallback(() => {
    recorderRef.current?.destroy()
    recorderRef.current = null
    setStream(null)
    setBlob(null)
    setState('idle')
    setAudioLevel(0)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      recorderRef.current?.destroy()
    }
  }, [])

  return { state, stream, audioLevel, blob, requestPermissions, startRecording, stopRecording, cleanup, error }
}
