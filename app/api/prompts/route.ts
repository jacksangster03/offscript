import { NextRequest, NextResponse } from 'next/server'
import type { DrillMode, Difficulty, PromptCategory } from '@/types'
import { PROMPT_SEEDS } from '@/lib/prompts/seed-data'

// Used when Supabase is not configured (demo mode)
function getLocalPrompt(mode: DrillMode, difficulty?: Difficulty, category?: PromptCategory) {
  let pool = PROMPT_SEEDS.filter(p => {
    if (difficulty && p.difficulty !== difficulty) return false
    if (category && p.category !== category) return false
    if (mode === 'chaos' && p.difficulty < 3) return false
    return true
  })
  if (pool.length === 0) pool = PROMPT_SEEDS
  const seed = pool[Math.floor(Math.random() * pool.length)]
  // Give it a fake id so the rest of the app doesn't break
  return { ...seed, id: 'demo-prompt', active: true, created_at: new Date().toISOString() }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = (searchParams.get('mode') ?? 'daily') as DrillMode
  const difficulty = searchParams.get('difficulty')
    ? (Number(searchParams.get('difficulty')) as Difficulty)
    : undefined
  const category = searchParams.get('category') as PromptCategory | undefined

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // No Supabase — serve from the local seed data
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(getLocalPrompt(mode, difficulty, category))
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  let query = supabase.from('prompts').select('*').eq('active', true)
  if (difficulty) query = query.eq('difficulty', difficulty)
  if (category) query = query.eq('category', category)
  if (mode === 'chaos') {
    query = supabase.from('prompts').select('*').eq('active', true).gte('difficulty', 3)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'No prompts available' }, { status: 404 })

  return NextResponse.json(data[Math.floor(Math.random() * data.length)])
}
