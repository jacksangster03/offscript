import { NextRequest, NextResponse } from 'next/server'
import { fetchRandomWikipediaCandidates, fetchWikipediaSummary } from '@/lib/topics/wiki'
import { scoreTopicQuality } from '@/lib/topics/quality'
import { generateTopicPrompts } from '@/lib/topics/generate'
import { toCategorySlug } from '@/lib/topics/taxonomy'

interface IngestBody {
  category?: string
  limit?: number
  secret?: string
}

export async function POST(req: NextRequest) {
  const body = (await safeJson(req)) as IngestBody
  const requiredSecret = process.env.INGEST_SECRET

  if (!requiredSecret || body.secret !== requiredSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 })
  }

  const limit = clamp(Number(body.limit ?? 8), 1, 20)
  const category = String(body.category ?? 'Weird, Obscure & Random')
  const candidates = await fetchRandomWikipediaCandidates(category, limit, { timeoutMs: 3500, retries: 1 })
  if (!candidates.length) {
    return NextResponse.json({ inserted: 0, skipped: 0, reason: 'no_candidates' })
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const results: Array<{ title: string; inserted: boolean; reason?: string }> = []
  let insertedCount = 0

  for (const candidate of candidates) {
    const summary = await fetchWikipediaSummary(candidate.title, { timeoutMs: 3500, retries: 1 })
    if (!summary) {
      results.push({ title: candidate.title, inserted: false, reason: 'summary_unavailable' })
      continue
    }

    const quality = scoreTopicQuality({ title: summary.title, summary: summary.summary })
    if (!quality.accepted) {
      results.push({ title: summary.title, inserted: false, reason: quality.rejection_reason ?? 'quality_reject' })
      continue
    }

    const topicSlug = toCategorySlug(summary.title)
    const difficulty = clamp(Math.round(quality.speakability_score / 2.5), 1, 4)
    const promptDrafts = await generateTopicPrompts({
      title: summary.title,
      summary: summary.summary,
      categoryName: category,
      difficulty: difficulty as 1 | 2 | 3 | 4,
      sourceLabel: 'Wikipedia',
      sourceUrl: summary.source_url,
    })

    const { data: topicRow, error: topicErr } = await supabase
      .from('topics')
      .upsert({
        title: summary.title,
        slug: topicSlug,
        summary: summary.summary,
        source_label: 'Wikipedia',
        source_url: summary.source_url,
        difficulty,
        quality_score: quality.quality_score,
        speakability_score: quality.speakability_score,
        weirdness_score: quality.weirdness_score,
        conversation_value_score: quality.conversation_value_score,
        active: true,
      }, { onConflict: 'slug' })
      .select('id')
      .single()

    if (topicErr || !topicRow?.id) {
      results.push({ title: summary.title, inserted: false, reason: 'topic_upsert_failed' })
      continue
    }

    const { data: catRow } = await supabase
      .from('topic_categories')
      .select('id')
      .eq('slug', toCategorySlug(category))
      .single()

    if (catRow?.id) {
      await supabase
        .from('topic_category_links')
        .upsert({ topic_id: topicRow.id, category_id: catRow.id, confidence: 0.8 })
    }

    const promptRows = promptDrafts.map((draft) => ({
      topic_id: topicRow.id,
      category_id: catRow?.id ?? null,
      prompt_variant: draft.prompt_variant,
      prompt_text: draft.prompt_text,
      context_bullets: draft.context_bullets,
      speaking_angle: draft.speaking_angle,
      retry_angle: draft.retry_angle,
      difficulty: draft.difficulty,
      source_label: draft.source_label ?? 'Wikipedia',
      source_url: draft.source_url ?? summary.source_url,
      active: true,
    }))
    const { error: promptErr } = await supabase.from('topic_prompts').insert(promptRows)
    if (promptErr) {
      results.push({ title: summary.title, inserted: false, reason: 'prompt_insert_failed' })
      continue
    }

    insertedCount++
    results.push({ title: summary.title, inserted: true })
  }

  return NextResponse.json({
    inserted: insertedCount,
    skipped: results.length - insertedCount,
    results,
  })
}

async function safeJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
