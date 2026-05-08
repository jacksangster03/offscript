'use client'

import { Card } from '@/components/ui/Card'
import type { ConversationalRangeSummary } from '@/types'
import { ConversationalRangeCard } from './ConversationalRangeCard'
import { CategoryHeatmap } from './CategoryHeatmap'

interface CategoryStat {
  category_slug: string
  category_name: string
  attempts_count: number
}

interface Recommendation {
  preferred_category_slug: string
  target_difficulty: number
  reason: string
}

export function CuriosityDashboard({
  summary,
  categoryStats,
  recommendation,
}: {
  summary: ConversationalRangeSummary
  categoryStats: CategoryStat[]
  recommendation: Recommendation
}) {
  return (
    <div className="space-y-6">
      <ConversationalRangeCard summary={summary} />

      <div className="grid md:grid-cols-2 gap-6">
        <CategoryHeatmap rows={categoryStats.map((row) => ({
          slug: row.category_slug,
          attempts_count: row.attempts_count,
        }))} />
        <Card className="p-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-3">Weekly recommendation</p>
          <p className="text-sm text-text-primary">
            Target category: <span className="font-medium">{recommendation.preferred_category_slug}</span>
          </p>
          <p className="text-sm text-text-primary mt-1">
            Suggested difficulty: <span className="font-medium">L{recommendation.target_difficulty}</span>
          </p>
          <p className="text-xs text-text-muted mt-3">{recommendation.reason}</p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Metric label="Breadth" value={summary.category_breadth_score} />
        <Metric label="Balance" value={summary.category_balance_score} />
        <Metric label="Curiosity Avg" value={summary.average_curiosity_score} />
        <Metric label="Difficulty Progression" value={summary.difficulty_progression_score} />
        <Metric label="Weak-Domain Courage" value={summary.weak_domain_courage_score} />
        <Metric label="Cross-Domain Connection" value={summary.cross_domain_connection_score} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-xl text-text-primary mt-1">{value}/10</p>
    </Card>
  )
}
