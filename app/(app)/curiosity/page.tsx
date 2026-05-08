import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CuriosityDashboard } from '@/components/dashboard/CuriosityDashboard'
import { computeConversationalRangeScore } from '@/lib/curiosity/range'
import { recommendNextTopicForUser } from '@/lib/topics/recommend'
import { TOP_LEVEL_CATEGORIES } from '@/lib/topics/taxonomy'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Curiosity' }

export default async function CuriosityPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const summary = computeConversationalRangeScore({ rows: [], totalCategories: TOP_LEVEL_CATEGORIES.length })
    const recommendation = recommendNextTopicForUser([], TOP_LEVEL_CATEGORIES[0].slug)
    return (
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-light text-text-primary">Curiosity</h1>
          <p className="text-sm text-text-muted mt-0.5">Build range across 40 conversation domains.</p>
        </div>
        <CuriosityDashboard summary={summary} categoryStats={[]} recommendation={recommendation} />
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: rows } = await supabase
    .from('user_category_stats')
    .select(`
      attempts_count,
      avg_curiosity,
      avg_interestingness,
      avg_difficulty,
      topic_categories!inner(slug, name)
    `)
    .eq('user_id', user.id)

  const normalized = (rows ?? []).map((row) => ({
    category_slug: String((row as { topic_categories?: { slug?: string } }).topic_categories?.slug ?? ''),
    category_name: String((row as { topic_categories?: { name?: string } }).topic_categories?.name ?? ''),
    attempts_count: Number((row as { attempts_count?: number }).attempts_count ?? 0),
    avg_curiosity: asNumberOrNull((row as { avg_curiosity?: number | null }).avg_curiosity),
    avg_interestingness: asNumberOrNull((row as { avg_interestingness?: number | null }).avg_interestingness),
    avg_difficulty: asNumberOrNull((row as { avg_difficulty?: number | null }).avg_difficulty),
  })).filter((row) => row.category_slug.length > 0)

  const summary = computeConversationalRangeScore({
    rows: normalized,
    totalCategories: TOP_LEVEL_CATEGORIES.length,
  })

  const recommendation = recommendNextTopicForUser(
    normalized.map((row) => ({
      category_slug: row.category_slug,
      attempts_count: row.attempts_count,
      avg_curiosity: row.avg_curiosity,
      avg_difficulty: row.avg_difficulty,
    })),
    'weird-obscure-and-random'
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-light text-text-primary">Curiosity</h1>
        <p className="text-sm text-text-muted mt-0.5">Build range across 40 conversation domains.</p>
      </div>
      <CuriosityDashboard
        summary={summary}
        categoryStats={normalized.map((row) => ({
          category_slug: row.category_slug,
          category_name: row.category_name,
          attempts_count: row.attempts_count,
        }))}
        recommendation={recommendation}
      />
    </div>
  )
}

function asNumberOrNull(value: number | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
