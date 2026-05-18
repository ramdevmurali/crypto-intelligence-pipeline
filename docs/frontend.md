# Frontend (React dashboard) cheat sheet

## What it is
- Compact operational console for the crypto anomaly pipeline.
- Shows live prices, rolling signals, anomaly alerts, headlines, stream health, and per-symbol KPIs.
- Read-only client; all data comes from the backend API and SSE-style polling paths.
- Main purpose is to make the backend/processor story visible without becoming a large product UI.

## Stack
- React + Vite + TypeScript.
- Tailwind CSS for styling.
- TanStack Query for API fetching and refresh behavior.
- Recharts for price and signal charts.
- Vitest + React Testing Library for lean component tests.

## Main files
- `frontend/src/app/dashboard-page.tsx`: dashboard shell, selected symbol/window/tab state, selected alert state.
- `frontend/src/features/dashboard/use-dashboard-data.ts`: data orchestration and dashboard-ready props.
- `frontend/src/features/dashboard/dashboard-controls.tsx`: symbol and window controls.
- `frontend/src/features/dashboard/market-overview-chart.tsx`: price chart.
- `frontend/src/features/dashboard/signal-trend-chart.tsx`: return/volatility signal chart.
- `frontend/src/features/dashboard/live-status-rail.tsx`: stream and freshness health.
- `frontend/src/features/dashboard/kpi-stack.tsx`: BTC/ETH KPI cards.
- `frontend/src/features/dashboard/alerts-rail.tsx`: anomaly event feed.
- `frontend/src/features/dashboard/headlines-rail.tsx`: headline event feed.
- `frontend/src/index.css`: global theme tokens and shared dashboard classes.

## Data it consumes
Backend endpoints are defined in `backend/app/main.py` and served from TimescaleDB:
- `GET /prices?symbol=&limit=`: recent price ticks.
- `GET /metrics/latest?symbol=`: latest per-symbol market metrics.
- `GET /alerts?limit=&since=`: recent anomaly alerts.
- `GET /headlines?limit=&since=`: recent headlines with sentiment.
- `GET /health`: backend and DB health.

Frontend API types live under `frontend/src/lib/types`.

## Dashboard behavior
- Symbol filter: `Both`, `BTC`, `ETH`.
- Window filter: `5m`, `15m`, `30m` for chart display range.
- Tab stack: `Market`, `Signals`, `Alerts`, `Headlines`.
- When both symbols are selected, market chart data is normalized to compare movement.
- When a single symbol is selected, chart values use raw symbol data.
- Alert summaries can be `null`; UI renders `summarizing...` until the summary sidecar backfills text.
- Freshness labels update locally inside the small UI components that display age text.

## Visual direction
- Dark operational dashboard, not a consumer trading app.
- AMOLED/charcoal background with orange action accents.
- BTC keeps orange identity; ETH keeps blue identity.
- Semantic color is reserved for meaning: live/positive, warning/degraded, danger/negative.
- Avoid broad decorative clutter, neon styling, and heavy product-marketing treatment.

## How to run
From `infra/`:
```
docker compose --env-file .env up -d frontend backend processor summary-sidecar sentiment-sidecar redpanda timescaledb redis
```

Frontend local dev:
```
cd frontend
npm install
npm run dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Tests
Frontend test coverage is intentionally lean and behavior-focused.

Current coverage:
- `AlertsRail`: alert metadata, summaries, pending summaries, anomaly metrics, headline context, selection behavior, keyboard activation, and loading/error/empty states.
- `HeadlinesRail`: source, sentiment, age, title, external links, safe link attributes, missing-url plain text, and loading/error/empty states.

Run from `frontend/`:
```
npm run test
npm run build
npm run lint
```


## Notes
- Frontend should preserve backend/API contracts and avoid duplicating backend/processor logic.
- Keep component boundaries only where they improve traceability.
- Prefer small readable component tests over snapshots or visual assertions.
- Do not test Recharts internals; extract pure helpers first if chart transform logic needs coverage.
- The backend and processor remain the main engineering focus; the frontend exists to present that pipeline clearly.
