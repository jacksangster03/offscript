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
import { analyzeVisualSteadiness } from '@/lib/vision/analyze'
import { scoreCuriosityFromTranscript } from '@/lib/curiosity/scoring'
import type { Prompt, VisualTelemetryPayload } from '@/types'

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
  const topicId = asNullableString(form.get('topicId'))
  const topicPromptId = asNullableString(form.get('topicPromptId'))
  const sourceMode = asNullableString(form.get('sourceMode'))
  const attemptNumber = Number(form.get('attemptNumber') ?? '1')
  const durationSec = Number(form.get('durationSec') ?? '60')
  const visualTelemetryRaw = form.get('visualTelemetry') as string | null

  if (!audioFile || !sessionId || (!promptId && !topicPromptId)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const prompt = await resolvePromptContext(supabase, {
    promptId: promptId || null,
    topicPromptId,
    topicId,
  })
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt context not found' }, { status: 404 })
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
  const durationMs = durationSec * 1000
  const visualTelemetry = parseVisualTelemetry(visualTelemetryRaw, durationMs)
  const visualAnalysis = visualTelemetry
    ? analyzeVisualSteadiness(visualTelemetry.samples, durationMs)
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
      topic_id: topicId,
      topic_prompt_id: topicPromptId,
      source_mode: sourceMode,
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
        visual: visualAnalysis?.metrics,
        aiFreezeResilience: coaching.freeze_resilience_score,
      })
    : null

  const finalFRS = compositeScores
    ? Math.round((coaching.freeze_resilience_score + computedFRS + compositeScores.freeze_resilience_score) / 3)
    : Math.round((coaching.freeze_resilience_score + computedFRS) / 2)

  // Persist visual summary row.
  try {
    const metrics = visualAnalysis?.metrics
    await supabase.from('visual_metrics').insert({
      attempt_id: attempt.id,
      face_visible_ratio: metrics?.face_visible_ratio ?? null,
      face_centered_ratio: metrics?.face_centered_ratio ?? null,
      avg_head_yaw: metrics?.avg_head_yaw ?? null,
      head_yaw_std: metrics?.head_yaw_std ?? null,
      avg_head_pitch: metrics?.avg_head_pitch ?? null,
      looking_away_ms: metrics?.looking_away_ms ?? null,
      visual_steadiness_score: metrics?.visual_steadiness_score ?? compositeScores?.visual_steadiness_score ?? null,
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

  let curiosityRow: Record<string, unknown> | null = null
  try {
    const curiosity = await scoreCuriosityFromTranscript({
      transcript: transcriptionResult.transcript,
      prompt,
      metrics: rawMetrics,
    })
    const { data } = await supabase
      .from('curiosity_feedback')
      .insert({
        attempt_id: attempt.id,
        topic_id: topicId,
        topic_prompt_id: topicPromptId,
        interestingness_score: curiosity.interestingness_score,
        explanation_score: curiosity.explanation_score,
        connection_score: curiosity.connection_score,
        analogy_score: curiosity.analogy_score,
        opinion_score: curiosity.opinion_score,
        example_score: curiosity.example_score,
        curiosity_score: curiosity.curiosity_score,
        one_interesting_thing: curiosity.one_interesting_thing,
        missed_opportunity: curiosity.missed_opportunity,
        stronger_reframe: curiosity.stronger_reframe,
        suggested_related_topic: curiosity.suggested_related_topic,
      })
      .select()
      .single()
    curiosityRow = data as Record<string, unknown>
    await updateUserCategoryStats(supabase, {
      userId: user.id,
      topicPromptId,
      freezeResilience: finalFRS,
      curiosityScore: curiosity.curiosity_score,
      interestingness: curiosity.interestingness_score,
      difficulty: prompt.difficulty,
    })
  } catch (err) {
    console.warn('curiosity_feedback insert skipped:', err)
  }

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
      visual_telemetry_samples: visualTelemetry?.samples.length ?? 0,
    },
    curiosity: curiosityRow,
    mock: transcriptionResult.mock || coaching.mock,
  })
}

