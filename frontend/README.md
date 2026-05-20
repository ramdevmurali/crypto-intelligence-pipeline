# Frontend

React dashboard for the Real-Time Crypto Intelligence Pipeline. It is a read-only operational UI that shows live prices, signal trends, anomaly alerts, headlines, KPI freshness, and service health from the backend API.

The frontend makes the streaming pipeline visible; it does not own anomaly detection, persistence, summary generation, or sentiment enrichment.

## Stack
- React
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Recharts
- Vitest + Testing Library

## Local development
```bash
npm install
npm run dev
```

Default local URL:
```text
http://localhost:3000
```

The dashboard expects the backend API to be running and reachable through the configured frontend API base URL.

## Test, build, and lint
```bash
npm run test
npm run build
npm run lint
```

## Docker
From `../infra`:

```bash
docker compose --env-file .env up -d --build frontend
```

Run the backend and pipeline services as well for full dashboard behavior.

## More detail
See the full frontend guide: [`../docs/frontend.md`](../docs/frontend.md).
