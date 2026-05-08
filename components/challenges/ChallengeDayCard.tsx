'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export function ChallengeDayCard({
  challengeId,
  dayNumber,
  dueDate,
  status,
}: {
  challengeId: string
  dayNumber: number
  dueDate: string
  status: 'pending' | 'completed' | 'missed'
}) {
  const tone =
    status === 'completed'
      ? 'text-success'
      : status === 'missed'
      ? 'text-danger'
      : 'text-warning'
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-text-primary font-medium">Day {dayNumber}</p>
          <p className="text-xs text-text-muted mt-1">Due {new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <p className={`text-xs uppercase tracking-wide ${tone}`}>{status}</p>
      </div>
      <div className="mt-3">
        <Link
          href={`/drill?mode=challenge_day&topic=1&challengeId=${challengeId}`}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white inline-flex"
        >
          Start day
        </Link>
      </div>
    </Card>
  )
}
