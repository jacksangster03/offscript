import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { DrillMode, Difficulty } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json()
  const { promptId, mode, difficulty } = body as {
    promptId: string
    mode: DrillMode
    difficulty: Difficulty
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      prompt_id: promptId,
      mode,
      difficulty,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
