import type { SymbolFilter, TimeWindow } from './types'

type DashboardControlsProps = {
  symbolFilter: SymbolFilter
  onChangeSymbol: (value: SymbolFilter) => void
  window: TimeWindow
  onChangeWindow: (value: TimeWindow) => void
}

const SYMBOL_OPTIONS: Array<{ value: SymbolFilter; label: string }> = [
  { value: 'both', label: 'Both' },
  { value: 'btcusdt', label: 'BTC' },
  { value: 'ethusdt', label: 'ETH' },
]

const WINDOW_OPTIONS: TimeWindow[] = [5, 15, 30]

function chipClass(active: boolean): string {
  if (active) {
    return 'control-chip-active'
  }
  return ''
}

export function DashboardControls({
  symbolFilter,
  onChangeSymbol,
  window,
  onChangeWindow,
}: DashboardControlsProps) {
  return (
    <div className="control-shell flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <p className="dashboard-label">Symbols</p>
        {SYMBOL_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`control-chip ${chipClass(symbolFilter === option.value)}`}
            onClick={() => onChangeSymbol(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <p className="dashboard-label">Window</p>
        {WINDOW_OPTIONS.map((option) => (
          <button
            key={option}
            className={`control-chip ${chipClass(window === option)}`}
            onClick={() => onChangeWindow(option)}
            type="button"
          >
            {option}m
          </button>
        ))}
      </div>
    </div>
  )
}
