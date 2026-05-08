'use client'

import { Card } from '@/components/ui/Card'
import { ScoreRing } from '@/components/ui/ScoreRing'
import type { ConversationalRangeSummary } from '@/types'

export function ConversationalRangeCard({ summary }: { summary: ConversationalRangeSummary }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">Conversational range</p>
          <p className="text-sm text-text-secondary mt-1">Breadth + balance + curiosity quality across domains.</p>
          <p className="text-xs text-text-muted mt-2">
            {summary.categories_attempted} / 40 categories attempted
          </p>
        </div>
        <ScoreRing score={summary.range_score} size={74} strokeWidth={6} />
      </div>
    </Card>
  )
}
