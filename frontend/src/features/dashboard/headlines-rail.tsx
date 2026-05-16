import { useEffect, useState } from 'react'

import type { Headline } from '../../lib/types'

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

function relativeAgeLabel(age: number | null): string {
  if (age === null) {
    return 'age n/a'
  }
  if (age < 60) {
    return `${age}s ago`
  }
  const minutes = Math.floor(age / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

function sentimentTone(value: number | null): { className: string; label: string } {
  if (value === null) {
    return { className: 'sentiment-neutral', label: 'n/a' }
  }
  if (value >= 0.05) {
    return { className: 'sentiment-positive', label: 'positive' }
  }
  if (value <= -0.05) {
    return { className: 'sentiment-negative', label: 'negative' }
  }
  return { className: 'sentiment-neutral', label: 'neutral' }
}

export function HeadlinesRail({ items, isLoading, isError, errorMessage }: HeadlinesRailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <section className="dashboard-card">
      <header className="mb-2">
        <h2 className="dashboard-heading">Headlines</h2>
        <p className="dashboard-muted text-xs">Source, freshness and sentiment</p>
      </header>

      {isLoading && <p className="dashboard-muted text-sm">Loading headlines...</p>}
      {isError && <p className="text-sm text-[color:var(--danger)]">Failed to load headlines: {errorMessage ?? 'unknown error'}</p>}
      {!isLoading && !isError && items.length === 0 && <p className="dashboard-muted text-sm">No headlines in current window.</p>}

      {!isLoading && !isError && items.length > 0 && (
        <ul className="space-y-3">
          {items.slice(0, 8).map((headline) => {
            const age = ageSec(headline.time, nowMs)
            const sentiment = sentimentTone(headline.sentiment)
            const titleClass = 'text-sm font-medium leading-5 text-[color:var(--eth)] underline-offset-2 hover:underline'
            return (
              <li key={`${headline.time}|${headline.url ?? headline.title}`} className="dashboard-subcard px-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] text-[color:var(--eth)]">
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M6 7h8" />
                      <path d="M6 11h8" />
                      <path d="M6 15h5" />
                      <path d="M17 7h1a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a3 3 0 0 0 3 3" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[color:var(--text-soft)]">{headline.source ?? 'unknown'}</span>
                      <span className={`meta-pill ${sentiment.className}`}>{sentiment.label}</span>
                      <span className="dashboard-muted" title={headline.time}>{relativeAgeLabel(age)}</span>
                    </div>
                    {headline.url ? (
                      <a className={`mt-2 block ${titleClass}`} href={headline.url} rel="noreferrer noopener" target="_blank">
                        {headline.title}
                      </a>
                    ) : (
                      <p className={`mt-2 ${titleClass}`}>{headline.title}</p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
