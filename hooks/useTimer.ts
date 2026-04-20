'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface UseTimerOptions {
  onTick?: (secondsLeft: number) => void
  onComplete?: () => void
}

export function useTimer(initialSeconds: number, options: UseTimerOptions = {}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const secondsRef = useRef(initialSeconds)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    setRunning(true)
    intervalRef.current = setInterval(() => {
      secondsRef.current -= 1
      setSecondsLeft(secondsRef.current)
      optionsRef.current.onTick?.(secondsRef.current)

      if (secondsRef.current <= 0) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        setRunning(false)
        optionsRef.current.onComplete?.()
      }
    }, 1000)
  }, [])

  const pause = useCallback(() => {
    clear()
    setRunning(false)
  }, [clear])

  const reset = useCallback((seconds?: number) => {
    clear()
    const s = seconds ?? initialSeconds
    secondsRef.current = s
    setSecondsLeft(s)
    setRunning(false)
  }, [clear, initialSeconds])

  const forceComplete = useCallback(() => {
    clear()
    setSecondsLeft(0)
    setRunning(false)
    optionsRef.current.onComplete?.()
  }, [clear])

  useEffect(() => {
    return clear
  }, [clear])

  const progress = 1 - secondsLeft / initialSeconds

  return { secondsLeft, running, progress, start, pause, reset, forceComplete }
}

export function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m > 0) return `${m}:${sec.toString().padStart(2, '0')}`
  return `${sec}`
}
