import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fallbackRelatedTopics, generateTopicEdges } from '@/lib/topics/trails'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topicId')
  if (!topicId) return NextResponse.json({ error: 'topicId is required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ topic: null, related: [], edges: [] })
  }

  const supabase = await createClient()
  const { data: topic, error: topicErr } = await supabase
    .from('topics')
    .select('id,title,summary,difficulty')
    .eq('id', topicId)
    .single()
  if (topicErr || !topic) return NextResponse.json({ error: 'topic not found' }, { status: 404 })

  const { data: storedEdges } = await supabase
    .from('topic_edges')
    .select('*')
    .eq('from_topic_id', topicId)
    .order('weight', { ascending: false })
    .limit(20)

  let relatedRows: Array<{ id: string; title: string; summary: string | null; difficulty: number | null }> = []
  let edges = storedEdges ?? []

  if (edges.length > 0) {
    const relatedIds = edges.map((e) => e.to_topic_id)
    const { data: related } = await supabase
      .from('topics')
      .select('id,title,summary,difficulty')
      .in('id', relatedIds)
    relatedRows = related ?? []
  } else {
    const { data: pool } = await supabase
      .from('topics')
      .select('id,title,summary,difficulty')
      .neq('id', topicId)
      .limit(80)
    const candidatePool = pool ?? []
    relatedRows = fallbackRelatedTopics(topic, candidatePool, 6).map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary ?? null,
      difficulty: row.difficulty ?? null,
    }))
    edges = generateTopicEdges(topic, relatedRows)
  }

  return NextResponse.json({
    topic,
    related: relatedRows,
    edges,
  })
}
