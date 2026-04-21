import { describe, expect, it } from 'vitest'
import { analyzeVisualSteadiness } from './analyze'
import type { VisionFrameSample } from '../../types'

const DURATION_MS = 60000

describe('analyzeVisualSteadiness', () => {
  it('scores stable centered face strongly', () => {
    const frames = makeFrames(240, {
      face_detected: true,
      centered: true,
      yaw_deg: 2,
      pitch_deg: 1,
      looking_away: false,
    })
    const result = analyzeVisualSteadiness(frames, DURATION_MS)
    expect(result.metrics.face_visible_ratio).toBe(1)
    expect(result.metrics.face_centered_ratio).toBe(1)
    expect(result.metrics.visual_steadiness_score).toBeGreaterThanOrEqual(8)
  })

  it('handles intermittent no-face windows', () => {
    const frames = makeFrames(200, {
      face_detected: true,
      centered: true,
      yaw_deg: 0,
      pitch_deg: 0,
      looking_away: false,
    }).map((frame, index) => {
      if (index % 4 === 0) {
        return {
          ...frame,
          face_detected: false,
          centered: false,
          looking_away: true,
        }
      }
      return frame
    })
    const result = analyzeVisualSteadiness(frames, DURATION_MS)
    expect(result.metrics.face_visible_ratio).toBeLessThan(1)
    expect(result.metrics.face_visible_ratio).toBeGreaterThan(0.7)
  })

  it('penalises high yaw variance and prolonged looking away', () => {
    const frames = makeFrames(220, {
      face_detected: true,
      centered: false,
      yaw_deg: 0,
      pitch_deg: 0,
      looking_away: false,
    }).map((frame, index) => ({
      ...frame,
      yaw_deg: index % 2 === 0 ? 28 : -26,
      looking_away: true,
    }))
    const result = analyzeVisualSteadiness(frames, DURATION_MS)
    expect(result.metrics.head_yaw_std).toBeGreaterThan(20)
    expect(result.metrics.looking_away_ms).toBeGreaterThan(30000)
    expect(result.metrics.visual_steadiness_score).toBeLessThanOrEqual(4)
  })
})

function makeFrames(
  count: number,
  base: Omit<VisionFrameSample, 'timestamp_ms'>
): VisionFrameSample[] {
  return Array.from({ length: count }).map((_, index) => ({
    timestamp_ms: index * 250,
    ...base,
  }))
}
