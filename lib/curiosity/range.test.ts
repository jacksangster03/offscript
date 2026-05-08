import { describe, expect, it } from 'vitest'
import { computeConversationalRangeScore } from './range'

describe('conversational range scoring', () => {
  it('returns bounded scores and category counts', () => {
    const result = computeConversationalRangeScore({
      totalCategories: 40,
      rows: [
        { category_slug: 'science', attempts_count: 6, avg_curiosity: 7.2, avg_interestingness: 6.8, avg_difficulty: 2.8 },
        { category_slug: 'history', attempts_count: 2, avg_curiosity: 5.9, avg_interestingness: 6.1, avg_difficulty: 2.2 },
        { category_slug: 'weird-obscure-and-random', attempts_count: 1, avg_curiosity: 8.1, avg_interestingness: 7.9, avg_difficulty: 2.5 },
      ],
    })
    expect(result.range_score).toBeGreaterThanOrEqual(1)
    expect(result.range_score).toBeLessThanOrEqual(10)
    expect(result.categories_attempted).toBe(3)
    expect(result.strongest_categories.length).toBeGreaterThan(0)
  })
})
