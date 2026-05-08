'use client'

import { motion } from 'framer-motion'
import type { Prompt } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/components/ui/cn'

interface PromptCardProps {
  prompt: Prompt
  showRetryAngle?: boolean
  compact?: boolean
  className?: string
}

const difficultyLabel: Record<number, string> = {
  1: 'Familiar',
  2: 'Unfamiliar',
  3: 'Abstract',
  4: 'Pressure',
}

const difficultyVariant: Record<number, 'default' | 'accent' | 'warning' | 'danger'> = {
  1: 'default',
  2: 'accent',
  3: 'warning',
  4: 'danger',
}

const categoryLabels: Record<string, string> = {
  society: 'Society',
  science: 'Science',
  business: 'Business',
  ethics: 'Ethics',
  history: 'History',
  technology: 'Technology',
  culture: 'Culture',
  absurd: 'Open',
  interview: 'Interview',
  debate: 'Debate',
}

export function PromptCard({ prompt, showRetryAngle, compact, className }: PromptCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border-default bg-bg-elevated',
        'shadow-elevated',
        className
      )}
    >
      {/* Subtle top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />

      <div className={cn('p-6', compact && 'p-4')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={difficultyVariant[prompt.difficulty]}>
              Level {prompt.difficulty} · {difficultyLabel[prompt.difficulty]}
            </Badge>
            <Badge variant="outline">{categoryLabels[prompt.category] ?? prompt.category}</Badge>
          </div>
          <p className="text-xs text-text-muted flex-shrink-0">{prompt.topic}</p>
        </div>

        {/* Main prompt */}
        <p className={cn(
          'font-medium text-text-primary text-balance leading-relaxed',
          compact ? 'text-base' : 'text-xl'
        )}>
          &ldquo;{prompt.prompt_text}&rdquo;
        </p>

        {/* Context bullets */}
        {!compact && (
          <div className="mt-5 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Context</p>
            <ul className="space-y-1.5">
              {prompt.context_bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-accent/60 flex-shrink-0 mt-2" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Retry angle */}
        {showRetryAngle && (
          <div className="mt-5 pt-4 border-t border-border-subtle">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-1.5">New angle</p>
            <p className="text-sm text-text-secondary italic">&ldquo;{prompt.retry_angle}&rdquo;</p>
          </div>
        )}

        {prompt.speaking_angle && (
          <div className="mt-4 pt-4 border-t border-border-subtle">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-1.5">Speaking angle</p>
            <p className="text-sm text-text-secondary">{prompt.speaking_angle}</p>
          </div>
        )}

        {(prompt.source_label || prompt.source_url) && (
          <div className="mt-4 text-[11px] text-text-disabled">
            Source: {prompt.source_label ?? 'Reference'}
            {prompt.source_url ? ` · ${prompt.source_url}` : ''}
          </div>
        )}
      </div>
    </motion.div>
  )
}
