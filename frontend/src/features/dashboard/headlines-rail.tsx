import { useEffect, useState } from 'react'

import type { Headline } from '../../lib/types'
import { formatIsoClock } from './ui-utils'

type HeadlinesRailProps = {
  items: Headline[]
  isLoading: boolean
  isError: boolean
  errorMessage: string | null
}

function ageSec(value: string, nowMs: number): number | null {
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) {
    return null
  }
  return Math.max(0, Math.floor((nowMs - ts) / 1000))
}

function freshnessClass(age: number | null): string {
  if (age === null) {
    return 'bg-[color:var(--surface-soft)] text-[color:var(--text-muted)]'
  }
  if (age <= 900) {
    return 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
  }
  return 'bg-amber-50 text-[color:var(--warn)]'
}

function sentimentLabel(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return value.toFixed(3)
}

export function HeadlinesRail({ items, isLoading, isError, errorMessage }: HeadlinesRailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <section className="dashboard-card">
      <header className="mb-3">
        <h2 className="dashboard-heading">Headlines</h2>
        <p className="dashboard-muted text-xs">Source, freshness and sentiment</p>
      </header>

      {isLoading && <p className="dashboard-muted text-sm">Loading headlines...</p>}
      {isError && <p className="text-sm text-[color:var(--danger)]">Failed to load headlines: {errorMessage ?? 'unknown error'}</p>}
      {!isLoading && !isError && items.length === 0 && <p className="dashboard-muted text-sm">No headlines in current window.</p>}

      {!isLoading && !isError && items.length > 0 && (
        <ul className="space-y-2">
          {items.slice(0, 8).map((headline) => {
            const age = ageSec(headline.time, nowMs)
            return (
              <li key={`${headline.time}|${headline.url ?? headline.title}`} className="dashboard-subcard px-3 py-2">
                <p className="truncate text-sm font-medium text-[color:var(--text)]">{headline.title}</p>
                <div className="dashboard-muted mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span>{headline.source ?? 'unknown'}</span>
                  <span>{formatIsoClock(headline.time)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${freshnessClass(age)}`}>
                    {age === null ? 'age n/a' : `${age}s`}
                  </span>
                  <span className="rounded-full bg-[color:var(--surface-soft)] px-2 py-0.5 text-[color:var(--text-muted)]">
                    sentiment {sentimentLabel(headline.sentiment)}
                  </span>
                  {headline.url && (
                    <a className="text-[color:var(--accent)] underline-offset-2 hover:underline" href={headline.url} rel="noreferrer noopener" target="_blank">
                      source
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
