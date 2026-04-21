export function isVisualTelemetryEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_VISUAL_TELEMETRY === 'true'
}
