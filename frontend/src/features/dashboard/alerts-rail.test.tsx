import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function renderSelectableAlert() {
  const alert = makeAlert()
  const onSelectAlert = vi.fn()

  render(
    <AlertsRail
      errorMessage={null}
      isError={false}
      isLoading={false}
      items={[alert]}
      onSelectAlert={onSelectAlert}
      selectedAlertKey={null}
    />
  )

  return {
    alert,
    onSelectAlert,
    row: screen.getByRole('button'),
  }
}

function renderAlertsRail(overrides: Partial<React.ComponentProps<typeof AlertsRail>> = {}) {
  render(
    <AlertsRail
      errorMessage={null}
      isError={false}
      isLoading={false}
      items={[]}
      onSelectAlert={vi.fn()}
      selectedAlertKey={null}
      {...overrides}
    />
  )
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

  it('renders return and threshold values', () => {
    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert({ return: 0.024, threshold: 0.02 })]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText('return 2.40%')).toBeDefined()
    expect(screen.getByText('threshold 2.00%')).toBeDefined()
  })

  it('renders sentiment and headline freshness when available', () => {
    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert({ sentiment: 0.12, headline_fresh: true })]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText('sentiment positive')).toBeDefined()
    expect(screen.getByText('headline fresh')).toBeDefined()
  })

  it('renders headline context when present', () => {
    const headline = 'Institutional buying reported across major exchanges.'

    render(
      <AlertsRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeAlert({ headline })]}
        onSelectAlert={vi.fn()}
        selectedAlertKey={null}
      />
    )

    expect(screen.getByText(`Headline: ${headline}`)).toBeDefined()
  })

  it('calls onSelectAlert when an alert row is clicked', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { alert, onSelectAlert, row } = renderSelectableAlert()

    await user.click(row)

    expect(onSelectAlert).toHaveBeenCalledOnce()
    expect(onSelectAlert).toHaveBeenCalledWith(alert)
  })

  it('calls onSelectAlert when an alert row is activated with Enter', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { alert, onSelectAlert, row } = renderSelectableAlert()

    row.focus()
    await user.keyboard('{Enter}')

    expect(onSelectAlert).toHaveBeenCalledOnce()
    expect(onSelectAlert).toHaveBeenCalledWith(alert)
  })

  it('calls onSelectAlert when an alert row is activated with Space', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()
    const { alert, onSelectAlert, row } = renderSelectableAlert()

    row.focus()
    await user.keyboard(' ')

    expect(onSelectAlert).toHaveBeenCalledOnce()
    expect(onSelectAlert).toHaveBeenCalledWith(alert)
  })

  it('renders the loading state', () => {
    renderAlertsRail({ isLoading: true })

    expect(screen.getByText('Loading alerts...')).toBeDefined()
  })

  it('renders the error state', () => {
    renderAlertsRail({ errorMessage: 'stream unavailable', isError: true })

    expect(screen.getByText('Failed to load alerts: stream unavailable')).toBeDefined()
  })

  it('renders the empty state', () => {
    renderAlertsRail()

    expect(screen.getByText('No alerts in current window.')).toBeDefined()
  })
})
