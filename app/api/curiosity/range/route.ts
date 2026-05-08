import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeConversationalRangeScore } from '@/lib/curiosity/range'
import { TOP_LEVEL_CATEGORIES } from '@/lib/topics/taxonomy'
import { recommendNextTopicForUser } from '@/lib/topics/recommend'

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.json({
      summary: computeConversationalRangeScore({ rows: [], totalCategories: TOP_LEVEL_CATEGORIES.length }),
      category_stats: [],
      recommendation: recommendNextTopicForUser([], TOP_LEVEL_CATEGORIES[0].slug),
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: rows, error } = await supabase
    .from('user_category_stats')
    .select(`
      attempts_count,
      avg_curiosity,
      avg_interestingness,
      avg_difficulty,
      topic_categories!inner(slug, name)
    `)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

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

  return NextResponse.json({
    summary,
    category_stats: normalized,
    recommendation,
  })
}

function asNumberOrNull(value: number | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}
