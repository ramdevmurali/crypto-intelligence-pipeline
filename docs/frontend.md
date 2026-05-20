# Frontend

React dashboard for the Real-Time Crypto Intelligence Pipeline. It visualizes backend output from the price, metrics, alerts, headlines, summary, and sentiment paths. It does not own the core streaming or anomaly logic.

## Stack
- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts
- Vitest + Testing Library

## Purpose
- Show live BTC/ETH prices and recent price movement.
- Show return and volatility signal trends from processor metrics.
- Show anomaly alerts with summaries, thresholds, sentiment, and headline context.
- Show recent headlines with source, freshness, sentiment, and outbound links.
- Show per-symbol KPI freshness and backend stream health.
- Make the backend/streaming pipeline observable from a browser without duplicating backend logic.

## Architecture
Backend REST and SSE-style endpoints feed small feature hooks. Those hooks fetch prices, metrics, alerts, and headlines. `useDashboardData` coordinates the fetched data into stable dashboard props. UI components render charts, rails, controls, and status panels from those props.

```text
[FastAPI REST/SSE]
        |
        v
[feature hooks]
        |
        v
[useDashboardData]
        |
        v
[dashboard controls / charts / panels]
```

## Key components
- `DashboardControls`: symbol and window selection.
- `MarketOverviewChart`: price trajectory chart, with normalized comparison when both symbols are selected.
- `SignalTrendChart`: return and volatility z-score chart panels.
- `AlertsRail`: anomaly event feed with summary, return, threshold, sentiment, headline context, and selection behavior.
- `HeadlinesRail`: headline event feed with source, sentiment, relative age, and external links.
- `KPIStack`: compact BTC/ETH metric cards.
- `LiveStatusRail`: stream health, refresh times, and fallback visibility.
- `useDashboardData`: frontend orchestration layer that adapts API/hook output into dashboard-ready props.

## Data flow
```text
Backend API/SSE -> feature hooks -> useDashboardData -> dashboard panels/charts
```

The frontend preserves backend/API contracts and keeps processor-derived logic out of the UI. Chart data is memoized from fetched data, selected symbols, and window selection. Freshness timers live only inside small components that display age text, so chart props do not change every second just because time passes.

## Testing
Frontend tests are intentionally lean. They protect API-contract rendering and key interactions rather than visual styling.

Current coverage focuses on:
- `AlertsRail`: metadata, summaries, pending summaries, metrics, headline context, click/keyboard selection, and loading/error/empty states.
- `HeadlinesRail`: source, sentiment, relative age, title rendering, external links, safe link attributes, missing-url plain text, and loading/error/empty states.

Intentionally not tested for now:
- Exact Tailwind classes, colors, spacing, or card styling.
- Visual snapshots.
- Recharts internals.
- Browser E2E workflows.

## Running locally
```bash
cd frontend
npm install
npm run dev
```

Default local frontend URL:
```text
http://localhost:3000
```

The dashboard expects the backend API to be available at the configured frontend API base URL.

## Build, lint, and test
Run from `frontend/`:

```bash
npm run test
npm run build
npm run lint
```

## Docker
Run from `infra/`:

```bash
docker compose --env-file .env up -d --build frontend
```

For full behavior, run the backend, processor, sidecars, Redpanda, TimescaleDB, and Redis as well.

## Known limitations
- No browser E2E tests yet.
- Chart tests are intentionally light; Recharts rendering internals are not tested.
- Full behavior depends on backend API shape and live services.
- The frontend is read-only and does not provide operational controls for replay, DLQ handling, or processor management.

## Related docs
- [`../README.md`](../README.md)
- [`architecture.md`](architecture.md)
- [`backend.md`](backend.md)
- [`processor.md`](processor.md)
- [`backend_tests.md`](backend_tests.md)
- [`processor_tests.md`](processor_tests.md)
