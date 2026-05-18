import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Headline } from '../../lib/types'
import { HeadlinesRail } from './headlines-rail'

const HEADLINE_TIME = '2026-05-17T10:27:00.000Z'
const NOW = new Date('2026-05-17T10:30:00.000Z')

function makeHeadline(overrides: Partial<Headline> = {}): Headline {
  return {
    time: HEADLINE_TIME,
    title: 'Bitcoin ETF inflows accelerate',
    url: 'https://example.com/bitcoin-etf-inflows',
    source: 'CoinDesk',
    sentiment: 0.12,
    ...overrides,
  }
}

describe('HeadlinesRail', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders source, sentiment label, relative age, and title', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeHeadline()]}
      />
    )

    expect(screen.getByText('CoinDesk')).toBeDefined()
    expect(screen.getByText('positive')).toBeDefined()
    expect(screen.getByText('3m ago')).toBeDefined()
    expect(screen.getByText('Bitcoin ETF inflows accelerate')).toBeDefined()
  })

  it('renders an external link when url exists', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeHeadline()]}
      />
    )

    expect(screen.getByRole('link', { name: 'Bitcoin ETF inflows accelerate' })).toHaveAttribute(
      'href',
      'https://example.com/bitcoin-etf-inflows'
    )
  })

  it('uses safe attributes for external links', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeHeadline()]}
      />
    )

    const link = screen.getByRole('link', { name: 'Bitcoin ETF inflows accelerate' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')?.split(/\s+/)).toEqual(
      expect.arrayContaining(['noreferrer', 'noopener'])
    )
  })

  it('renders title as plain text when url is missing', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[makeHeadline({ url: null })]}
      />
    )

    expect(screen.getByText('Bitcoin ETF inflows accelerate')).toBeDefined()
    expect(screen.queryByRole('link', { name: 'Bitcoin ETF inflows accelerate' })).toBeNull()
  })

  it('renders the loading state', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={true}
        items={[]}
      />
    )

    expect(screen.getByText('Loading headlines...')).toBeDefined()
  })

  it('renders the error state', () => {
    render(
      <HeadlinesRail
        errorMessage="upstream timeout"
        isError={true}
        isLoading={false}
        items={[]}
      />
    )

    expect(screen.getByText('Failed to load headlines: upstream timeout')).toBeDefined()
  })

  it('renders the empty state', () => {
    render(
      <HeadlinesRail
        errorMessage={null}
        isError={false}
        isLoading={false}
        items={[]}
      />
    )

    expect(screen.getByText('No headlines in current window.')).toBeDefined()
  })
})
