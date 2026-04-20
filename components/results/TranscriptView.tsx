'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/Card'

interface TranscriptViewProps {
  transcript: string
  mock?: boolean
}

export function TranscriptView({ transcript, mock }: TranscriptViewProps) {
  const [expanded, setExpanded] = useState(false)
  const preview = transcript.slice(0, 280)
  const needsExpand = transcript.length > 280

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Transcript</p>
        {mock && (
          <span className="text-[10px] text-text-disabled border border-border-subtle px-1.5 py-0.5 rounded">
            mock
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        <motion.p
          key={expanded ? 'full' : 'preview'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-text-secondary leading-relaxed"
        >
          {expanded || !needsExpand ? transcript : `${preview}…`}
        </motion.p>
      </AnimatePresence>

      {needsExpand && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
        >
          {expanded ? 'Show less' : 'Show full transcript'}
        </button>
      )}
    </Card>
  )
}
