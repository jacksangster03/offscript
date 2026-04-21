import { describe, expect, it } from 'vitest'
import { buildKeyMomentSummary, mapTimelineEvents } from './timeline'
import type { FreezeEpisode, SpeechEvent } from '../../types'

describe('timeline mapping', () => {
  it('orders speech events and maps tone labels', () => {
    const events: SpeechEvent[] = [
      { event_type: 'recovery', start_ms: 7000, end_ms: 7600, severity: 0.3 },
      { event_type: 'freeze', start_ms: 4000, end_ms: 7000, severity: 0.8 },
      { event_type: 'hesitation_cluster', start_ms: 3000, end_ms: 3600, severity: 0.4 },
    ]
    const mapped = mapTimelineEvents(events)
    expect(mapped.map((event) => event.event_type)).toEqual([
      'hesitation_cluster',
      'freeze',
      'recovery',
    ])
    expect(mapped[1].tone).toBe('negative')
    expect(mapped[2].tone).toBe('positive')
  })

  it('builds key moment copy from freeze + recovery evidence', () => {
    const events: SpeechEvent[] = [
      {
        event_type: 'freeze',
        start_ms: 18000,
        end_ms: 23000,
        severity: 0.9,
        metadata: { restart_attempts: 2 },
      },
      {
        event_type: 'bridge_phrase_recovery',
        start_ms: 23200,
        end_ms: 24100,
        severity: 0.2,
      },
    ]
    const episodes: FreezeEpisode[] = [
      {
        start_ms: 18100,
        end_ms: 22900,
        recovered: true,
        speech_signals: {},
        visual_signals: {},
        recovery_phrase_used: true,
      },
    ]

    const summary = buildKeyMomentSummary(events, episodes)
    expect(summary).toContain('18s')
    expect(summary).toContain('restart attempt')
    expect(summary).toContain('bridge-phrase recovery')
  })
})
