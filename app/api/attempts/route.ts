import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/ai/transcription'
import { generateCoaching } from '@/lib/ai/coaching'
import {
  computeMetricsFromWords,
  computeMetricsFromTranscript,
  computeFreezeResilienceScore,
} from '@/lib/metrics/compute'
import { detectSpeechDisfluencyEvents } from '@/lib/metrics/disfluency'
import { computeCompositeFreezeScores } from '@/lib/metrics/freeze-score'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const form = await req.formData()
  const audioFile = form.get('audio') as File | null
  const sessionId = form.get('sessionId') as string
  const promptId = form.get('promptId') as string
  const attemptNumber = Number(form.get('attemptNumber') ?? '1')
  const durationSec = Number(form.get('durationSec') ?? '60')

  if (!audioFile || !sessionId || !promptId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Fetch the prompt
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', promptId)
    .single()

  if (promptError || !prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
  }

  // Upload audio to Supabase storage
  let audioUrl: string | null = null
  try {
    const { data: upload } = await supabase.storage
      .from('recordings')
      .upload(`${user.id}/${sessionId}/${attemptNumber}.webm`, audioFile, {
        contentType: audioFile.type,
        upsert: true,
      })
    if (upload) {
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(upload.path)
      audioUrl = publicUrl
    }
  } catch {
    // Storage upload failure is non-blocking
  }

  // Transcribe
  const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type })
  const transcriptionResult = await transcribeAudio(audioBlob, audioFile.name)

  // Compute metrics
  const rawMetrics = transcriptionResult.words?.length
    ? computeMetricsFromWords(transcriptionResult.words, durationSec)
    : computeMetricsFromTranscript(transcriptionResult.transcript, durationSec)

  const hybridAnalysis = transcriptionResult.words?.length
    ? detectSpeechDisfluencyEvents(transcriptionResult.words, transcriptionResult.transcript, durationSec)
    : null

  // Create attempt record
  const { data: attempt, error: attemptError } = await supabase
    .from('attempts')
    .insert({
      session_id: sessionId,
      attempt_number: attemptNumber,
      audio_url: audioUrl,
      transcript: transcriptionResult.transcript,
      duration_sec: durationSec,
    })
    .select()
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
  }

  // Save metrics
  const { data: metricsRow } = await supabase
    .from('metrics')
    .insert({ attempt_id: attempt.id, ...rawMetrics })
    .select()
    .single()

  // Save event-level speech analysis (best effort while migration is rolling out)
  if (hybridAnalysis && hybridAnalysis.speech_events.length > 0) {
    try {
      await supabase
        .from('speech_events')
        .insert(
          hybridAnalysis.speech_events.map((event) => ({
            attempt_id: attempt.id,
            event_type: event.event_type,
            start_ms: event.start_ms,
            end_ms: event.end_ms,
            severity: event.severity,
            metadata: event.metadata ?? {},
          }))
        )
    } catch (err) {
      console.warn('speech_events insert skipped:', err)
    }
  }

  if (hybridAnalysis && hybridAnalysis.freeze_episodes.length > 0) {
    try {
      await supabase
        .from('freeze_episodes')
        .insert(
          hybridAnalysis.freeze_episodes.map((episode) => ({
            attempt_id: attempt.id,
            start_ms: episode.start_ms,
            end_ms: episode.end_ms,
            recovered: episode.recovered,
            speech_signals: episode.speech_signals,
            visual_signals: episode.visual_signals,
            recovery_phrase_used: episode.recovery_phrase_used,
          }))
        )
    } catch (err) {
      console.warn('freeze_episodes insert skipped:', err)
    }
  }

  // Generate AI coaching
  const coaching = await generateCoaching(
    transcriptionResult.transcript,
    rawMetrics,
    prompt,
    hybridAnalysis ?? undefined
  )

  // Blend v1 timing score + hybrid composite + AI interpretation.
  const computedFRS = computeFreezeResilienceScore(rawMetrics)
  const compositeScores = hybridAnalysis
    ? computeCompositeFreezeScores(rawMetrics, hybridAnalysis.feature_vector, {
        aiFreezeResilience: coaching.freeze_resilience_score,
      })
    : null

  const finalFRS = compositeScores
    ? Math.round((coaching.freeze_resilience_score + computedFRS + compositeScores.freeze_resilience_score) / 3)
    : Math.round((coaching.freeze_resilience_score + computedFRS) / 2)

  // Persist visual summary row (Phase 1 fallback values; upgraded in Phase 2 webcam pipeline).
  try {
    await supabase.from('visual_metrics').insert({
      attempt_id: attempt.id,
      face_visible_ratio: null,
      face_centered_ratio: null,
      avg_head_yaw: null,
      head_yaw_std: null,
      avg_head_pitch: null,
      looking_away_ms: null,
      visual_steadiness_score: compositeScores?.visual_steadiness_score ?? null,
    })
  } catch (err) {
    console.warn('visual_metrics insert skipped:', err)
  }

  // Save feedback
  const { data: feedbackRow } = await supabase
    .from('feedback')
    .insert({
      attempt_id: attempt.id,
      clarity_score: coaching.clarity_score,
      structure_score: coaching.structure_score,
      composure_score: coaching.composure_score,
      freeze_resilience_score: finalFRS,
      strength_text: coaching.strength_text,
      priority_fix_text: coaching.priority_fix_text,
      rescue_phrase: coaching.rescue_phrase,
      retry_instruction: coaching.retry_instruction,
    })
    .select()
    .single()

  // Mark session complete
  await supabase
    .from('sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', sessionId)

  // Update streak
  await updateStreak(supabase, user.id)

  return NextResponse.json({
    attemptId: attempt.id,
    metrics: metricsRow,
    feedback: feedbackRow,
    transcript: transcriptionResult.transcript,
    hybrid: {
      feature_vector: hybridAnalysis?.feature_vector ?? null,
      composite_scores: compositeScores,
      speech_event_count: hybridAnalysis?.speech_events.length ?? 0,
      freeze_episode_count: hybridAnalysis?.freeze_episodes.length ?? 0,
    },
    mock: transcriptionResult.mock || coaching.mock,
  })
}

async function updateStreak(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_count, last_session_date')
    .eq('id', userId)
    .single()

  if (!profile) return

  const last = profile.last_session_date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const newStreak = last === yesterdayStr
    ? profile.streak_count + 1
    : last === today
    ? profile.streak_count
    : 1

  await supabase
    .from('profiles')
    .update({ streak_count: newStreak, last_session_date: today })
    .eq('id', userId)
}
