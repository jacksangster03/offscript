'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/components/ui/cn'

interface WebcamPreviewProps {
  stream: MediaStream | null
  recording?: boolean
  className?: string
}

export function WebcamPreview({ stream, recording, className }: WebcamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <div className={cn('relative overflow-hidden rounded-2xl bg-bg-elevated border border-border-subtle', className)}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1]"
          aria-label="Webcam preview"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-overlay flex items-center justify-center">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.88v6.24a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <p className="text-xs text-text-muted">Camera not active</p>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <motion.div
            className="w-2 h-2 rounded-full bg-danger"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
          <span className="text-xs font-medium text-white">REC</span>
        </div>
      )}

      {/* Corner vignette */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }} />
    </div>
  )
}
