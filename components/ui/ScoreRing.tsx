'use client'

import { motion } from 'framer-motion'
import { cn } from './cn'

interface ScoreRingProps {
  score: number // 1–10
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  className?: string
  animate?: boolean
}

function scoreToColour(score: number): string {
  if (score >= 8) return '#10b981'   // green
  if (score >= 6) return '#6366f1'   // indigo
  if (score >= 4) return '#f59e0b'   // amber
  return '#ef4444'                    // red
}

export function ScoreRing({
  score,
  size = 80,
  strokeWidth = 6,
  label,
  sublabel,
  className,
  animate = true,
}: ScoreRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = score / 10
  const offset = circ * (1 - pct)
  const colour = scoreToColour(score)

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={animate ? { strokeDashoffset: circ } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
        {/* Score text */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill={colour}
          fontSize={size / 4}
          fontWeight="600"
          fontFamily="Inter, sans-serif"
        >
          {score}
        </text>
      </svg>
      {label && <p className="text-xs font-medium text-text-secondary text-center">{label}</p>}
      {sublabel && <p className="text-[10px] text-text-muted text-center">{sublabel}</p>}
    </div>
  )
}
