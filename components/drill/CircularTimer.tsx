'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatSeconds } from '@/hooks/useTimer'
import { cn } from '@/components/ui/cn'

interface CircularTimerProps {
  secondsLeft: number
  totalSeconds: number
  phase: 'prep' | 'speaking'
  running: boolean
  className?: string
}

const SIZE = 280
const STROKE = 8
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

export function CircularTimer({ secondsLeft, totalSeconds, phase, running, className }: CircularTimerProps) {
  const progress = secondsLeft / totalSeconds
  const offset = CIRC * (1 - progress)
  const isCritical = secondsLeft <= 10 && secondsLeft > 0

  const trackColour = 'rgba(255,255,255,0.04)'
  const progressColour = phase === 'prep'
    ? (isCritical ? '#f59e0b' : '#6366f1')
    : (isCritical ? '#ef4444' : '#10b981')

  const glowColour = phase === 'prep'
    ? (isCritical ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.25)')
    : (isCritical ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)')

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        animate={{ opacity: running && isCritical ? [0.4, 0.8, 0.4] : 0.2 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        style={{ background: glowColour }}
      />

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative z-10"
      >
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={trackColour}
          strokeWidth={STROKE}
        />

        {/* Subtle inner ring */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS - 16}
          fill="none"
          stroke="rgba(255,255,255,0.025)"
          strokeWidth={1}
        />

        {/* Progress arc */}
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={progressColour}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'linear' }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            filter: `drop-shadow(0 0 8px ${progressColour})`,
          }}
        />

        {/* Pulse dot at progress tip */}
        {running && (
          <AnimatePresence>
            <motion.circle
              key="dot"
              cx={SIZE / 2}
              cy={STROKE / 2}
              r={STROKE / 1.5}
              fill={progressColour}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [1, 1.3, 1] }}
              transition={{ scale: { repeat: Infinity, duration: 1.2 } }}
              style={{
                transformBox: 'fill-box',
                transform: `rotate(${(1 - progress) * 360 - 90}deg)`,
                transformOrigin: `${SIZE / 2}px ${SIZE / 2}px`,
              }}
            />
          </AnimatePresence>
        )}
      </svg>

      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className={cn(
            'font-mono font-light tabular tracking-tight select-none',
            isCritical && running ? 'text-warning' : phase === 'speaking' ? 'text-success' : 'text-text-primary',
          )}
          style={{ fontSize: secondsLeft >= 10 ? '4rem' : '4.5rem', lineHeight: 1 }}
          animate={isCritical && running ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        >
          {formatSeconds(secondsLeft)}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs font-medium text-text-muted uppercase tracking-widest mt-3"
          >
            {phase === 'prep' ? 'prepare' : 'speaking'}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
