import type { Difficulty } from '@/types'

interface CategoryStatInput {
  category_slug: string
  attempts_count: number
  avg_curiosity: number | null
  avg_difficulty: number | null
}

export interface TopicRecommendation {
  preferred_category_slug: string
  target_difficulty: Difficulty
  reason: string
}

export function recommendNextTopicForUser(
  stats: CategoryStatInput[],
  fallbackCategorySlug = 'weird-obscure-and-random'
): TopicRecommendation {
  if (!stats.length) {
    return {
      preferred_category_slug: fallbackCategorySlug,
      target_difficulty: 2,
      reason: 'Start broad with a curiosity-friendly category.',
    }
  }

  const weakest = [...stats].sort((a, b) => score(a) - score(b))[0]
  const preferred = weakest?.category_slug || fallbackCategorySlug
  const attempts = weakest?.attempts_count ?? 0
  const avgDiff = weakest?.avg_difficulty ?? 2

  let targetDifficulty: Difficulty = 2
  if (attempts > 3 && avgDiff >= 2.5) targetDifficulty = 3
  if (attempts > 8 && avgDiff >= 3.2) targetDifficulty = 4

  return {
    preferred_category_slug: preferred,
    target_difficulty: targetDifficulty,
    reason: attempts === 0
      ? 'This category is underexplored; building range here increases conversational breadth.'
      : 'This is currently a weaker category; a focused rep should improve balance.',
  }
}

function score(row: CategoryStatInput): number {
  return row.attempts_count * 0.35 + (row.avg_curiosity ?? 0) * 0.45 + (row.avg_difficulty ?? 0) * 0.2
}
