import type { TopicQualityScore } from '@/types'

interface TopicQualityInput {
  title: string
  summary: string
}

const BAD_TITLE_PREFIXES = ['list of ', 'index of ', 'outline of ', 'timeline of ']
const DISAMBIGUATION_HINTS = ['may refer to', 'can refer to', 'disambiguation']
const STUB_HINTS = ['this article is a stub']

export function scoreTopicQuality(input: TopicQualityInput): TopicQualityScore {
  const title = normalize(input.title)
  const summary = normalize(input.summary)

  if (!title || !summary) {
    return rejected('missing_content')
  }
  if (isDisambiguationLike(title, summary)) {
    return rejected('disambiguation_like')
  }
  if (isListLike(title, summary)) {
    return rejected('list_like')
  }
  if (isStubLike(summary)) {
    return rejected('stub_like')
  }

  const speakability = clampScore(
    8 -
      penaltyByLength(summary) -
      penaltyForDenseDates(summary) +
      bonusForConcreteLanguage(summary)
  )

  const weirdness = clampScore(
    4 +
      (hasWeirdTokens(title, summary) ? 2 : 0) +
      (summary.includes('unexpected') ? 1 : 0)
  )

  const conversationValue = clampScore(
    6 +
      (hasContrastSignal(summary) ? 1.5 : 0) +
      (hasHumanStakes(summary) ? 1.5 : 0)
  )

  const quality = clampScore(speakability * 0.45 + conversationValue * 0.35 + weirdness * 0.2)
  const accepted = quality >= 5.5 && speakability >= 5

  return {
    quality_score: round2(quality),
    speakability_score: round2(speakability),
    weirdness_score: round2(weirdness),
    conversation_value_score: round2(conversationValue),
    accepted,
    rejection_reason: accepted ? null : 'low_quality',
  }
}

export function isDisambiguationLike(title: string, summary: string): boolean {
  const t = normalize(title)
  const s = normalize(summary)
  return DISAMBIGUATION_HINTS.some((hint) => s.includes(hint) || t.includes(hint))
}

export function isListLike(title: string, summary: string): boolean {
  const t = normalize(title)
  const s = normalize(summary)
  return BAD_TITLE_PREFIXES.some((prefix) => t.startsWith(prefix)) || s.includes('list of')
}

function isStubLike(summary: string): boolean {
  const s = normalize(summary)
  return STUB_HINTS.some((hint) => s.includes(hint)) || s.length < 120
}

function hasWeirdTokens(title: string, summary: string): boolean {
  const text = `${title} ${summary}`
  return /flood|disaster|myth|meme|paradox|strange|weird|odd/i.test(text)
}

function hasContrastSignal(summary: string): boolean {
  return /\bhowever\b|\bbut\b|\balthough\b|\bon the other hand\b/i.test(summary)
}

function hasHumanStakes(summary: string): boolean {
  return /\brisk\b|\bdebate\b|\bimpact\b|\bsociety\b|\bresponsibility\b|\bethics\b/i.test(summary)
}

function penaltyByLength(summary: string): number {
  const words = summary.split(/\s+/).length
  if (words < 40) return 2
  if (words > 220) return 1.5
  return 0
}

function penaltyForDenseDates(summary: string): number {
  const yearMatches = summary.match(/\b(1[6-9]\d{2}|20\d{2})\b/g) ?? []
  return yearMatches.length >= 6 ? 1 : 0
}

function bonusForConcreteLanguage(summary: string): number {
  return /\b(in \d{4}|in [a-z]+,|in [a-z]+ [a-z]+)\b/i.test(summary) ? 0.8 : 0
}

function normalize(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function rejected(reason: string): TopicQualityScore {
  return {
    quality_score: 1,
    speakability_score: 1,
    weirdness_score: 1,
    conversation_value_score: 1,
    accepted: false,
    rejection_reason: reason,
  }
}
