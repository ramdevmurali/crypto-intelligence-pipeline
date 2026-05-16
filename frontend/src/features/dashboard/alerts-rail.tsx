import { useEffect, useState } from 'react'

import type { Alert } from '../../lib/types'
import { formatPct } from './ui-utils'

type AlertsRailProps = {
  items: Alert[]
  isLoading: boolean
  isError: boolean
  errorMessage: string | null
  selectedAlertKey: string | null
  onSelectAlert: (alert: Alert) => void
}

function alertKey(alert: Alert): string {
  return `${alert.time}|${alert.symbol}|${alert.window}|${alert.direction}`
}

function formatSummary(value: string | null): string {
  if (!value) {
    return 'summarizing...'
  }
  return value.trim().replace(/\s+/g, ' ')
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

function metaClass(selected: boolean): string {
  return selected ? 'meta-pill-selected' : 'meta-pill'
}

function directionTone(direction: string): {
  cardClass: string
  iconClass: string
  label: string
  path: string
} {
  const normalized = direction.trim().toLowerCase()
  if (normalized === 'up') {
    return {
      cardClass: 'alert-card-up',
      iconClass: 'bg-[color:var(--positive-soft)] text-[color:var(--positive)]',
      label: 'up',
      path: 'M4 15l5-5 4 4 7-7M15 7h5v5',
    }
  }
  if (normalized === 'down') {
    return {
      cardClass: 'alert-card-down',
      iconClass: 'bg-[color:var(--negative-soft)] text-[color:var(--negative)]',
      label: 'down',
      path: 'M4 9l5 5 4-4 7 7M15 17h5v-5',
    }
  }
  return {
    cardClass: '',
    iconClass: 'bg-[color:var(--neutral-soft)] text-[color:var(--neutral)]',
    label: normalized || 'unknown',
    path: 'M5 12h14',
  }
}

function sentimentTone(value: number | null): { className: string; label: string } | null {
  if (value === null) {
    return null
  }
  if (value >= 0.05) {
    return { className: 'sentiment-positive', label: 'sentiment positive' }
  }
  if (value <= -0.05) {
    return { className: 'sentiment-negative', label: 'sentiment negative' }
  }
  return { className: 'sentiment-neutral', label: 'sentiment neutral' }
}

function headlineFreshnessLabel(value: boolean | undefined): string | null {
  if (value === true) {
    return 'headline fresh'
  }
  if (value === false) {
    return 'headline stale'
  }
  return null
}

export function AlertsRail({
  items,
  isLoading,
  isError,
  errorMessage,
  selectedAlertKey,
  onSelectAlert,
}: AlertsRailProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (items.length === 0) {
      return undefined
    }
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [items.length])

  return (
    <section className="dashboard-card">
      <header className="mb-2">
        <h2 className="dashboard-heading">Alerts</h2>
        <p className="dashboard-muted text-xs">Realtime anomaly stream</p>
      </header>

      {isLoading && <p className="dashboard-muted text-sm">Loading alerts...</p>}
      {isError && <p className="text-sm text-[color:var(--danger)]">Failed to load alerts: {errorMessage ?? 'unknown error'}</p>}
      {!isLoading && !isError && items.length === 0 && <p className="dashboard-muted text-sm">No alerts in current window.</p>}

      {!isLoading && !isError && items.length > 0 && (
        <ul className="space-y-3">
          {items.slice(0, 8).map((alert) => {
            const key = alertKey(alert)
            const selected = selectedAlertKey === key
            const direction = directionTone(alert.direction)
            const age = ageSec(alert.time, nowMs)
            const sentiment = sentimentTone(alert.sentiment)
            const headlineFreshness = headlineFreshnessLabel(alert.headline_fresh)
            const mutedClass = selected ? 'text-white/70' : 'dashboard-muted'
            const bodyClass = selected ? 'text-white' : 'text-[color:var(--text-soft)]'
            return (
              <li
                key={key}
                className={`cursor-pointer rounded-xl border px-3 py-3 transition-colors ${
                  selected
                    ? 'border-[color:var(--surface-pressed)] bg-[color:var(--surface-pressed)] text-white'
                    : `dashboard-subcard ${direction.cardClass} text-[color:var(--text-soft)] hover:border-[color:var(--stroke-strong)]`
                }`}
                onClick={() => onSelectAlert(alert)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectAlert(alert)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${direction.iconClass}`}>
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                      <path d={direction.path} />
                    </svg>
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className={metaClass(selected)}>{alert.symbol}</span>
                      <span className={metaClass(selected)}>{alert.window}</span>
                      <span className={metaClass(selected)}>{direction.label}</span>
                      <span className={mutedClass}>{relativeAgeLabel(age)}</span>
                    </div>

                    <p className={`mt-2 text-sm leading-6 ${bodyClass}`}>{formatSummary(alert.summary)}</p>

                    <div className={`mt-2 flex flex-wrap gap-2 text-xs ${mutedClass}`}>
                      <span>return {formatPct(alert.return)}</span>
                      <span>threshold {formatPct(alert.threshold)}</span>
                      {sentiment && <span className={`meta-pill ${selected ? 'meta-pill-selected' : sentiment.className}`}>{sentiment.label}</span>}
                      {headlineFreshness && <span>{headlineFreshness}</span>}
                    </div>

                    {alert.headline && (
                      <p className={`mt-2 text-xs leading-5 ${mutedClass}`}>
                        Headline: {alert.headline}
                      </p>
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
