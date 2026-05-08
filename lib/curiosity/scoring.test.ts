import { describe, expect, it } from 'vitest'
import { heuristicCuriosityScore } from './scoring'

describe('curiosity scoring heuristics', () => {
  it('returns clamped 1-10 scores', () => {
    const out = heuristicCuriosityScore({
      transcript:
        'I think this matters today because infrastructure feels invisible until it fails. For example, a hidden system can suddenly create public risk.',
      prompt: {
        id: 'p1',
        topic: 'The Great Molasses Flood',
        category: 'history',
        difficulty: 2,
        stance_type: 'open',
        prompt_text: 'Make this event interesting',
        context_bullets: ['A', 'B', 'C'],
        retry_angle: 'Try another angle',
        tags: [],
        active: true,
        created_at: new Date().toISOString(),
      },
      metrics: {
        filler_count: 0,
        filler_per_minute: 0,
        words_per_minute: 120,
        total_silence_ms: 3000,
        longest_pause_ms: 1200,
        time_to_first_sentence_ms: 800,
        recovery_count: 1,
        speech_duration_ms: 60000,
        word_count: 34,
      },
    })
    expect(out.curiosity_score).toBeGreaterThanOrEqual(1)
    expect(out.curiosity_score).toBeLessThanOrEqual(10)
    expect(out.interestingness_score).toBeGreaterThanOrEqual(1)
    expect(out.example_score).toBeGreaterThanOrEqual(1)
  })
})
