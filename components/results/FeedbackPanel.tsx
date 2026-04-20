'use client'

import { motion } from 'framer-motion'
import type { Feedback, Metrics } from '@/types'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatPauseMs } from '@/lib/metrics/compute'
import { cn } from '@/components/ui/cn'

interface FeedbackPanelProps {
  feedback: Feedback
  metrics: Metrics
  mock?: boolean
}

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } } },
  item: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  },
}

export function FeedbackPanel({ feedback, metrics, mock }: FeedbackPanelProps) {
  return (
    <motion.div
      variants={stagger.container}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {mock && (
        <motion.div variants={stagger.item}>
          <Badge variant="warning" className="text-xs">
            Demo mode — connect OpenAI API for live coaching
          </Badge>
        </motion.div>
      )}

      {/* Score grid */}
      <motion.div variants={stagger.item}>
        <Card className="p-6">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-6">
            Performance scores
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <ScoreRing
              score={feedback.freeze_resilience_score}
              label="Freeze Resilience"
              sublabel="signature metric"
              size={88}
            />
            <ScoreRing score={feedback.clarity_score} label="Clarity" size={88} />
            <ScoreRing score={feedback.structure_score} label="Structure" size={88} />
            <ScoreRing score={feedback.composure_score} label="Composure" size={88} />
          </div>
        </Card>
      </motion.div>

      {/* Metrics row */}
      <motion.div variants={stagger.item}>
        <MetricsRow metrics={metrics} />
      </motion.div>

      {/* Strength */}
      <motion.div variants={stagger.item}>
        <FeedbackBlock
          type="strength"
          label="What worked"
          icon="✦"
          text={feedback.strength_text}
          colourClass="border-success/20 bg-success/5"
          labelClass="text-success"
        />
      </motion.div>

      {/* Priority fix */}
      <motion.div variants={stagger.item}>
        <FeedbackBlock
          type="fix"
          label="Priority fix"
          icon="→"
          text={feedback.priority_fix_text}
          colourClass="border-warning/20 bg-warning/5"
          labelClass="text-warning"
        />
      </motion.div>

      {/* Rescue phrase */}
      <motion.div variants={stagger.item}>
        <Card className="p-5 border-accent/20 bg-accent/5">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center text-accent text-sm font-bold">
              ◈
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-accent mb-2">
                Rescue phrase
              </p>
              <p className="text-base font-medium text-text-primary italic">
                {feedback.rescue_phrase}
              </p>
              <p className="text-xs text-text-muted mt-1.5">
                Use this next time you freeze or lose your place.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Retry instruction */}
      {feedback.retry_instruction && (
        <motion.div variants={stagger.item}>
          <Card className="p-5 border-border-default bg-bg-elevated">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
              For the retry
            </p>
            <p className="text-sm text-text-secondary">{feedback.retry_instruction}</p>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}

function FeedbackBlock({
  label, icon, text, colourClass, labelClass,
}: {
  type: 'strength' | 'fix'
  label: string
  icon: string
  text: string
  colourClass: string
  labelClass: string
}) {
  return (
    <Card className={cn('p-5 border', colourClass)}>
      <div className="flex items-start gap-3">
        <span className={cn('text-lg mt-0.5 flex-shrink-0', labelClass)}>{icon}</span>
        <div>
          <p className={cn('text-[10px] font-medium uppercase tracking-widest mb-1.5', labelClass)}>
            {label}
          </p>
          <p className="text-sm text-text-primary leading-relaxed">{text}</p>
        </div>
      </div>
    </Card>
  )
}

function MetricStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-lg font-light tabular text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
      {sub && <p className="text-[10px] text-text-disabled">{sub}</p>}
    </div>
  )
}

function MetricsRow({ metrics }: { metrics: Metrics }) {
  const wpm = metrics.words_per_minute
  const wpmLabel = wpm < 100 ? 'slow' : wpm < 160 ? 'good pace' : 'fast'

  return (
    <Card className="p-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-4">Timing metrics</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
        <MetricStat
          label="Time to first sentence"
          value={formatPauseMs(metrics.time_to_first_sentence_ms)}
          sub={metrics.time_to_first_sentence_ms < 3000 ? 'strong start' : 'delayed start'}
        />
        <MetricStat
          label="Longest pause"
          value={formatPauseMs(metrics.longest_pause_ms)}
          sub={metrics.longest_pause_ms > 5000 ? 'noticeable freeze' : undefined}
        />
        <MetricStat
          label="Words per minute"
          value={`${wpm} wpm`}
          sub={wpmLabel}
        />
        <MetricStat
          label="Filler words"
          value={`${metrics.filler_count}`}
          sub={`${metrics.filler_per_minute.toFixed(1)}/min`}
        />
      </div>
    </Card>
  )
}
