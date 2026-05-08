import { toCategorySlug, TOP_LEVEL_CATEGORIES } from '@/lib/topics/taxonomy'

export interface WikipediaCandidate {
  title: string
  pageid?: number
  source_url: string
}

export interface WikipediaSummary {
  title: string
  summary: string
  source_url: string
  thumbnail?: string | null
}

interface FetchOptions {
  timeoutMs?: number
  retries?: number
}

interface WikiQueryResponse {
  query?: {
    pages?: Record<string, { title?: string; fullurl?: string; pageid?: number }>
  }
}

interface WikiSummaryResponse {
  title?: string
  extract?: string
  content_urls?: { desktop?: { page?: string } }
  thumbnail?: { source?: string }
}

const DEFAULT_TIMEOUT_MS = 3500
const DEFAULT_RETRIES = 1

export async function fetchRandomWikipediaCandidates(
  categoryHint?: string,
  limit = 10,
  options: FetchOptions = {}
): Promise<WikipediaCandidate[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? DEFAULT_RETRIES
  const safeLimit = Math.max(1, Math.min(limit, 30))

  const fallbackCategory = TOP_LEVEL_CATEGORIES[Math.floor(Math.random() * TOP_LEVEL_CATEGORIES.length)]
  const seed = categoryHint ? toCategorySlug(categoryHint) : fallbackCategory.slug
  const url = new URL('https://en.wikipedia.org/w/api.php')
  url.searchParams.set('action', 'query')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrnamespace', '0')
  url.searchParams.set('gsrsearch', `${seed} topic`)
  url.searchParams.set('gsrlimit', String(safeLimit))
  url.searchParams.set('prop', 'info')
  url.searchParams.set('inprop', 'url')

  const json = await fetchJsonWithTimeout<WikiQueryResponse>(url.toString(), timeoutMs, retries)
  const pages = Object.values(json?.query?.pages ?? {})
  return pages
    .filter((page) => page.title && page.fullurl)
    .map((page) => ({
      title: page.title as string,
      pageid: page.pageid,
      source_url: page.fullurl as string,
    }))
}

export async function fetchWikipediaSummary(
  title: string,
  options: FetchOptions = {}
): Promise<WikipediaSummary | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retries = options.retries ?? DEFAULT_RETRIES
  const encoded = encodeURIComponent(title)
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`
  const json = await fetchJsonWithTimeout<WikiSummaryResponse>(url, timeoutMs, retries)
  if (!json?.title || !json?.extract) return null
  return {
    title: String(json.title),
    summary: String(json.extract),
    source_url: String(json.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`),
    thumbnail: json.thumbnail?.source ? String(json.thumbnail.source) : null,
  }
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  retries: number
): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()) as T
    } catch {
      if (attempt === retries) return null
    } finally {
      clearTimeout(timer)
    }
  }
  return null
}
