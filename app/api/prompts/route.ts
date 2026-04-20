import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DrillMode, Difficulty, PromptCategory } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)

  const mode = (searchParams.get('mode') ?? 'daily') as DrillMode
  const difficulty = searchParams.get('difficulty')
    ? (Number(searchParams.get('difficulty')) as Difficulty)
    : undefined
  const category = searchParams.get('category') as PromptCategory | undefined

  let query = supabase
    .from('prompts')
    .select('*')
    .eq('active', true)

  if (difficulty) query = query.eq('difficulty', difficulty)
  if (category) query = query.eq('category', category)

  // Chaos mode: difficulty 3 or 4
  if (mode === 'chaos') {
    query = supabase
      .from('prompts')
      .select('*')
      .eq('active', true)
      .gte('difficulty', 3)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'No prompts available' }, { status: 404 })
  }

  // Pick a random prompt
  const prompt = data[Math.floor(Math.random() * data.length)]
  return NextResponse.json(prompt)
}
