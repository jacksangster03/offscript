export interface ChallengeTemplate {
  key: string
  title: string
  total_days: number
  mode: string
  description: string
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  { key: '7_anything', title: '7-Day Speak About Anything', total_days: 7, mode: 'deep_random', description: 'Daily unfamiliar topics across domains.' },
  { key: '14_throw_off', title: '14-Day Become Hard to Throw Off', total_days: 14, mode: 'challenge_day', description: 'Progressive resilience under uncertainty.' },
  { key: '7_weird_world', title: '7-Day Weird World', total_days: 7, mode: 'rabbit_hole', description: 'Unexpected topics and curiosity jumps.' },
  { key: '7_weak_domain', title: '7-Day Weak Domain Builder', total_days: 7, mode: 'cross_domain', description: 'Focus reps on underexplored categories.' },
  { key: '14_dinner_table', title: '14-Day Dinner Table Interesting', total_days: 14, mode: 'dinner_table', description: 'Conversationally compelling explainers.' },
  { key: '7_connector', title: '7-Day Cross-Domain Connector', total_days: 7, mode: 'cross_domain', description: 'Build high-quality cross-domain links.' },
]

export function getTemplateByKey(key: string): ChallengeTemplate | null {
  return CHALLENGE_TEMPLATES.find((t) => t.key === key) ?? null
}
