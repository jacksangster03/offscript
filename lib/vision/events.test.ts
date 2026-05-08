import { describe, expect, it } from 'vitest'
import { deriveVisualEvents } from './events'
import type { VisionFrameSample } from '@/types'

describe('deriveVisualEvents', () => {
  it('detects prolonged face_lost and off_center runs', () => {
    const samples: VisionFrameSample[] = []
    for (let i = 0; i < 50; i++) {
      samples.push({
        timestamp_ms: i * 200,
        face_detected: i < 12 ? false : true,
        centered: i >= 12 && i < 28 ? false : true,
        yaw_deg: i % 2 === 0 ? 8 : -6,
        pitch_deg: 2,
        looking_away: false,
      })
    }
    const events = deriveVisualEvents(samples, 10000)
    expect(events.some((e) => e.event_type === 'face_lost')).toBe(true)
    expect(events.some((e) => e.event_type === 'off_center')).toBe(true)
  })

  it('detects looking_away runs', () => {
    const samples: VisionFrameSample[] = Array.from({ length: 60 }).map((_, i) => ({
      timestamp_ms: i * 200,
      face_detected: true,
      centered: true,
      yaw_deg: i < 20 ? 3 : 28,
      pitch_deg: i < 20 ? 2 : 17,
      looking_away: i >= 20,
    }))
    const events = deriveVisualEvents(samples, 12000)
    expect(events.some((e) => e.event_type === 'looking_away')).toBe(true)
  })
})
