'use client'

import { Card } from '@/components/ui/Card'
import { TOP_LEVEL_CATEGORIES } from '@/lib/topics/taxonomy'

interface HeatCell {
  slug: string
  attempts_count: number
}

export function CategoryHeatmap({ rows }: { rows: HeatCell[] }) {
  const bySlug = new Map(rows.map((r) => [r.slug, r.attempts_count]))
  return (
    <Card className="p-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-3">40-category heatmap</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {TOP_LEVEL_CATEGORIES.map((category) => {
          const count = bySlug.get(category.slug) ?? 0
          const tone =
            count >= 8 ? 'bg-success/25 border-success/40' :
            count >= 4 ? 'bg-accent/20 border-accent/40' :
            count >= 1 ? 'bg-warning/20 border-warning/35' :
            'bg-bg-surface border-border-subtle'
          return (
            <div
              key={category.slug}
              className={`rounded-lg border px-2.5 py-2 ${tone}`}
              title={`${category.name}: ${count} attempts`}
            >
              <p className="text-[11px] text-text-secondary leading-tight">{category.name}</p>
              <p className="text-[10px] text-text-muted mt-1">{count} attempts</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
