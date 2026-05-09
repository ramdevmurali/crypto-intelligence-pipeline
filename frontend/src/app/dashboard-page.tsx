import { useMemo, useState } from 'react'

import { AlertsRail } from '../features/dashboard/alerts-rail'
import { DashboardControls } from '../features/dashboard/dashboard-controls'
import { HeadlinesRail } from '../features/dashboard/headlines-rail'
import { KPIStack } from '../features/dashboard/kpi-stack'
import { LiveStatusRail } from '../features/dashboard/live-status-rail'
import { MarketOverviewChart } from '../features/dashboard/market-overview-chart'
import { SignalTrendChart } from '../features/dashboard/signal-trend-chart'
import { useDashboardData } from '../features/dashboard/use-dashboard-data'
import type { SymbolFilter, TimeWindow } from '../features/dashboard/types'
import type { Alert } from '../lib/types'

type DashboardStackTab = 'market' | 'signals' | 'alerts' | 'headlines'

const STACK_TABS: Array<{ value: DashboardStackTab; label: string; description: string }> = [
  { value: 'market', label: 'Market', description: 'Price trajectory with anomaly overlays' },
  { value: 'signals', label: 'Signals', description: 'EWMA return and volatility z-score behavior' },
  { value: 'alerts', label: 'Alerts', description: 'Realtime anomaly stream' },
  { value: 'headlines', label: 'Headlines', description: 'Source, freshness and sentiment' },
]

function getAlertKey(alert: Alert): string {
  return `${alert.time}|${alert.symbol}|${alert.window}|${alert.direction}`
}

export function DashboardPage() {
  const [symbolFilter, setSymbolFilter] = useState<SymbolFilter>('both')
  const [window, setWindow] = useState<TimeWindow>(30)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [activeStackTab, setActiveStackTab] = useState<DashboardStackTab>('market')

  const dashboard = useDashboardData({ symbolFilter, window })
  const activeStackIndex = STACK_TABS.findIndex((tab) => tab.value === activeStackTab)
  const activeStack = STACK_TABS[activeStackIndex] ?? STACK_TABS[0]

  const selectedAlertKey = useMemo(
    () => (selectedAlert ? getAlertKey(selectedAlert) : null),
    [selectedAlert]
  )

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Realtime Crypto Narrato</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Market Intelligence Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Live prices, signal shifts, headline freshness, and anomaly context.</p>
          </div>
        </div>
      </header>

      <DashboardControls
        symbolFilter={symbolFilter}
        onChangeSymbol={setSymbolFilter}
        window={window}
        onChangeWindow={setWindow}
      />

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4 lg:order-2">
          <LiveStatusRail
            alertsLive={dashboard.alerts.isLive}
            alertsError={dashboard.alerts.isError}
            alertsLastEventAt={dashboard.alerts.lastEventAt}
            headlinesLive={dashboard.headlines.isLive}
            headlinesError={dashboard.headlines.isError}
            headlinesLastEventAt={dashboard.headlines.lastEventAt}
            metricsError={dashboard.metrics.isError}
            metricsFailedSymbols={dashboard.metrics.failedSymbols}
            pricesError={dashboard.prices.isError}
            lastPriceUpdate={dashboard.prices.lastUpdatedAt}
            lastMetricUpdate={dashboard.metrics.lastUpdatedAt}
          />
          <KPIStack items={dashboard.marketStatus} />
        </div>

        <section className="lg:col-span-8 lg:order-1">
          <header className="mb-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{activeStack.label}</h2>
              <p className="text-xs text-slate-500">{activeStack.description}</p>
            </div>
            <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Dashboard stack">
              {STACK_TABS.map((tab) => {
                const active = activeStackTab === tab.value
                return (
                  <button
                    key={tab.value}
                    aria-selected={active}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setActiveStackTab(tab.value)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </header>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${activeStackIndex * 100}%)` }}
            >
              <div className="min-w-full pr-0" role="tabpanel" aria-hidden={activeStackTab !== 'market'}>
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <header className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">Market Overview</h2>
                      <p className="text-xs text-slate-500">Price trajectory with anomaly overlays</p>
                    </div>
                    <p className="text-xs text-slate-500">window {window}m</p>
                  </header>
                  <MarketOverviewChart
                    priceSeriesBySymbol={dashboard.priceSeriesBySymbol}
                    alertOverlay={dashboard.alertOverlay}
                    selectedSymbols={dashboard.selectedSymbols}
                    window={window}
                  />
                </article>
              </div>

              <div className="min-w-full pr-0" role="tabpanel" aria-hidden={activeStackTab !== 'signals'}>
                <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <header className="mb-3">
                    <h2 className="text-sm font-semibold text-slate-900">Signal Trends</h2>
                    <p className="text-xs text-slate-500">EWMA return and volatility z-score behavior</p>
                  </header>
                  <SignalTrendChart
                    metricSeriesBySymbol={dashboard.metricSeriesBySymbol}
                    selectedSymbols={dashboard.selectedSymbols}
                  />
                </article>
              </div>

              <div className="min-w-full pr-0" role="tabpanel" aria-hidden={activeStackTab !== 'alerts'}>
                <AlertsRail
                  items={dashboard.alerts.items}
                  isLoading={dashboard.alerts.isLoading}
                  isError={dashboard.alerts.isError}
                  errorMessage={dashboard.alerts.errorMessage}
                  selectedAlertKey={selectedAlertKey}
                  onSelectAlert={setSelectedAlert}
                />
              </div>

              <div className="min-w-full pr-0" role="tabpanel" aria-hidden={activeStackTab !== 'headlines'}>
                <HeadlinesRail
                  items={dashboard.headlines.items}
                  isLoading={dashboard.headlines.isLoading}
                  isError={dashboard.headlines.isError}
                  errorMessage={dashboard.headlines.errorMessage}
                />
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}
