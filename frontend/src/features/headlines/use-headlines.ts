import { useMemo } from 'react'

import { getHeadlines } from '../../lib/api'
import { useLiveListQuery } from '../../lib/hooks/use-live-list-query'
import { subscribeHeadlinesStream } from '../../lib/sse'
import type { Headline } from '../../lib/types'

type UseHeadlinesOptions = {
  limit?: number
  interval?: number
}

type UseHeadlinesResult = {
  items: Headline[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  isLive: boolean
  lastEventAt: Date | null
}

const DEFAULT_LIMIT = 20

function parseTime(value: string): number {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function buildHeadlineKey(item: Headline): string {
  const source = item.source ?? ''
  if (item.url) {
    return `${item.time}|${item.url}|${source}`
  }
  return `${item.time}|${item.title.trim().toLowerCase()}|${source}`
}

function normalizeHeadlines(items: Headline[], limit: number): Headline[] {
  const sorted = [...items].sort((a, b) => parseTime(b.time) - parseTime(a.time))
  const deduped = new Map<string, Headline>()

  for (const item of sorted) {
    const key = buildHeadlineKey(item)
    if (!deduped.has(key)) {
      deduped.set(key, item)
    }
  }

  return Array.from(deduped.values()).slice(0, limit)
}

export function useHeadlines(options: UseHeadlinesOptions = {}): UseHeadlinesResult {
  const limit = options.limit ?? DEFAULT_LIMIT
  const queryKey = useMemo(() => ['headlines', { limit }] as const, [limit])

  return useLiveListQuery<Headline>({
    queryKey,
    limit,
    interval: options.interval,
    fetchItems: getHeadlines,
    subscribe: subscribeHeadlinesStream,
    normalizeItems: normalizeHeadlines,
  })
}
