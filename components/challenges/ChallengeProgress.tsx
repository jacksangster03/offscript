'use client'

import { Card } from '@/components/ui/Card'

export function ChallengeProgress({
  title,
  totalDays,
  completedDays,
}: {
  title: string
  totalDays: number
  completedDays: number
}) {
  const pct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-muted mt-1">{completedDays}/{totalDays} days completed</p>
      <div className="mt-3 h-2 rounded-full bg-bg-surface overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  )
}
