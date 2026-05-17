import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Alert } from '../../lib/types'
import { AlertsRail } from './alerts-rail'

const ALERT_TIME = '2026-05-17T10:28:00.000Z'
const NOW = new Date('2026-05-17T10:30:00.000Z')

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    time: ALERT_TIME,
    symbol: 'btcusdt',
    window: '1m',
    direction: 'up',
    return: 0.024,
    threshold: 0.02,
    summary: 'Bitcoin moved sharply higher over the 1-minute window.',
    headline: 'Institutional buying reported across major exchanges.',
    sentiment: 0.12,
    headline_age_sec: 120,
    headline_fresh: true,
    ...overrides,
  }
}

describe('AlertsRail', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders alert metadata with symbol, window, direction, and relative age', () => {
    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert()]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText('btcusdt')).toBeDefined()
    expect(screen.getByText('1m')).toBeDefined()
    expect(screen.getByText('up')).toBeDefined()
    expect(screen.getByText('2m ago')).toBeDefined()
  })

  it('renders the full alert summary text', () => {
    const summary = 'Bitcoin experienced significant upward movement over the full one-minute window with fresh market context attached.'

    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert({ summary })]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText(summary)).toBeDefined()
  })

  it('renders summarizing when the alert summary is null', () => {
    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert({ summary: null })]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText('summarizing...')).toBeDefined()
  })
})
