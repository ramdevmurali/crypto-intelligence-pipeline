import { useEffect, useState } from 'react'

import type { MarketStatusCard } from './types'
import { formatFreshnessAge, formatNumber, formatPct, formatPrice, symbolLabel } from './ui-utils'

type KPIStackProps = {
  items: MarketStatusCard[]
}

function valueToneClass(value: number | null): string {
  if (value === null || value === 0) {
    return ''
  }
  return value > 0 ? 'value-positive' : 'value-negative'
}

export function KPIStack({ items }: KPIStackProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <section className="dashboard-card">
      <header className="mb-2">
        <h2 className="dashboard-heading">KPI Stack</h2>
        <p className="dashboard-muted text-xs">Live per-symbol signal snapshot</p>
      </header>

      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.symbol} className={`dashboard-subcard kpi-accent-${item.symbol} p-3`}>
            <div className="mb-1 flex items-center justify-between">
              <p className={`dashboard-label symbol-accent-${item.symbol}`}>{symbolLabel(item.symbol)}</p>
              <p className="dashboard-muted text-xs">freshness {formatFreshnessAge(item.freshnessTs, nowMs)}</p>
            </div>
            <p className="text-xl font-semibold tabular-nums text-[color:var(--text)]">{formatPrice(item.price)}</p>
            <div className="metric-strip">
              <p className="metric-cell">
                ret 1m
                <strong className={valueToneClass(item.return1m)}>{formatPct(item.return1m)}</strong>
              </p>
              <p className="metric-cell">
                z
                <strong>{formatNumber(item.returnZ)}</strong>
              </p>
              <p className="metric-cell">
                vol z
                <strong>{formatNumber(item.volZ)}</strong>
              </p>
            </div>
            <p className="dashboard-muted mt-2 text-xs">attention {formatNumber(item.attention, 2)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
