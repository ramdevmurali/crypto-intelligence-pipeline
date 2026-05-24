import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { MetricSnapshot } from './types'
import { SignalDetailsPanel } from './signal-details-panel'

function makeMetricSnapshot(overrides: Partial<MetricSnapshot> = {}): MetricSnapshot {
  return {
    time: '2026-05-17T10:30:00.000Z',
    symbol: 'btcusdt',
    return_1m: 0.0123,
    return_5m: -0.0456,
    return_15m: null,
    return_z_ewma_1m: 1.234,
    return_z_ewma_5m: -2.345,
    return_z_ewma_15m: null,
    vol_z_1m: 0.789,
    vol_z_5m: 1.987,
    vol_z_15m: null,
    p05_return_1m: -0.01,
    p05_return_5m: -0.025,
    p05_return_15m: null,
    p95_return_1m: 0.02,
    p95_return_5m: 0.033,
    p95_return_15m: null,
    attention: 1.24,
    ...overrides,
  }
}

describe('SignalDetailsPanel', () => {
  it('renders signal metric details with formatted values and missing-value fallbacks', () => {
    render(<SignalDetailsPanel items={[makeMetricSnapshot()]} />)

    expect(screen.getByText('BTC')).toBeDefined()
    expect(screen.getByText('attention')).toBeDefined()
    expect(screen.getByText('1.24')).toBeDefined()

    expect(screen.getByText('1m')).toBeDefined()
    expect(screen.getByText('5m')).toBeDefined()
    expect(screen.getByText('15m')).toBeDefined()

    expect(screen.getByText('1.23%')).toBeDefined()
    expect(screen.getByText('-4.56%')).toBeDefined()
    expect(screen.getByText('1.234')).toBeDefined()
    expect(screen.getByText('-2.345')).toBeDefined()
    expect(screen.getByText('0.789')).toBeDefined()
    expect(screen.getByText('1.987')).toBeDefined()
    expect(screen.getByText('-1.00%')).toBeDefined()
    expect(screen.getByText('-2.50%')).toBeDefined()
    expect(screen.getByText('2.00%')).toBeDefined()
    expect(screen.getByText('3.30%')).toBeDefined()
    expect(screen.getAllByText('n/a').length).toBeGreaterThan(0)
  })
})
