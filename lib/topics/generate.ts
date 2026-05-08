import type { Difficulty, TopicPromptVariant } from '@/types'

export interface TopicPromptDraft {
  prompt_variant: TopicPromptVariant
  prompt_text: string
  context_bullets: string[]
  speaking_angle: string
  retry_angle: string
  difficulty: Difficulty
  source_label?: string
  source_url?: string
}

interface GenerateInput {
  title: string
  summary: string
  categoryName: string
  difficulty?: Difficulty
  sourceLabel?: string
  sourceUrl?: string
}

const VARIANTS: TopicPromptVariant[] = [
  'explain',
  'make_interesting',
  'connect_to_modern_life',
  'argue_importance',
  'debate_both_sides',
  'analogy',
  'story',
  'hot_take',
]

export async function generateTopicPrompts(input: GenerateInput): Promise<TopicPromptDraft[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.startsWith('sk-mock')) {
    return generateTopicPromptsFallback(input)
  }

  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
      max_tokens: 1200,
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('empty AI response')
    const parsed = JSON.parse(raw) as { prompts?: unknown[] }
    const prompts = normalizePromptArray(parsed.prompts, input)
    if (!prompts.length) throw new Error('invalid prompt output')
    return prompts
  } catch {
    return generateTopicPromptsFallback(input)
  }
}

export function generateTopicPromptsFallback(input: GenerateInput): TopicPromptDraft[] {
  const baseBullets = summaryToBullets(input.summary)
  const difficulty = input.difficulty ?? inferDifficulty(input.summary)
  const sourceLabel = input.sourceLabel ?? 'Wikipedia'

  const templates: Record<TopicPromptVariant, { prompt: string; angle: string; retry: string }> = {
    explain: {
      prompt: `Explain ${input.title} clearly to someone hearing it for the first time.`,
      angle: 'Focus on what it is, why it mattered, and one key takeaway.',
      retry: 'Open with one sentence definition, then one concrete consequence.',
    },
    make_interesting: {
      prompt: `Make ${input.title} sound genuinely interesting in one minute.`,
      angle: 'Lead with tension, surprise, or hidden stakes.',
      retry: 'Start from the most unexpected detail before explaining the basics.',
    },
    connect_to_modern_life: {
      prompt: `Connect ${input.title} to modern life and why people should care.`,
      angle: 'Translate the topic into present-day relevance.',
      retry: 'Use one current example people can relate to quickly.',
    },
    argue_importance: {
      prompt: `Argue why ${input.title} is more important than most people think.`,
      angle: 'Take a clear position and defend it with practical impact.',
      retry: 'State your claim early and support it with two concise reasons.',
    },
    debate_both_sides: {
      prompt: `Debate both sides: was ${input.title} mostly beneficial or mostly harmful?`,
      angle: 'Show nuance while still arriving at a conclusion.',
      retry: 'Give one strongest point per side, then choose.',
    },
    analogy: {
      prompt: `Use an analogy to make ${input.title} easy to grasp.`,
      angle: 'Map abstract parts to familiar everyday systems.',
      retry: 'Try a different analogy that feels more concrete.',
    },
    story: {
      prompt: `Turn ${input.title} into a short story someone would remember.`,
      angle: 'Use sequence: setup, turning point, consequence.',
      retry: 'Start with scene-setting instead of definitions.',
    },
    hot_take: {
      prompt: `Give a defensible hot take about ${input.title}.`,
      angle: 'Be provocative but logically grounded.',
      retry: 'Make the take sharper and back it with one clear example.',
    },
  }

  return VARIANTS.map((variant) => ({
    prompt_variant: variant,
    prompt_text: templates[variant].prompt,
    context_bullets: baseBullets,
    speaking_angle: templates[variant].angle,
    retry_angle: templates[variant].retry,
    difficulty,
    source_label: sourceLabel,
    source_url: input.sourceUrl,
  }))
}

function buildPrompt(input: GenerateInput): string {
  return `Create exactly 8 speaking prompts as strict JSON for OffScript.
Topic: ${input.title}
Category: ${input.categoryName}
Summary: ${input.summary}

Rules:
- variants must be: explain, make_interesting, connect_to_modern_life, argue_importance, debate_both_sides, analogy, story, hot_take
- each prompt must include: prompt_variant, prompt_text, context_bullets(3-4), speaking_angle, retry_angle, difficulty(1-4)
- context must be concise and speakable for a beginner
- no markdown

Output schema:
{"prompts":[{...8 items...}]}
`
}

function normalizePromptArray(raw: unknown[] | undefined, input: GenerateInput): TopicPromptDraft[] {
  if (!Array.isArray(raw)) return []
  const fallback = generateTopicPromptsFallback(input)
  const byVariant = new Map(fallback.map((item) => [item.prompt_variant, item]))
  const out: TopicPromptDraft[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Record<string, unknown>
    const variant = asVariant(candidate.prompt_variant)
    if (!variant) continue
    const base = byVariant.get(variant)
    if (!base) continue
    out.push({
      prompt_variant: variant,
      prompt_text: asText(candidate.prompt_text, base.prompt_text),
      context_bullets: normalizeBullets(candidate.context_bullets, base.context_bullets),
      speaking_angle: asText(candidate.speaking_angle, base.speaking_angle),
      retry_angle: asText(candidate.retry_angle, base.retry_angle),
      difficulty: clampDifficulty(candidate.difficulty, base.difficulty),
      source_label: input.sourceLabel ?? 'Wikipedia',
      source_url: input.sourceUrl,
    })
  }

  if (out.length === 0) return []
  const unique = new Map<TopicPromptVariant, TopicPromptDraft>()
  for (const row of out) unique.set(row.prompt_variant, row)
  for (const [variant, base] of byVariant) {
    if (!unique.has(variant)) unique.set(variant, base)
  }
  return Array.from(unique.values())
}

function summaryToBullets(summary: string): string[] {
  const compact = summary.replace(/\s+/g, ' ').trim()
  if (!compact) return ['This topic has meaningful historical and modern relevance.']
  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean)
  const bullets = sentences.slice(0, 4).map((sentence) => sentence.replace(/\.$/, ''))
  return bullets.length >= 3 ? bullets : [compact.slice(0, 110), 'It has practical implications.', 'There are tradeoffs worth discussing.']
}

function inferDifficulty(summary: string): Difficulty {
  const words = summary.split(/\s+/).filter(Boolean).length
  if (words < 60) return 1
  if (words < 110) return 2
  if (words < 170) return 3
  return 4
}

function normalizeBullets(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const clean = value
    .map((item) => String(item ?? '').trim())
    .filter((item) => item.length > 0)
    .slice(0, 4)
  if (clean.length < 3) return fallback
  return clean
}

function asVariant(value: unknown): TopicPromptVariant | null {
  const normalized = String(value ?? '').trim() as TopicPromptVariant
  return VARIANTS.includes(normalized) ? normalized : null
}

function asText(value: unknown, fallback: string): string {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : fallback
}

function clampDifficulty(value: unknown, fallback: Difficulty): Difficulty {
  const n = Number(value)
  if (n === 1 || n === 2 || n === 3 || n === 4) return n
  return fallback
}
