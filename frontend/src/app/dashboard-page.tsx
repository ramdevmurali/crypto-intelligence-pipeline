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
    <main className="app-frame">
      <header className="dashboard-console-header">
        <p className="dashboard-eyebrow">Crypto Intelligence Console</p>
        <div className="dashboard-console-copy mt-0.5">
          <div>
            <h1 className="dashboard-title">Market Intelligence Dashboard</h1>
            <p className="dashboard-subtitle">Live prices, signal shifts, headline freshness, and anomaly context.</p>
          </div>
        </div>
      </header>

      <DashboardControls
        symbolFilter={symbolFilter}
        onChangeSymbol={setSymbolFilter}
        window={window}
        onChangeWindow={setWindow}
      />

      <section className="dashboard-shell-grid">
        <div className="dashboard-side-stack">
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

        <section className="dashboard-stack">
          <header className="stack-header">
            <div>
              <h2 className="dashboard-heading">{activeStack.label}</h2>
              <p className="dashboard-muted text-xs">{activeStack.description}</p>
            </div>
            <div className="tab-strip" role="tablist" aria-label="Dashboard stack">
              {STACK_TABS.map((tab) => {
                const active = activeStackTab === tab.value
                return (
                  <button
                    key={tab.value}
                    aria-selected={active}
                    className={`tab-button ${active ? 'tab-button-active' : ''}`}
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
                <article className="dashboard-card">
                  <header className="mb-1 flex items-center justify-between">
                    <div>
                      <h2 className="dashboard-heading">Market Overview</h2>
                      <p className="dashboard-muted text-xs">Price trajectory with anomaly overlays</p>
                    </div>
                    <p className="dashboard-muted text-xs">window {window}m</p>
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
                <article className="dashboard-card">
                  <header className="mb-2">
                    <h2 className="dashboard-heading">Signal Trends</h2>
                    <p className="dashboard-muted text-xs">EWMA return and volatility z-score behavior</p>
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
