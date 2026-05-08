import type { Difficulty, Prompt, TopicPromptVariant } from '@/types'

export interface FallbackTopicPrompt {
  id: string
  topic_id: string
  title: string
  category_name: string
  difficulty: Difficulty
  prompt_variant: TopicPromptVariant
  prompt_text: string
  context_bullets: string[]
  speaking_angle: string
  retry_angle: string
  source_label: string
  source_url: string
}

export const FALLBACK_TOPIC_PROMPTS: FallbackTopicPrompt[] = [
  {
    id: 'topic-great-molasses-flood-explain',
    topic_id: 'topic-great-molasses-flood',
    title: 'The Great Molasses Flood',
    category_name: 'Weird, Obscure & Random',
    difficulty: 2,
    prompt_variant: 'make_interesting',
    prompt_text: 'Make this strange disaster sound genuinely fascinating in one minute.',
    context_bullets: [
      'In 1919, a large molasses storage tank burst in Boston.',
      'The disaster became associated with industrial safety and corporate responsibility.',
      'It is remembered because something ordinary became unexpectedly dangerous.',
    ],
    speaking_angle: 'Explain how ordinary infrastructure can hide dramatic risks.',
    retry_angle: 'Retell it as a warning story for modern city systems.',
    source_label: 'Wikipedia',
    source_url: 'https://en.wikipedia.org/wiki/Great_Molasses_Flood',
  },
  {
    id: 'topic-haber-bosch-modern-life',
    topic_id: 'topic-haber-bosch-process',
    title: 'Haber-Bosch Process',
    category_name: 'Science',
    difficulty: 3,
    prompt_variant: 'connect_to_modern_life',
    prompt_text: 'Explain why this chemical process quietly shaped modern civilization.',
    context_bullets: [
      'It converts nitrogen from the air into ammonia for fertilizer.',
      'It enabled large-scale food production in the 20th century.',
      'It also links to emissions and long-term sustainability challenges.',
    ],
    speaking_angle: 'Balance benefits and hidden tradeoffs in plain language.',
    retry_angle: 'Frame it as “the invention behind your dinner plate.”',
    source_label: 'Wikipedia',
    source_url: 'https://en.wikipedia.org/wiki/Haber_process',
  },
  {
    id: 'topic-qwerty-debate',
    topic_id: 'topic-qwerty-layout',
    title: 'QWERTY Keyboard Layout',
    category_name: 'Objects, Inventions & Everyday Things',
    difficulty: 1,
    prompt_variant: 'debate_both_sides',
    prompt_text: 'Debate whether society should replace QWERTY with better modern layouts.',
    context_bullets: [
      'QWERTY became dominant early and remained standard globally.',
      'Alternative layouts can improve speed or ergonomics for some users.',
      'Switching costs are high because habits, software and workplaces are entrenched.',
    ],
    speaking_angle: 'Argue both efficiency and coordination sides.',
    retry_angle: 'Make a stronger case for one side and defend it clearly.',
    source_label: 'Wikipedia',
    source_url: 'https://en.wikipedia.org/wiki/QWERTY',
  },
]

const LEGACY_CATEGORY_MAP: Record<string, Prompt['category']> = {
  Science: 'science',
  Technology: 'technology',
  'Business & Economics': 'business',
  History: 'history',
  'Culture & Society': 'society',
  'Ethics, Dilemmas & Controversies': 'ethics',
  'Weird, Obscure & Random': 'absurd',
  'Debate Motions': 'debate',
}

export function pickFallbackTopicPrompt(
  mode: string,
  difficulty?: Difficulty,
  categoryName?: string
): FallbackTopicPrompt {
  let pool = FALLBACK_TOPIC_PROMPTS.filter((prompt) => {
    if (difficulty && prompt.difficulty !== difficulty) return false
    if (categoryName && prompt.category_name !== categoryName) return false
    if (mode === 'chaos' && prompt.difficulty < 3) return false
    return true
  })
  if (pool.length === 0) pool = FALLBACK_TOPIC_PROMPTS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function toLegacyPromptShape(topicPrompt: FallbackTopicPrompt): Prompt {
  return {
    id: topicPrompt.id,
    topic: topicPrompt.title,
    category: LEGACY_CATEGORY_MAP[topicPrompt.category_name] ?? 'society',
    difficulty: topicPrompt.difficulty,
    stance_type: 'open',
    prompt_text: topicPrompt.prompt_text,
    context_bullets: topicPrompt.context_bullets.slice(0, 4),
    retry_angle: topicPrompt.retry_angle,
    tags: ['curiosity', topicPrompt.prompt_variant],
    active: true,
    created_at: new Date().toISOString(),
    speaking_angle: topicPrompt.speaking_angle,
    source_label: topicPrompt.source_label,
    source_url: topicPrompt.source_url,
    topic_id: topicPrompt.topic_id,
    topic_prompt_id: topicPrompt.id,
  }
}
