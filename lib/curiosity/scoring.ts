import type { ComputedMetrics, Prompt } from '@/types'

export interface CuriosityScoringResult {
  interestingness_score: number
  explanation_score: number
  connection_score: number
  analogy_score: number
  opinion_score: number
  example_score: number
  curiosity_score: number
  one_interesting_thing: string
  missed_opportunity: string
  stronger_reframe: string
  suggested_related_topic: string
  mock?: boolean
}

export async function scoreCuriosityFromTranscript(input: {
  transcript: string
  prompt: Prompt
  metrics: ComputedMetrics
}): Promise<CuriosityScoringResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('sk-mock')) {
    return { ...heuristicCuriosityScore(input), mock: true }
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
    })
    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('empty curiosity response')
    const parsed = normalizeCuriosityResult(JSON.parse(raw))
    return { ...parsed, mock: false }
  } catch {
    return { ...heuristicCuriosityScore(input), mock: true }
  }
}

export function heuristicCuriosityScore(input: {
  transcript: string
  prompt: Prompt
  metrics: ComputedMetrics
}): CuriosityScoringResult {
  const text = input.transcript.toLowerCase()
  const wc = input.metrics.word_count
  const hasConnector = /\btherefore|because|however|while|although|so\b/.test(text)
  const hasExample = /\bfor example|for instance|such as|imagine\b/.test(text)
  const hasOpinion = /\bi think|i believe|in my view|my take\b/.test(text)
  const hasAnalogy = /\blike a|as if|it'?s like\b/.test(text)
  const hasModern = /\btoday|modern|current|now\b/.test(text)

  const explanation = clamp(4 + Math.min(4, wc / 35) + (hasConnector ? 1 : 0))
  const interesting = clamp(4 + (hasExample ? 1 : 0) + (hasModern ? 1 : 0) + Math.min(3, wc / 55))
  const connection = clamp(4 + (hasModern ? 2 : 0) + (hasConnector ? 1 : 0))
  const analogy = clamp(3 + (hasAnalogy ? 4 : 0) + (hasExample ? 1 : 0))
  const opinion = clamp(3 + (hasOpinion ? 4 : 0) + (hasConnector ? 1 : 0))
  const example = clamp(3 + (hasExample ? 4 : 0) + Math.min(2, wc / 80))
  const curiosity = clamp(
    interesting * 0.22 +
      explanation * 0.2 +
      connection * 0.18 +
      analogy * 0.12 +
      opinion * 0.12 +
      example * 0.16
  )

  return {
    interestingness_score: interesting,
    explanation_score: explanation,
    connection_score: connection,
    analogy_score: analogy,
    opinion_score: opinion,
    example_score: example,
    curiosity_score: curiosity,
    one_interesting_thing: 'You stayed on topic and added enough substance to keep the idea moving.',
    missed_opportunity: 'Push one stronger modern connection or concrete example earlier.',
    stronger_reframe: `Frame "${input.prompt.topic}" as a tension: why it matters now vs what people overlook.`,
    suggested_related_topic: `A related angle: unexpected tradeoffs in ${input.prompt.topic}.`,
  }
}

function buildPrompt(input: { transcript: string; prompt: Prompt; metrics: ComputedMetrics }): string {
  return `Score this 60-second speaking response for curiosity and conversational quality.
Topic: ${input.prompt.topic}
Prompt: ${input.prompt.prompt_text}
Transcript: ${input.transcript}
Word count: ${input.metrics.word_count}
WPM: ${input.metrics.words_per_minute}

Return strict JSON only:
{
  "interestingness_score": 1-10,
  "explanation_score": 1-10,
  "connection_score": 1-10,
  "analogy_score": 1-10,
  "opinion_score": 1-10,
  "example_score": 1-10,
  "curiosity_score": 1-10,
  "one_interesting_thing": "string",
  "missed_opportunity": "string",
  "stronger_reframe": "string",
  "suggested_related_topic": "string"
}`
}

function normalizeCuriosityResult(raw: unknown): CuriosityScoringResult {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    interestingness_score: clampNum(r.interestingness_score),
    explanation_score: clampNum(r.explanation_score),
    connection_score: clampNum(r.connection_score),
    analogy_score: clampNum(r.analogy_score),
    opinion_score: clampNum(r.opinion_score),
    example_score: clampNum(r.example_score),
    curiosity_score: clampNum(r.curiosity_score),
    one_interesting_thing: asText(r.one_interesting_thing, 'You kept the response moving with clear points.'),
    missed_opportunity: asText(r.missed_opportunity, 'Add one stronger concrete detail next time.'),
    stronger_reframe: asText(r.stronger_reframe, 'Reframe with a sharper modern-life hook.'),
    suggested_related_topic: asText(r.suggested_related_topic, 'Explore a related contrasting topic.'),
  }
}

function asText(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : fallback
}

function clampNum(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 5
  return clamp(n)
}

function clamp(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)))
}
