'use client'

import { motion } from 'framer-motion'
import { cn } from '@/components/ui/cn'

interface MicWaveformProps {
  level: number // 0–1
  active: boolean
  barCount?: number
  className?: string
}

const BAR_HEIGHTS = [0.3, 0.5, 0.7, 1.0, 0.8, 0.6, 0.9, 1.0, 0.7, 0.5, 0.3]

export function MicWaveform({ level, active, barCount = 11, className }: MicWaveformProps) {
  return (
    <div
      className={cn('flex items-center justify-center gap-[3px]', className)}
      aria-label={active ? 'Microphone active' : 'Microphone inactive'}
    >
      {Array.from({ length: barCount }, (_, i) => {
        const baseHeight = BAR_HEIGHTS[i % BAR_HEIGHTS.length]
        const delay = (i / barCount) * 0.6

        return (
          <motion.div
            key={i}
            className={cn(
              'w-[3px] rounded-full',
              active ? 'bg-success' : 'bg-border-strong'
            )}
            animate={
              active
                ? {
                    scaleY: [
                      0.2 + baseHeight * 0.3,
                      0.2 + baseHeight * level * 0.9 + 0.1,
                      0.2 + baseHeight * 0.2,
                    ],
                    opacity: 1,
                  }
                : { scaleY: 0.15, opacity: 0.3 }
            }
            initial={{ scaleY: 0.15, opacity: 0.3 }}
            transition={
              active
                ? {
                    scaleY: {
                      repeat: Infinity,
                      duration: 0.6 + Math.random() * 0.4,
                      delay,
                      ease: 'easeInOut',
                    },
                    opacity: { duration: 0.2 },
                  }
                : { duration: 0.3 }
            }
            style={{
              height: '28px',
              transformOrigin: 'center',
            }}
          />
        )
      })}
    </div>
  )
}
