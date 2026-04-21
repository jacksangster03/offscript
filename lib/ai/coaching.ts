import type { CoachingResult, ComputedMetrics, HybridAnalysisResult, Prompt } from '@/types'

const MOCK_COACHING: CoachingResult = {
  clarity_score: 7,
  structure_score: 6,
  composure_score: 7,
  freeze_resilience_score: 6,
  strength_text:
    'You began with a concrete position and returned to it at the end, which gives your response a clear arc even under pressure.',
  priority_fix_text:
    'After your 4-second pause you stopped rather than bridging. Try: "Let me come at this from a different angle" — it keeps you moving.',
  rescue_phrase: '"The key tension here is…"',
  retry_instruction:
    'On the retry, open with a single clear sentence that takes a position. Do not explain what you are about to say — just say it.',
  mock: true,
}

// Structured coaching prompt
function buildCoachingPrompt(
  transcript: string,
  metrics: ComputedMetrics,
  prompt: Prompt,
  hybrid?: HybridAnalysisResult
): string {
  const silenceSec = (metrics.total_silence_ms / 1000).toFixed(1)
  const longestPauseSec = (metrics.longest_pause_ms / 1000).toFixed(1)
  const firstSentenceSec = (metrics.time_to_first_sentence_ms / 1000).toFixed(1)

  const hybridSection = hybrid
    ? `
HYBRID FREEZE ANALYSIS:
- Speech events detected: ${hybrid.speech_events.length}
- Freeze episodes detected: ${hybrid.freeze_episodes.length}
- Restart count: ${hybrid.feature_vector.restart_count}
- Repeated starts: ${hybrid.feature_vector.repeated_token_count}
- Hesitation clusters: ${hybrid.feature_vector.filler_clusters}
- Bridge phrase recoveries: ${hybrid.feature_vector.bridge_phrase_count}
- Pause count >= 2s: ${hybrid.feature_vector.pause_count_2000ms}
- Trailing off at end: ${hybrid.feature_vector.trailing_off_flag ? 'yes' : 'no'}
- Notable events (JSON): ${JSON.stringify(hybrid.speech_events.slice(0, 8))}
`
    : ''

  return `You are an expert speaking coach evaluating a live unscripted response. Be specific, honest, and non-shaming.

PROMPT GIVEN TO SPEAKER:
Topic: ${prompt.topic}
Question: "${prompt.prompt_text}"
Context bullets: ${prompt.context_bullets.join(' | ')}

TRANSCRIPT:
"${transcript}"

COMPUTED METRICS:
- Time to first sentence: ${firstSentenceSec}s
- Longest pause: ${longestPauseSec}s
- Total silence: ${silenceSec}s
- Words per minute: ${metrics.words_per_minute}
- Filler words: ${metrics.filler_count} (${metrics.filler_per_minute}/min)
- Recovery moments (long pause then resumed): ${metrics.recovery_count}
- Total word count: ${metrics.word_count}
${hybridSection}

SCORING RUBRIC:
- clarity_score (1–10): directness of opening, relevance to prompt, understandable language
- structure_score (1–10): logical flow, whether speaker signposted or organised ideas at all
- composure_score (1–10): controlled delivery, absence of spiral, coherent completion despite uncertainty
- freeze_resilience_score (1–10): how quickly speaker started, how they handled pauses, whether they recovered and continued, whether they completed the response meaningfully

KEY PRINCIPLE: The goal is not to sound perfect. The goal is to keep going when you do not know exactly what to say. Reward continuation, recovery, and structural attempts over polish and slickness.

FEEDBACK RULES:
- strength_text: one specific, concrete strength. Reference what the speaker actually said or did. No generic praise.
- priority_fix_text: one specific, actionable fix. Reference the actual moment or pattern. Quantify if possible ("after your 5-second pause", "your third sentence"). No vague advice.
- rescue_phrase: one short phrase the speaker can use next time they freeze. Must be conversational and immediately usable. Examples: "Let me approach this from another angle." / "The key issue here is…" / "One way to think about this is…"
- retry_instruction: one sentence telling them what to do differently on the retry. Specific and directive.

Respond with ONLY valid JSON, no markdown:
{
  "clarity_score": <1-10>,
  "structure_score": <1-10>,
  "composure_score": <1-10>,
  "freeze_resilience_score": <1-10>,
  "strength_text": "<specific strength>",
  "priority_fix_text": "<specific fix with reference to actual moment>",
  "rescue_phrase": "<short usable phrase>",
  "retry_instruction": "<one directive sentence>"
}`
}

export async function generateCoaching(
  transcript: string,
  metrics: ComputedMetrics,
  prompt: Prompt,
  hybrid?: HybridAnalysisResult
): Promise<CoachingResult> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey || apiKey.startsWith('sk-mock')) {
    return { ...MOCK_COACHING, mock: true }
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: buildCoachingPrompt(transcript, metrics, prompt, hybrid),
        },
      ],
      temperature: 0.4,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Empty coaching response')

    const parsed = JSON.parse(raw) as CoachingResult

    // Validate required fields
    const required = [
      'clarity_score', 'structure_score', 'composure_score', 'freeze_resilience_score',
      'strength_text', 'priority_fix_text', 'rescue_phrase', 'retry_instruction',
    ]
    for (const field of required) {
      if (!(field in parsed)) throw new Error(`Missing field: ${field}`)
    }

    // Clamp scores
    parsed.clarity_score = clamp(parsed.clarity_score, 1, 10)
    parsed.structure_score = clamp(parsed.structure_score, 1, 10)
    parsed.composure_score = clamp(parsed.composure_score, 1, 10)
    parsed.freeze_resilience_score = clamp(parsed.freeze_resilience_score, 1, 10)

    return { ...parsed, mock: false }
  } catch (err) {
    console.error('Coaching generation failed, using mock:', err)
    return { ...MOCK_COACHING, mock: true }
  }
}

export async function generateRetryAngle(
  originalPrompt: Prompt,
  previousTranscript: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('sk-mock')) {
    return originalPrompt.retry_angle
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Original prompt: "${originalPrompt.prompt_text}"
Previous response (partial): "${previousTranscript.slice(0, 200)}"
The speaker struggled. Provide a single reframed angle on the same topic that is slightly different and may be easier to start from. One sentence, directive, no intro. Just the reframed prompt.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    })

    return response.choices[0]?.message?.content ?? originalPrompt.retry_angle
  } catch {
    return originalPrompt.retry_angle
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}
