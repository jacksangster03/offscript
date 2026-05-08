import { describe, expect, it } from 'vitest'
import { fallbackRelatedTopics, generateTopicEdges } from './trails'

describe('topic trails', () => {
  const base = { id: 'a', title: 'Great Molasses Flood', summary: 'Industrial disaster and accountability', difficulty: 2 }
  const pool = [
    { id: 'b', title: 'Triangle Shirtwaist Factory Fire', summary: 'Workplace safety reforms', difficulty: 2 },
    { id: 'c', title: 'QWERTY Keyboard', summary: 'Standards and lock-in effects', difficulty: 1 },
    { id: 'd', title: 'Nuclear Deterrence', summary: 'Strategy and risk under uncertainty', difficulty: 4 },
  ]

  it('builds deterministic edge set', () => {
    const edges = generateTopicEdges(base, pool)
    expect(edges.length).toBeGreaterThan(0)
    expect(edges[0].from_topic_id).toBe('a')
  })

  it('returns fallback related topics', () => {
    const related = fallbackRelatedTopics(base, pool, 2)
    expect(related.length).toBe(2)
    expect(related[0].id).not.toBe('a')
  })
})
