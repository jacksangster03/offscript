import type { TopicEdge } from '@/types'
import { toCategorySlug } from './taxonomy'

interface TopicLike {
  id: string
  title: string
  summary?: string | null
  difficulty?: number | null
}

export function generateTopicEdges(base: TopicLike, pool: TopicLike[]): TopicEdge[] {
  const edges: TopicEdge[] = []
  for (const candidate of pool) {
    if (!candidate.id || candidate.id === base.id) continue
    const edgeType = classifyEdge(base, candidate)
    const weight = edgeType === 'similar' ? 0.72 : edgeType === 'cross_domain' ? 0.64 : 0.58
    edges.push({
      id: `${base.id}:${candidate.id}:${edgeType}`,
      from_topic_id: base.id,
      to_topic_id: candidate.id,
      edge_type: edgeType,
      weight,
      reason: buildReason(edgeType, base.title, candidate.title),
    })
  }
  return edges.slice(0, 20)
}

export function fallbackRelatedTopics(base: TopicLike, pool: TopicLike[], limit = 6): TopicLike[] {
  const seed = toCategorySlug(base.title)
  return [...pool]
    .filter((topic) => topic.id !== base.id)
    .sort((a, b) => score(base, b, seed) - score(base, a, seed))
    .slice(0, Math.max(1, Math.min(limit, 12)))
}

function classifyEdge(base: TopicLike, other: TopicLike): TopicEdge['edge_type'] {
  const baseText = normalize(`${base.title} ${base.summary ?? ''}`)
  const otherText = normalize(`${other.title} ${other.summary ?? ''}`)
  const shared = tokenOverlap(baseText, otherText)

  if (shared >= 0.22) return 'similar'
  if (Math.abs((base.difficulty ?? 2) - (other.difficulty ?? 2)) >= 2) return 'contrast'
  if (isWeirdPair(baseText, otherText)) return 'weird_link'
  return 'cross_domain'
}

function buildReason(type: TopicEdge['edge_type'], from: string, to: string): string {
  if (type === 'similar') return `Shared themes between "${from}" and "${to}".`
  if (type === 'contrast') return `Contrasting angle between "${from}" and "${to}".`
  if (type === 'weird_link') return `Unexpected link from "${from}" to "${to}".`
  return `Cross-domain jump from "${from}" to "${to}".`
}

function score(base: TopicLike, topic: TopicLike, seed: string): number {
  const a = normalize(`${base.title} ${base.summary ?? ''}`)
  const b = normalize(`${topic.title} ${topic.summary ?? ''}`)
  const overlap = tokenOverlap(a, b)
  const seedHit = normalize(topic.title).includes(seed) ? 0.08 : 0
  const difficultyDelta = Math.abs((base.difficulty ?? 2) - (topic.difficulty ?? 2))
  return overlap * 0.7 + seedHit - difficultyDelta * 0.05
}

function tokenOverlap(a: string, b: string): number {
  const as = new Set(a.split(/\s+/).filter((t) => t.length > 3))
  const bs = new Set(b.split(/\s+/).filter((t) => t.length > 3))
  if (!as.size || !bs.size) return 0
  let inter = 0
  for (const token of as) {
    if (bs.has(token)) inter++
  }
  return inter / Math.max(as.size, bs.size)
}

function isWeirdPair(a: string, b: string): boolean {
  return /\bparadox|myth|meme|weird|obscure|strange\b/.test(a + ' ' + b)
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
