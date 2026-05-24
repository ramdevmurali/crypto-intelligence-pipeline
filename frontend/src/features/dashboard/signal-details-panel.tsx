import type { MetricSnapshot, MetricWindowLabel } from './types'
import { formatNumber, formatPct, symbolLabel } from './ui-utils'

type SignalDetailsPanelProps = {
  items: MetricSnapshot[]
}

type SignalMetricRow = {
  window: MetricWindowLabel
  returnValue: number | null
  returnZEwma: number | null
  volZ: number | null
  p05: number | null
  p95: number | null
}

const WINDOW_LABELS: MetricWindowLabel[] = ['1m', '5m', '15m']

function metricRows(item: MetricSnapshot): SignalMetricRow[] {
  return WINDOW_LABELS.map((window) => ({
    window,
    returnValue: item[`return_${window}`],
    returnZEwma: item[`return_z_ewma_${window}`],
    volZ: item[`vol_z_${window}`],
    p05: item[`p05_return_${window}`],
    p95: item[`p95_return_${window}`],
  }))
}

function valueToneClass(value: number | null): string {
  if (value === null || value === 0) {
    return ''
  }
  return value > 0 ? 'value-positive' : 'value-negative'
}

export function SignalDetailsPanel({ items }: SignalDetailsPanelProps) {
  return (
    <section className="mt-2">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="dashboard-heading">Signal Details</h3>
          <p className="dashboard-muted text-xs">Latest computed return, z-score and percentile bands</p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="dashboard-subcard p-3">
          <p className="panel-empty">No latest signal metrics available.</p>
        </div>
      ) : (
        <div className="grid gap-2 xl:grid-cols-2">
          {items.map((item) => (
            <article key={item.symbol} className={`dashboard-subcard kpi-accent-${item.symbol} p-3`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className={`dashboard-label symbol-accent-${item.symbol}`}>{symbolLabel(item.symbol)}</p>
                <p className="dashboard-muted text-xs">
                  attention <span className="tabular-nums text-[color:var(--text)]">{formatNumber(item.attention, 2)}</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-xs">
                  <thead className="dashboard-muted border-b border-[color:var(--stroke)]">
                    <tr>
                      <th className="pb-1.5 pr-3 font-semibold">window</th>
                      <th className="pb-1.5 pr-3 font-semibold">return</th>
                      <th className="pb-1.5 pr-3 font-semibold">ewma z</th>
                      <th className="pb-1.5 pr-3 font-semibold">vol z</th>
                      <th className="pb-1.5 pr-3 font-semibold">p05</th>
                      <th className="pb-1.5 font-semibold">p95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricRows(item).map((row) => (
                      <tr key={row.window} className="border-b border-[color:var(--stroke)]/70 last:border-b-0">
                        <td className="py-1.5 pr-3 font-semibold text-[color:var(--text-soft)]">{row.window}</td>
                        <td className={`py-1.5 pr-3 tabular-nums ${valueToneClass(row.returnValue)}`}>
                          {formatPct(row.returnValue)}
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums text-[color:var(--text)]">
                          {formatNumber(row.returnZEwma)}
                        </td>
                        <td className="py-1.5 pr-3 tabular-nums text-[color:var(--text)]">{formatNumber(row.volZ)}</td>
                        <td className="py-1.5 pr-3 tabular-nums text-[color:var(--text-muted)]">{formatPct(row.p05)}</td>
                        <td className="py-1.5 tabular-nums text-[color:var(--text-muted)]">{formatPct(row.p95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
