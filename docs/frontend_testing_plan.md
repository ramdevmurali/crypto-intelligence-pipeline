# Frontend Testing Implementation Plan

## Purpose

This project is primarily a backend and streaming-systems demo. The strongest engineering story is the async processor, Kafka/Redpanda event flow, TimescaleDB persistence, FastAPI read layer, anomaly detection path, and AI sidecars for summarization and sentiment enrichment.

The frontend is still important because it is the operational console that makes that backend pipeline visible. A small frontend test suite should protect the dashboard from regressions in API-contract rendering and key user interactions.

The goal is not to create a large UI test suite. The goal is to add enough coverage that future frontend polish does not accidentally break:

- Symbol/window controls.
- KPI value rendering.
- Alert feed behavior.
- Headline feed behavior.
- Loading, empty, and missing-data states where they affect the dashboard contract.

Frontend tests should stay intentionally small because over-testing visual details would make the suite brittle and distract from the backend-focused purpose of the project.

## Current Frontend Architecture

The frontend is a React dashboard built with:

- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts

The dashboard is organized around `frontend/src/app/dashboard-page.tsx`.

The main page owns the selected symbol filter, selected time window, selected alert, and active dashboard tab. It delegates data orchestration to `useDashboardData` and renders a compact operational console.

Key pieces:

- `DashboardControls`: symbol and time-window buttons.
- `KPIStack`: per-symbol market snapshot for BTC and ETH.
- `AlertsRail`: operational anomaly event feed.
- `HeadlinesRail`: operational headline/event feed.
- `LiveStatusRail`: stream and freshness health summary.
- `MarketOverviewChart`: price chart with alert overlay dots.
- `SignalTrendChart`: return/volatility signal chart.
- `useDashboardData`: combines prices, metrics, alerts, and headlines into dashboard-ready props.

## Testing Strategy

Prefer component behavior tests over visual snapshot tests.

The tests should verify what the user can observe and what the backend contracts provide:

- Does representative API-shaped data render correctly?
- Do missing values render safely?
- Do important callbacks fire?
- Do links and accessibility-relevant interactions behave as expected?

Avoid brittle assertions around:

- Exact Tailwind class names.
- Pixel spacing.
- Exact colors.
- Shadows, borders, radius, or other polish details.
- Recharts internals.
- Full dashboard screenshots.

Use representative mock data shaped like the real API responses. This catches practical regressions without mocking the entire backend or duplicating processor tests.

## Proposed Tooling

Use the standard Vite/React testing stack:

- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- `jsdom`

Why this fits:

- Vitest integrates cleanly with Vite and TypeScript.
- Testing Library encourages user-facing behavior tests instead of implementation tests.
- `jest-dom` gives readable DOM assertions.
- `user-event` is better than manually firing low-level events for clicks and keyboard behavior.
- `jsdom` is sufficient for component tests that do not require a real browser layout engine.

## Test Coverage Plan

### `DashboardControls`

Purpose: protect the primary user controls for the dashboard query state.

Proposed tests:

- Renders symbol options: `Both`, `BTC`, `ETH`.
- Renders window options: `5m`, `15m`, `30m`.
- Calls `onChangeSymbol` when a symbol option is clicked.
- Calls `onChangeWindow` when a window option is clicked.

Avoid:

- Testing exact active-button classes.
- Testing visual color treatment.

### `KPIStack`

Purpose: protect rendering of the per-symbol market snapshot.

Proposed tests:

- Renders BTC and ETH cards from representative `MarketStatusCard` data.
- Renders formatted prices.
- Renders 1-minute return, return z-score, volatility z-score, and attention.
- Renders freshness text from `freshnessTs`.
- Formats missing values as `n/a`.

Avoid:

- Testing the local timer implementation directly beyond stable rendered freshness behavior.
- Testing exact card accent classes.

### `AlertsRail`

Purpose: protect the anomaly event feed, which is one of the dashboard's most important backend-demo surfaces.

Proposed tests:

- Renders alert metadata: symbol, window, direction, relative age.
- Renders full alert summary text.
- Renders `summarizing...` when `summary` is `null`.
- Renders return and threshold values.
- Renders sentiment and headline freshness when available.
- Renders headline context when present.
- Calls `onSelectAlert` when an alert row is clicked.
- Calls `onSelectAlert` on keyboard activation with `Enter` and `Space`.
- Preserves loading, error, and empty states.

Avoid:

