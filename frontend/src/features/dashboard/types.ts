export type SymbolKey = 'btcusdt' | 'ethusdt'

export type SymbolFilter = SymbolKey | 'both'

export type DashboardHealthState = 'live' | 'degraded' | 'stale'

export type TimeWindow = 5 | 15 | 30

export type MetricWindowLabel = '1m' | '5m' | '15m'

export type MetricSnapshot = {
  time: string
  symbol: SymbolKey
  return_1m: number | null
  return_5m: number | null
  return_15m: number | null
  return_z_ewma_1m: number | null
  return_z_ewma_5m: number | null
  return_z_ewma_15m: number | null
  vol_z_1m: number | null
  vol_z_5m: number | null
  vol_z_15m: number | null
  p05_return_1m: number | null
  p05_return_5m: number | null
  p05_return_15m: number | null
  p95_return_1m: number | null
  p95_return_5m: number | null
  p95_return_15m: number | null
  attention: number | null
}

export type MetricSeriesPoint = MetricSnapshot & {
  ts: number
}

export type PriceSeriesPoint = {
  ts: number
  time: string
  symbol: SymbolKey
  price: number
}

export type AlertOverlayPoint = {
  ts: number
  time: string
  symbol: SymbolKey
  price: number
  direction: string
}

export type MarketStatusCard = {
  symbol: SymbolKey
  price: number | null
  return1m: number | null
  returnZ: number | null
  volZ: number | null
  attention: number | null
  freshnessTs: number | null
}
