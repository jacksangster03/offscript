import { NextRequest, NextResponse } from 'next/server'
import type { Difficulty, DrillMode, Prompt, TopicPrompt } from '@/types'
import { pickFallbackTopicPrompt, toLegacyPromptShape } from '@/lib/topics/fallback-bank'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('mode') ?? 'daily') as DrillMode
  const difficulty = parseDifficulty(searchParams.get('difficulty'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    const fallback = pickFallbackTopicPrompt(mode, difficulty)
    return NextResponse.json(toLegacyPromptShape(fallback))
  }

  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    let query = supabase
      .from('topic_prompts')
      .select('*, topics(*)')
      .eq('active', true)
      .limit(100)

    if (difficulty) query = query.eq('difficulty', difficulty)
    if (mode === 'chaos') query = query.gte('difficulty', 3)

    const { data, error } = await query
    if (error || !data || data.length === 0) {
      const fallback = pickFallbackTopicPrompt(mode, difficulty)
      return NextResponse.json(toLegacyPromptShape(fallback))
    }

    const selected = data[Math.floor(Math.random() * data.length)] as TopicPrompt & {
      topics?: { id?: string; title?: string; source_label?: string; source_url?: string }
    }

    const responsePrompt: Prompt = {
      id: selected.id,
      topic: selected.topics?.title ?? 'Unknown topic',
      category: 'society',
      difficulty: selected.difficulty ?? 2,
      stance_type: 'open',
      prompt_text: selected.prompt_text,
      context_bullets: selected.context_bullets?.slice(0, 4) ?? [],
      retry_angle: selected.retry_angle ?? 'Try a clearer opening angle and one stronger example.',
      tags: ['topic', selected.prompt_variant],
      active: true,
      created_at: selected.created_at,
      speaking_angle: selected.speaking_angle ?? undefined,
      source_label: selected.source_label ?? selected.topics?.source_label ?? null,
      source_url: selected.source_url ?? selected.topics?.source_url ?? null,
      topic_id: selected.topic_id,
      topic_prompt_id: selected.id,
    }
    return NextResponse.json(responsePrompt)
  } catch {
    const fallback = pickFallbackTopicPrompt(mode, difficulty)
    return NextResponse.json(toLegacyPromptShape(fallback))
  }
}

function parseDifficulty(raw: string | null): Difficulty | undefined {
  if (!raw) return undefined
  const parsed = Number(raw)
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) return parsed
  return undefined
}
