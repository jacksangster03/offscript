import { describe, expect, it } from 'vitest'
import { generateTopicPromptsFallback } from './generate'

describe('topic prompt fallback generator', () => {
  it('returns all required variants', () => {
    const out = generateTopicPromptsFallback({
      title: 'The Great Molasses Flood',
      summary:
        'In 1919, a storage tank burst in Boston and caused a destructive wave, later linked to industrial safety reforms.',
      categoryName: 'Weird, Obscure & Random',
      difficulty: 2,
      sourceLabel: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Great_Molasses_Flood',
    })

    expect(out.length).toBe(8)
    const variants = new Set(out.map((p) => p.prompt_variant))
    expect(variants.has('explain')).toBe(true)
    expect(variants.has('make_interesting')).toBe(true)
    expect(variants.has('connect_to_modern_life')).toBe(true)
    expect(variants.has('argue_importance')).toBe(true)
    expect(variants.has('debate_both_sides')).toBe(true)
    expect(variants.has('analogy')).toBe(true)
    expect(variants.has('story')).toBe(true)
    expect(variants.has('hot_take')).toBe(true)
  })

  it('ensures context bullets are concise and present', () => {
    const out = generateTopicPromptsFallback({
      title: 'QWERTY',
      summary: 'QWERTY became dominant and remains standard despite alternatives and switching costs.',
      categoryName: 'Objects, Inventions & Everyday Things',
    })
    for (const row of out) {
      expect(row.context_bullets.length).toBeGreaterThanOrEqual(3)
      expect(row.context_bullets.length).toBeLessThanOrEqual(4)
    }
  })
})
