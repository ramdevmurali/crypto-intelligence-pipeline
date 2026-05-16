import type { DashboardHealthState, SymbolKey } from './types'

const SYMBOL_STROKE_BY_KEY: Record<SymbolKey, string> = {
  btcusdt: '#f7931a',
  ethusdt: '#627eea',
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false })
}

export function formatIsoClock(value: string): string {
  const ts = Date.parse(value)
  if (Number.isNaN(ts)) {
    return value
  }
  return formatClock(ts)
}

export function symbolLabel(symbol: SymbolKey): string {
  if (symbol === 'btcusdt') {
    return 'BTC'
  }
  return 'ETH'
}

export function symbolStroke(symbol: SymbolKey): string {
  return SYMBOL_STROKE_BY_KEY[symbol]
}

export function formatPrice(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPct(value: number | null): string {
  if (value === null) {
    return 'n/a'
  }
  return `${(value * 100).toFixed(2)}%`
}

export function formatNumber(value: number | null, digits = 3): string {
  if (value === null) {
    return 'n/a'
  }
  return value.toFixed(digits)
}

export function getHealthChipClass(state: DashboardHealthState): string {
  if (state === 'live') {
    return 'bg-[color:var(--positive-soft)] text-[color:var(--positive)] border-[color:var(--positive)]/25'
  }
  if (state === 'degraded') {
    return 'bg-[color:var(--warn-soft)] text-[color:var(--warn)] border-[color:var(--warn)]/25'
  }
  return 'bg-[color:var(--surface-soft)] text-[color:var(--text-muted)] border-[color:var(--stroke-strong)]'
}

export function getDirectionDotClass(direction: string): string {
  const normalized = direction.trim().toLowerCase()
  if (normalized === 'up') {
    return 'bg-emerald-500'
  }
  if (normalized === 'down') {
    return 'bg-rose-500'
  }
  return 'bg-slate-400'
}