async function resolvePromptContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { promptId: string | null; topicPromptId: string | null; topicId: string | null }
): Promise<Prompt | null> {
  if (input.promptId) {
    const { data } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', input.promptId)
      .single()
    if (data) {
      return data as Prompt
    }
  }

  if (input.topicPromptId) {
    const { data } = await supabase
      .from('topic_prompts')
      .select('*, topics(*)')
      .eq('id', input.topicPromptId)
      .single()
    if (data) {
      const topic = (data as { topics?: { title?: string; source_label?: string; source_url?: string } }).topics
      return {
        id: data.id,
        topic: topic?.title ?? 'Topic',
        category: 'society',
        difficulty: (data.difficulty ?? 2) as 1 | 2 | 3 | 4,
        stance_type: 'open',
        prompt_text: data.prompt_text,
        context_bullets: Array.isArray(data.context_bullets) ? data.context_bullets : [],
        retry_angle: data.retry_angle ?? 'Try a stronger angle and a concrete example.',
        tags: ['topic', data.prompt_variant],
        active: true,
        created_at: data.created_at,
        speaking_angle: data.speaking_angle,
        source_label: data.source_label ?? topic?.source_label ?? null,
        source_url: data.source_url ?? topic?.source_url ?? null,
        topic_id: data.topic_id ?? input.topicId,
        topic_prompt_id: data.id,
      }
    }
  }

  return null
}

function parseVisualTelemetry(raw: string | null, durationMs: number): VisualTelemetryPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as VisualTelemetryPayload
    if (!Array.isArray(parsed.samples) || parsed.samples.length === 0) return null
    const samples = parsed.samples
      .map((sample) => ({
        timestamp_ms: clamp(Math.round(asFiniteNumber(sample.timestamp_ms)), 0, durationMs),
        face_detected: Boolean(sample.face_detected),
        centered: Boolean(sample.centered),
        yaw_deg: asFiniteNumber(sample.yaw_deg),
        pitch_deg: asFiniteNumber(sample.pitch_deg),
        looking_away: Boolean(sample.looking_away),
      }))
      .sort((a, b) => a.timestamp_ms - b.timestamp_ms)
    return {
      samples,
      duration_ms: durationMs,
      sample_rate_hz: clamp(Math.round(parsed.sample_rate_hz || 0), 1, 30),
    }
  } catch {
    return null
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function asFiniteNumber(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function asNullableString(value: FormDataEntryValue | null): string | null {
  if (!value) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
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

async function updateUserCategoryStats(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  input: {
    userId: string
    topicPromptId: string | null
    freezeResilience: number
    curiosityScore: number
    interestingness: number
    difficulty: number
  }
) {
  if (!input.topicPromptId) return

  const { data: topicPrompt } = await supabase
    .from('topic_prompts')
    .select('category_id')
    .eq('id', input.topicPromptId)
    .single()

  const categoryId = topicPrompt?.category_id as string | null
  if (!categoryId) return

  const { data: existing } = await supabase
    .from('user_category_stats')
    .select('*')
    .eq('user_id', input.userId)
    .eq('category_id', categoryId)
    .single()

  if (!existing) {
    await supabase.from('user_category_stats').insert({
      user_id: input.userId,
      category_id: categoryId,
      attempts_count: 1,
      avg_freeze_resilience: input.freezeResilience,
      avg_interestingness: input.interestingness,
      avg_curiosity: input.curiosityScore,
      avg_difficulty: input.difficulty,
      last_attempt_at: new Date().toISOString(),
      avoided_streak: 0,
    })
    return
  }

  const attempts = Number(existing.attempts_count ?? 0)
  const nextAttempts = attempts + 1
  const avgFreeze = movingAverage(existing.avg_freeze_resilience, attempts, input.freezeResilience)
  const avgInterestingness = movingAverage(existing.avg_interestingness, attempts, input.interestingness)
  const avgCuriosity = movingAverage(existing.avg_curiosity, attempts, input.curiosityScore)
  const avgDifficulty = movingAverage(existing.avg_difficulty, attempts, input.difficulty)

  await supabase
    .from('user_category_stats')
    .update({
      attempts_count: nextAttempts,
      avg_freeze_resilience: avgFreeze,
      avg_interestingness: avgInterestingness,
      avg_curiosity: avgCuriosity,
      avg_difficulty: avgDifficulty,
      last_attempt_at: new Date().toISOString(),
      avoided_streak: 0,
    })
    .eq('id', existing.id)
}

function movingAverage(currentAvg: number | null, currentCount: number, nextValue: number): number {
  const avg = Number(currentAvg ?? 0)
  if (currentCount <= 0) return nextValue
  return Math.round(((avg * currentCount + nextValue) / (currentCount + 1)) * 100) / 100
}
