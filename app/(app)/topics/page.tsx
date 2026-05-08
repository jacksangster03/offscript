import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { TopicTrail } from '@/components/topics/TopicTrail'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Topics' }

interface SearchParams {
  topicId?: string
}

export default async function TopicsPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-light text-text-primary">Topics</h1>
        <p className="text-sm text-text-muted">Topic trails appear after topic ingestion.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: topics } = await supabase
    .from('topics')
    .select('id,title,summary,difficulty')
    .eq('active', true)
    .limit(40)

  const selectedTopicId = searchParams.topicId ?? topics?.[0]?.id
  let trail: { related: Array<{ id: string; title: string; summary: string | null }>; edges: Array<{ to_topic_id: string; edge_type: 'similar' | 'contrast' | 'weird_link' | 'cross_domain'; reason?: string | null }> } = { related: [], edges: [] }

  if (selectedTopicId) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    try {
      const res = await fetch(`${appUrl}/api/topics/trails?topicId=${selectedTopicId}`, { cache: 'no-store' })
      if (res.ok) {
        trail = await res.json()
      }
    } catch {
      // fall through with empty trail
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-light text-text-primary">Topics</h1>
          <p className="text-sm text-text-muted mt-0.5">Explore domains and follow rabbit-hole trails.</p>
        </div>
        <Link
          href="/drill?mode=deep_random&topic=1"
          className="h-10 px-4 rounded-xl bg-accent text-white text-sm font-medium inline-flex items-center"
        >
          Start Deep Random
        </Link>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="p-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-3">Available topics</p>
          <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
            {(topics ?? []).map((topic) => (
              <Link
                key={topic.id}
                href={`/topics?topicId=${topic.id}`}
                className={`block rounded-lg border px-3 py-2 text-sm ${
                  selectedTopicId === topic.id
                    ? 'border-accent/40 bg-accent/10 text-text-primary'
                    : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-default'
                }`}
              >
                <p className="font-medium">{topic.title}</p>
                <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{topic.summary ?? ''}</p>
              </Link>
            ))}
            {(!topics || topics.length === 0) && (
              <p className="text-xs text-text-muted">No topics yet. Run `/api/topics/ingest` to seed.</p>
            )}
          </div>
        </Card>

        <TopicTrail
          baseTopicId={selectedTopicId ?? ''}
          topics={trail.related ?? []}
          edges={trail.edges ?? []}
        />
      </div>
    </div>
  )
}
