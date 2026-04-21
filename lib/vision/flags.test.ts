import { afterEach, describe, expect, it } from 'vitest'
import { isVisualTelemetryEnabled } from './flags'

const ORIGINAL = process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY

describe('isVisualTelemetryEnabled', () => {
  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY
    } else {
      process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY = ORIGINAL
    }
  })

  it('returns false by default', () => {
    delete process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY
    expect(isVisualTelemetryEnabled()).toBe(false)
  })

  it('returns true only when explicitly set to true', () => {
    process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY = 'true'
    expect(isVisualTelemetryEnabled()).toBe(true)

    process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY = '1'
    expect(isVisualTelemetryEnabled()).toBe(false)
  })
})
