import { NextRequest, NextResponse } from 'next/server'
import type { DrillMode, Difficulty } from '@/types'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { promptId, mode, difficulty } = body as {
    promptId: string
    mode: DrillMode
    difficulty: Difficulty
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Demo mode — return a fake session so the drill can proceed
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      id: 'demo-session',
      user_id: 'demo',
      prompt_id: promptId,
      mode,
      difficulty,
      status: 'active',
      started_at: new Date().toISOString(),
      completed_at: null,
    })
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, prompt_id: promptId, mode, difficulty, status: 'active' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
