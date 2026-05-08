import { describe, expect, it } from 'vitest'
import { isDisambiguationLike, isListLike, scoreTopicQuality } from './quality'

describe('topic quality scoring', () => {
  it('rejects disambiguation-like summaries', () => {
    const out = scoreTopicQuality({
      title: 'Mercury',
      summary: 'Mercury may refer to several different concepts in science and mythology.',
    })
    expect(out.accepted).toBe(false)
    expect(out.rejection_reason).toBe('disambiguation_like')
  })

  it('rejects list-like topics', () => {
    const out = scoreTopicQuality({
      title: 'List of bridges in Europe',
      summary: 'This is a list of major bridges and structures across Europe.',
    })
    expect(out.accepted).toBe(false)
    expect(out.rejection_reason).toBe('list_like')
  })

  it('accepts clear speakable topics', () => {
    const out = scoreTopicQuality({
      title: 'Great Molasses Flood',
      summary:
        'In 1919, a large molasses tank burst in Boston and sent a wave through streets. The event raised questions of industrial safety, public accountability, and how ordinary infrastructure can carry hidden risk.',
    })
    expect(out.accepted).toBe(true)
    expect(out.quality_score).toBeGreaterThanOrEqual(5.5)
  })

  it('utility detectors work as expected', () => {
    expect(isDisambiguationLike('Mercury', 'Mercury may refer to several uses.')).toBe(true)
    expect(isListLike('List of rivers', 'A list of rivers by country.')).toBe(true)
  })
})