- Testing the direction SVG path.
- Testing exact red/green/orange classes.
- Testing list animation or visual depth.

### `HeadlinesRail`

Purpose: protect headline/feed rendering and external-link behavior.

Proposed tests:

- Renders source, sentiment label, relative age, and title.
- Renders an external link when `url` exists.
- Uses `target="_blank"` and safe `rel` attributes for links.
- Renders title as plain text when `url` is missing.
- Preserves loading, error, and empty states.

Avoid:

- Testing the inline SVG icon details.
- Testing exact sentiment color classes.
- Testing exact age text every second. Use a controlled timestamp or fake timers if needed.

### `useDashboardData` And Data Transforms

Do not test `useDashboardData` deeply in the first pass.

The hook combines network-backed hooks, memoized transforms, alert overlays, metric history, and selected filters. A direct test would require a lot of mocking and may become brittle.

Better approach:

- Keep component tests focused first.
- If chart/data transform regressions become likely, extract pure helpers from `useDashboardData` into a small utility module.
- Test those pure helpers separately with simple inputs and outputs.

Candidate pure logic for later extraction:

- Symbol filtering.
- Price window filtering.
- Alert overlay point matching.
- Metric snapshot normalization.

### Charts

Avoid deep Recharts tests initially.

Recharts depends on browser-like layout behavior and can make unit tests noisy. The project does not need chart-internals coverage right now.

Acceptable first-pass chart tests:

- Smoke test empty states if they are easy to render.
- Test pure data transforms only if they are extracted cleanly.

Avoid:

- Testing SVG paths.
- Testing Recharts axes, legends, or tooltip internals.
- Snapshotting chart output.

## Non-Goals

- No screenshot testing for now.
- No Playwright or full end-to-end browser automation yet.
- No testing exact CSS colors, spacing, Tailwind classes, shadows, borders, or radius.
- No mocking the whole backend.
- No duplicating backend or processor test coverage in the frontend.
- No testing Recharts rendering internals.
- No broad refactor just to make tests easier.

## Implementation Steps

1. Add frontend test dependencies.

   ```bash
   cd frontend
   npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
   ```

2. Add a Vitest setup file.

   Suggested path:

   ```text
   frontend/src/test/setup.ts
   ```

   It should import:

   ```ts
   import '@testing-library/jest-dom/vitest'
   ```

3. Add or update Vite/Vitest config.

   Configure:

   - `environment: 'jsdom'`
   - setup file path
   - React plugin remains unchanged

4. Add a test script to `frontend/package.json`.

   Suggested scripts:

   ```json
   {
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```

5. Add tests in small batches.

   Recommended order:

   1. `DashboardControls`
   2. `AlertsRail`
   3. `HeadlinesRail`
   4. `KPIStack`

6. Run verification commands.

   ```bash
   cd frontend
   npm run test
   npm run build
   npm run lint
   ```

7. Rebuild the frontend container only after local test/build/lint pass.

   ```bash
   cd infra
   docker compose --env-file .env up -d --build frontend
   ```

## Suggested File Layout

```text
frontend/src/test/setup.ts
frontend/src/features/dashboard/dashboard-controls.test.tsx
frontend/src/features/dashboard/kpi-stack.test.tsx
frontend/src/features/dashboard/alerts-rail.test.tsx
frontend/src/features/dashboard/headlines-rail.test.tsx
```

If pure transform helpers are extracted later:

```text
frontend/src/features/dashboard/dashboard-transforms.ts
frontend/src/features/dashboard/dashboard-transforms.test.ts
```

## Definition Of Done

For this planning step:

- This document exists at `docs/frontend_testing_plan.md`.
- The plan explains why frontend tests are useful in a backend-focused project.
- The plan is specific to the current dashboard architecture.
- The plan identifies what to test and what not to over-test.
- No frontend code, backend code, processor code, Docker config, or package dependencies are changed.

For the eventual implementation:

- Frontend test dependencies are added.
- Vitest is configured with jsdom and Testing Library setup.
- The first component tests pass.
- `npm run test` passes.
- `npm run build` passes.
- `npm run lint` passes.
- The frontend container rebuilds successfully.

## Future Work

- Add lightweight chart empty-state smoke tests.
- Extract and test pure dashboard data transforms only if transform complexity grows.
- Consider Playwright later if the UI becomes workflow-heavy or if route-level behavior becomes important.
- Consider MSW only if frontend tests need realistic network-bound API behavior. Do not add it for the first lean component-test pass.
