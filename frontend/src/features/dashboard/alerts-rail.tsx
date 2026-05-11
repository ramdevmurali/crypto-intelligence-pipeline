import type { Alert } from '../../lib/types'
import { getDirectionDotClass } from './ui-utils'

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

function metaClass(selected: boolean): string {
  return selected ? 'meta-pill-selected' : 'meta-pill'
}

export function AlertsRail({
  items,
  isLoading,
  isError,
  errorMessage,
  selectedAlertKey,
  onSelectAlert,
}: AlertsRailProps) {
  return (
    <section className="dashboard-card">
      <header className="mb-3">
        <h2 className="dashboard-heading">Alerts</h2>
        <p className="dashboard-muted text-xs">Realtime anomaly stream</p>
      </header>

      {isLoading && <p className="dashboard-muted text-sm">Loading alerts...</p>}
      {isError && <p className="text-sm text-[color:var(--danger)]">Failed to load alerts: {errorMessage ?? 'unknown error'}</p>}
      {!isLoading && !isError && items.length === 0 && <p className="dashboard-muted text-sm">No alerts in current window.</p>}

      {!isLoading && !isError && items.length > 0 && (
        <ul className="space-y-2">
          {items.slice(0, 8).map((alert) => {
            const key = alertKey(alert)
            const selected = selectedAlertKey === key
            const freshness = alert.headline_fresh === true ? 'fresh' : alert.headline_fresh === false ? 'stale' : 'unknown'
            return (
              <li
                key={key}
                className={`cursor-pointer rounded-xl border px-3 py-3 transition-colors ${
                  selected
                    ? 'border-[color:var(--surface-pressed)] bg-[color:var(--surface-pressed)] text-white'
                    : 'dashboard-subcard text-[color:var(--text-soft)] hover:border-[color:var(--stroke-strong)]'
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
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <span className={`h-2 w-2 rounded-full ${getDirectionDotClass(alert.direction)}`} />
                  <span>{alert.symbol}</span>
                  <span className={metaClass(selected)}>{alert.window}</span>
                  <span className={metaClass(selected)}>{alert.direction}</span>
                  <span className={metaClass(selected)}>{freshness}</span>
                </div>
                <div className={`mt-2 flex flex-wrap gap-2 text-xs ${selected ? 'text-white/75' : 'dashboard-muted'}`}>
                  <span>return {(alert.return * 100).toFixed(2)}%</span>
                  <span>threshold {(alert.threshold * 100).toFixed(2)}%</span>
                </div>
                <p className={`mt-2 text-sm leading-6 ${selected ? 'text-white' : 'text-[color:var(--text-soft)]'}`}>{formatSummary(alert.summary)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
