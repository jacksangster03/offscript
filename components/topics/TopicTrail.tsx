'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'

interface TrailTopic {
  id: string
  title: string
  summary?: string | null
}

interface TrailEdge {
  to_topic_id: string
  edge_type: 'similar' | 'contrast' | 'weird_link' | 'cross_domain'
  reason?: string | null
}

const EDGE_LABELS: Record<TrailEdge['edge_type'], string> = {
  similar: 'Similar',
  contrast: 'Contrast',
  weird_link: 'Weird link',
  cross_domain: 'Cross-domain',
}

export function TopicTrail({
  baseTopicId,
  topics,
  edges,
}: {
  baseTopicId: string
  topics: TrailTopic[]
  edges: TrailEdge[]
}) {
  const edgeById = new Map(edges.map((edge) => [edge.to_topic_id, edge]))
  return (
    <Card className="p-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-3">Topic trail</p>
      <div className="space-y-3">
        {topics.map((topic) => {
          const edge = edgeById.get(topic.id)
          return (
            <div key={topic.id} className="rounded-xl border border-border-subtle p-3 bg-bg-surface">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-text-primary font-medium">{topic.title}</p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {topic.summary ?? 'Related speaking angle'}
                  </p>
                  {edge?.reason && <p className="text-[11px] text-text-disabled mt-2">{edge.reason}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-wide text-accent">
                  {EDGE_LABELS[edge?.edge_type ?? 'cross_domain']}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/topics?topicId=${topic.id}`}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-border-default hover:border-border-strong text-text-secondary"
                >
                  Explore
                </Link>
                <Link
                  href={`/drill?mode=rabbit_hole&topic=1&fromTopicId=${baseTopicId}`}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover"
                >
                  Drill this trail
                </Link>
              </div>
            </div>
          )
        })}
        {topics.length === 0 && (
          <p className="text-xs text-text-muted">No related topics yet. Ingest more topics to build deeper trails.</p>
        )}
      </div>
    </Card>
  )
}
