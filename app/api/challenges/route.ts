import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CHALLENGE_TEMPLATES, getTemplateByKey } from '@/lib/challenges/templates'

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.json({ challenges: [], templates: CHALLENGE_TEMPLATES })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ challenges: data ?? [], templates: CHALLENGE_TEMPLATES })
}

export async function POST(req: NextRequest) {
  const body = await safeJson(req)
  const key = String((body as { template_key?: string }).template_key ?? '')
  const template = getTemplateByKey(key)
  if (!template) return NextResponse.json({ error: 'Invalid template_key' }, { status: 400 })

  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return NextResponse.json({
      id: 'demo-challenge',
      template_key: key,
      title: template.title,
      total_days: template.total_days,
      status: 'active',
      starts_at: new Date().toISOString().slice(0, 10),
    })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const startsAt = new Date()
  const dueBase = startsAt.toISOString().slice(0, 10)

  const { data: challenge, error } = await supabase
    .from('challenges')
    .insert({
      user_id: user.id,
      template_key: template.key,
      title: template.title,
      total_days: template.total_days,
      status: 'active',
      starts_at: dueBase,
      metadata: { mode: template.mode, paid_gating_todo: true },
    })
    .select()
    .single()

  if (error || !challenge) return NextResponse.json({ error: error?.message ?? 'Failed to create challenge' }, { status: 500 })

  const dayRows = Array.from({ length: template.total_days }, (_, idx) => {
    const due = new Date(startsAt)
    due.setDate(due.getDate() + idx)
    return {
      challenge_id: challenge.id,
      day_number: idx + 1,
      due_date: due.toISOString().slice(0, 10),
      status: 'pending',
    }
  })
  await supabase.from('challenge_days').insert(dayRows)

  return NextResponse.json(challenge)
}

async function safeJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}
