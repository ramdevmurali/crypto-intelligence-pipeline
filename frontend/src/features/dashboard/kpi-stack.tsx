import { useEffect, useState } from 'react'

import type { MarketStatusCard } from './types'
import { formatNumber, formatPct, formatPrice, symbolLabel } from './ui-utils'

type KPIStackProps = {
  items: MarketStatusCard[]
}

function formatAge(ts: number | null, nowMs: number): string {
  if (ts === null) {
    return 'n/a'
  }
  return `${Math.max(0, Math.floor((nowMs - ts) / 1000))}s`
}

export function KPIStack({ items }: KPIStackProps) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [])

  return (
    <section className="dashboard-card">
      <header className="mb-3">
        <h2 className="dashboard-heading">KPI Stack</h2>
        <p className="dashboard-muted text-xs">Live per-symbol signal snapshot</p>
      </header>

      <div className="space-y-2">
        {items.map((item) => (
          <article key={item.symbol} className="dashboard-subcard p-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="dashboard-label">{symbolLabel(item.symbol)}</p>
              <p className="dashboard-muted text-xs">freshness {formatAge(item.freshnessTs, nowMs)}</p>
            </div>
            <p className="text-lg font-semibold text-[color:var(--text)]">{formatPrice(item.price)}</p>
            <p className="mt-1 text-xs text-[color:var(--text-soft)]">ret 1m {formatPct(item.return1m)} · z {formatNumber(item.returnZ)} · vol z {formatNumber(item.volZ)}</p>
            <p className="dashboard-muted text-xs">attention {formatNumber(item.attention, 2)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
