import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { pickFallbackTopicPrompt, toLegacyPromptShape } from '@/lib/topics/fallback-bank'
import type { Prompt } from '@/types'

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const today = new Date().toISOString().slice(0, 10)

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const fallback = pickFallbackTopicPrompt('challenge_day', 2)
    return NextResponse.json({
      challenge_day: { id: 'demo-day', challenge_id: id, day_number: 1, due_date: today, status: 'pending' },
      prompt: toLegacyPromptShape(fallback),
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

  let { data: day } = await supabase
    .from('challenge_days')
    .select('*')
    .eq('challenge_id', id)
    .eq('due_date', today)
    .single()

  if (!day) {
    const { data: nextDay } = await supabase
      .from('challenge_days')
      .select('*')
      .eq('challenge_id', id)
      .eq('status', 'pending')
      .order('day_number', { ascending: true })
      .limit(1)
      .single()
    day = nextDay
  }

  let prompt: Prompt | null = null
  if (day?.topic_prompt_id) {
    const { data } = await supabase
      .from('topic_prompts')
      .select('*, topics(*)')
      .eq('id', day.topic_prompt_id)
      .single()
    if (data) {
      prompt = {
        id: data.id,
        topic: (data as { topics?: { title?: string } }).topics?.title ?? 'Topic',
        category: 'society',
        difficulty: data.difficulty ?? 2,
        stance_type: 'open',
        prompt_text: data.prompt_text,
        context_bullets: data.context_bullets ?? [],
        retry_angle: data.retry_angle ?? 'Try a tighter opening sentence and one concrete example.',
        tags: ['challenge'],
        active: true,
        created_at: data.created_at,
        speaking_angle: data.speaking_angle,
        topic_id: data.topic_id,
        topic_prompt_id: data.id,
      }
    }
  }

  if (!prompt) {
    const fallback = pickFallbackTopicPrompt('challenge_day', 2)
    prompt = toLegacyPromptShape(fallback)
  }

  return NextResponse.json({ challenge_day: day, prompt })
}
