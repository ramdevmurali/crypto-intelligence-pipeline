import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { StreamPayload } from '../types'

type FetchList<T> = (params: { limit?: number }) => Promise<T[]>

type SubscribeList<T> = (options: {
  limit?: number
  interval?: number
  onMessage: (payload: StreamPayload<T>) => void
  onError?: (error: Event) => void
}) => () => void

type UseLiveListQueryOptions<T> = {
  queryKey: QueryKey
  limit: number
  interval?: number
  fetchItems: FetchList<T>
  subscribe: SubscribeList<T>
  normalizeItems: (items: T[], limit: number) => T[]
}

type UseLiveListQueryResult<T> = {
  items: T[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  isLive: boolean
  lastEventAt: Date | null
}

export function useLiveListQuery<T>({
  queryKey,
  limit,
  interval,
  fetchItems,
  subscribe,
  normalizeItems,
}: UseLiveListQueryOptions<T>): UseLiveListQueryResult<T> {
  const queryClient = useQueryClient()
  const [isLive, setIsLive] = useState(false)
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null)

  const query = useQuery<T[], Error>({
    queryKey,
    queryFn: async () => normalizeItems(await fetchItems({ limit }), limit),
  })

  useEffect(() => {
    const unsubscribe = subscribe({
      limit,
      interval,
      onMessage: (payload) => {
        queryClient.setQueryData<T[]>(queryKey, normalizeItems(payload.items, limit))
        setIsLive(true)
        setLastEventAt(new Date())
      },
      onError: () => {
        setIsLive(false)
      },
    })

    return unsubscribe
  }, [fetchItems, interval, limit, normalizeItems, queryClient, queryKey, subscribe])

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      void query.refetch()
    },
    isLive,
    lastEventAt,
  }
}
