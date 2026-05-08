import type { ConversationalRangeSummary } from '@/types'

export interface RangeInputRow {
  category_slug: string
  attempts_count: number
  avg_curiosity: number | null
  avg_interestingness: number | null
  avg_difficulty: number | null
}

export interface RangeComputationInput {
  rows: RangeInputRow[]
  totalCategories: number
}

export function computeConversationalRangeScore(input: RangeComputationInput): ConversationalRangeSummary {
  const rows = input.rows
  const totalCategories = Math.max(1, input.totalCategories)
  const categoriesAttempted = rows.filter((r) => r.attempts_count > 0).length

  const breadth = score01(categoriesAttempted / totalCategories)
  const counts = rows.map((r) => r.attempts_count).filter((v) => v > 0)
  const balance = counts.length <= 1 ? 0 : 1 - clamp01(stdDev(counts) / (mean(counts) + 1))

  const avgCuriosity = average(rows.map((r) => r.avg_curiosity))
  const avgInterestingness = average(rows.map((r) => r.avg_interestingness))
  const curiosityComposite = clamp01(((avgCuriosity + avgInterestingness) / 2) / 10)

  const avgDifficulty = average(rows.map((r) => r.avg_difficulty))
  const difficultyProgression = clamp01((avgDifficulty - 1) / 3)

  const weakDomainRows = [...rows].sort((a, b) => (a.attempts_count - b.attempts_count)).slice(0, 8)
  const weakDomainCourage = weakDomainRows.length
    ? clamp01(mean(weakDomainRows.map((r) => (r.attempts_count > 0 ? 1 : 0))))
    : 0

  const connectionQuality = clamp01(
    rows.length
      ? mean(rows.map((r) => clamp01(((r.avg_curiosity ?? 0) * 0.6 + (r.avg_interestingness ?? 0) * 0.4) / 10)))
      : 0
  )

  const rangeScoreRaw =
    breadth * 0.25 +
    balance * 0.2 +
    curiosityComposite * 0.2 +
    difficultyProgression * 0.15 +
    weakDomainCourage * 0.1 +
    connectionQuality * 0.1

  const strongest = [...rows]
    .sort((a, b) => (scoreRow(b) - scoreRow(a)))
    .slice(0, 5)
    .map((r) => r.category_slug)
  const weakest = [...rows]
    .sort((a, b) => (scoreRow(a) - scoreRow(b)))
    .slice(0, 5)
    .map((r) => r.category_slug)
  const avoided = [...rows]
    .sort((a, b) => (a.attempts_count - b.attempts_count))
    .slice(0, 5)
    .map((r) => r.category_slug)

  return {
    range_score: toScore10(rangeScoreRaw),
    categories_attempted: categoriesAttempted,
    category_breadth_score: toScore10(breadth),
    category_balance_score: toScore10(balance),
    average_curiosity_score: toScore10(curiosityComposite),
    difficulty_progression_score: toScore10(difficultyProgression),
    weak_domain_courage_score: toScore10(weakDomainCourage),
    cross_domain_connection_score: toScore10(connectionQuality),
    strongest_categories: strongest,
    weakest_categories: weakest,
    most_avoided_categories: avoided,
  }
}

function scoreRow(row: RangeInputRow): number {
  return (row.avg_curiosity ?? 0) * 0.5 + (row.avg_interestingness ?? 0) * 0.3 + row.attempts_count * 0.2
}

function toScore10(v: number): number {
  return Math.max(1, Math.min(10, Math.round(v * 9 + 1)))
}

function score01(v: number): number {
  return clamp01(v)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function average(values: Array<number | null>): number {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  return valid.length ? mean(valid) : 0
}
