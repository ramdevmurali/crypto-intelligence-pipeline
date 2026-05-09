import { useMemo } from 'react'

import { getAlerts } from '../../lib/api'
import { useLiveListQuery } from '../../lib/hooks/use-live-list-query'
import { subscribeAlertsStream } from '../../lib/sse'
import type { Alert } from '../../lib/types'

type UseAlertsOptions = {
  limit?: number
  interval?: number
}

type UseAlertsResult = {
  items: Alert[]
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

function buildAlertKey(item: Alert): string {
  return `${item.time}|${item.symbol}|${item.window}|${item.direction}`
}

function normalizeAlerts(items: Alert[], limit: number): Alert[] {
  const sorted = [...items].sort((a, b) => parseTime(b.time) - parseTime(a.time))
  const deduped = new Map<string, Alert>()

  for (const item of sorted) {
    const key = buildAlertKey(item)
    const existing = deduped.get(key)
    if (!existing) {
      deduped.set(key, item)
      continue
    }
    if (!existing.summary && item.summary) {
      deduped.set(key, item)
    }
  }

  return Array.from(deduped.values()).slice(0, limit)
}

export function useAlerts(options: UseAlertsOptions = {}): UseAlertsResult {
  const limit = options.limit ?? DEFAULT_LIMIT
  const queryKey = useMemo(() => ['alerts', { limit }] as const, [limit])

  return useLiveListQuery<Alert>({
    queryKey,
    limit,
    interval: options.interval,
    fetchItems: getAlerts,
    subscribe: subscribeAlertsStream,
    normalizeItems: normalizeAlerts,
  })
}
