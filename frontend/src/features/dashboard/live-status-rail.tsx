import { useEffect, useMemo, useState } from 'react'

import { getHealthChipClass } from './ui-utils'
import type { DashboardHealthState } from './types'

type LiveStatusRailProps = {
  alertsLive: boolean
  alertsError: boolean
  alertsLastEventAt: Date | null
  headlinesLive: boolean
  headlinesError: boolean
  headlinesLastEventAt: Date | null
  metricsError: boolean
  metricsFailedSymbols: string[]
  pricesError: boolean
  lastPriceUpdate: Date | null
  lastMetricUpdate: Date | null
}

function toClock(value: Date | null): string {
  if (!value) {
    return 'n/a'
  }
  return value.toLocaleTimeString([], { hour12: false })
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no'
}

function ageSec(value: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - value) / 1000))
}

function computeHealthState({
  errors,
  hasPartialMetrics,
  streamsLive,
  healthAgeSec,
}: {
  errors: number
  hasPartialMetrics: boolean
  streamsLive: boolean
  healthAgeSec: number | null
}): DashboardHealthState {
  if (healthAgeSec === null || healthAgeSec > 300) {
    return 'stale'
  }
  if (errors === 0 && !hasPartialMetrics && streamsLive && healthAgeSec <= 90) {
    return 'live'
  }
  if (errors >= 2 || (!streamsLive && healthAgeSec > 180)) {
    return 'stale'
  }
  return 'degraded'
}

export function LiveStatusRail({
  alertsLive,
  alertsError,
  alertsLastEventAt,
  headlinesLive,
  headlinesError,
  headlinesLastEventAt,
  metricsError,
  metricsFailedSymbols,
  pricesError,
  lastPriceUpdate,
  lastMetricUpdate,
}: LiveStatusRailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  const healthAgeSec = useMemo(() => {
    const candidates = [
      lastPriceUpdate?.getTime() ?? 0,
      lastMetricUpdate?.getTime() ?? 0,
      alertsLastEventAt?.getTime() ?? 0,
      headlinesLastEventAt?.getTime() ?? 0,
    ].filter((value) => value > 0)

    if (candidates.length === 0) {
      return null
    }

    return ageSec(Math.max(...candidates), nowMs)
  }, [alertsLastEventAt, headlinesLastEventAt, lastMetricUpdate, lastPriceUpdate, nowMs])

  const healthState = computeHealthState({
    errors: [pricesError, metricsError, alertsError, headlinesError].filter(Boolean).length,
    hasPartialMetrics: metricsFailedSymbols.length > 0,
    streamsLive: alertsLive && headlinesLive,
    healthAgeSec,
  })

  return (
    <section className="dashboard-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="dashboard-heading">Live Status</h2>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getHealthChipClass(healthState)}`}>
          {healthState}
        </span>
      </header>

      <ul className="dashboard-muted space-y-2 text-sm">
        <li className="flex items-center justify-between">
          <span>Health age</span>
          <strong className="font-medium text-[color:var(--text)]">{healthAgeSec === null ? 'n/a' : `${healthAgeSec}s`}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Alerts stream</span>
          <strong className="font-medium text-[color:var(--text)]">{yesNo(alertsLive)}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Headlines stream</span>
          <strong className="font-medium text-[color:var(--text)]">{yesNo(headlinesLive)}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Price refresh</span>
          <strong className="font-medium text-[color:var(--text)]">{toClock(lastPriceUpdate)}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Metrics refresh</span>
          <strong className="font-medium text-[color:var(--text)]">{toClock(lastMetricUpdate)}</strong>
        </li>
        <li className="flex items-center justify-between">
          <span>Metric fallbacks</span>
          <strong className="font-medium text-[color:var(--text)]">
            {metricsFailedSymbols.length === 0 ? 'none' : metricsFailedSymbols.join(', ')}
          </strong>
        </li>
      </ul>
    </section>
  )
}
