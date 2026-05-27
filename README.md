# Real-Time Crypto Intelligence Pipeline

A real-time data pipeline for crypto prices and news. It ingests Binance ticks and RSS headlines, publishes events through Redpanda/Kafka, stores time-series data in TimescaleDB, detects price anomalies, enriches events through sidecars, and exposes the result through a FastAPI API and React dashboard.

## Stack
- **Processor:** Python async services, aiokafka, asyncpg, websockets, feedparser
- **Streaming:** Redpanda/Kafka-compatible topics
- **Database:** TimescaleDB/Postgres
- **Backend:** FastAPI, asyncpg, REST + SSE endpoints
- **Sidecars:** LLM summary sidecar, ONNX/default sentiment sidecar with fallback behavior
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, TanStack Query, Recharts
- **Infra/tests:** Docker Compose, Makefile runbooks, pytest, pytest-asyncio, Vitest, React Testing Library

## Architecture
```text
[Binance WS]      [RSS feeds]
     |                |
     v                v
[processor ingest] -> [Redpanda / Kafka topics]
     |                         |
     v                         v
[TimescaleDB prices/metrics]  [summary + sentiment sidecars]
     |                         |
     v                         v
[FastAPI REST/SSE] <------ [TimescaleDB headlines/anomalies]
     |
     v
[React dashboard]
```

Deeper architecture notes live in [`docs/architecture.md`](docs/architecture.md).

Related docs:
- [`docs/processor.md`](docs/processor.md)
- [`docs/backend.md`](docs/backend.md)
- [`docs/frontend.md`](docs/frontend.md)
- [`docs/math.md`](docs/math.md)
- [`docs/anomaly_diagnostics.md`](docs/anomaly_diagnostics.md)
- [`docs/backend_tests.md`](docs/backend_tests.md)
- [`docs/processor_tests.md`](docs/processor_tests.md)

## Key features
- Binance WebSocket price ingestion for BTC and ETH.
- RSS headline ingestion with source, URL, timestamp, and sentiment fields.
- Kafka-compatible event flow through Redpanda topics.
- TimescaleDB persistence for prices, metrics, headlines, and anomalies.
- Rolling-window metrics: returns, volatility, z-scores, percentiles, and attention.
- Threshold-based anomaly detection with cooldown handling.
- Summary sidecar that consumes summary jobs and backfills anomaly summaries asynchronously.
- Sentiment sidecar that enriches headline sentiment without blocking ingest.
- Dead-letter topics and local DLQ buffer fallback for failed summary messages.
- Probe, replay, migration, and runtime verification scripts.
- React dashboard for prices, signals, alerts, headlines, KPIs, and service health.

## Design choice: lightweight anomaly detection
The anomaly path intentionally uses streaming math instead of a heavy model in the processor hot path. Each price tick updates rolling windows and computes returns, volatility, z-scores, percentile bands, and an attention score. Alerts are emitted from fixed threshold rules with cooldown handling.

This keeps detection deterministic, low-latency, explainable, and easy to inspect. LLM summarization runs later in the summary sidecar after an alert is emitted, so model latency or failure does not block ingestion, metric computation, or alert publication.

The goal is an explainable anomaly signal inside a resilient real-time pipeline, not a claim of predictive trading accuracy. Thresholds are operational defaults and can be tuned with historical backtesting.

## Observability
- `GET /health` stays cheap and only verifies backend DB reachability.
- `GET /diagnostics/pipeline` reports DB-backed pipeline freshness, recent row counts, and `ok` / `degraded` / `stale` / `down` status without inspecting Kafka directly.
- Processor and sidecars expose lightweight JSON runtime metrics for ingestion, freshness, anomaly decisions, summary jobs, sentiment jobs, DLQ paths, and latency observations.
- Docker logs include structured fields such as `event_id`, `symbol`, `window`, `topic`, `operation`, offsets, and error metadata for tracing alert, summary, and sentiment paths.

See [`docs/observability.md`](docs/observability.md) for the implemented observability model and current non-goals.

## Running locally
Prereqs: Docker, Docker Compose, Python 3.11+, Node 20+.

Create local env:
```bash
cp infra/.env.example infra/.env
```

Apply DB schema:
```bash
make migrate-db
```

Start the stack:
```bash
cd infra
docker compose --env-file .env up -d redpanda timescaledb redis backend processor summary-sidecar sentiment-sidecar frontend
```

Check services:
```bash
curl http://localhost:8000/health
curl 'http://localhost:8000/alerts?limit=5'
curl 'http://localhost:8000/headlines?limit=5'
```

Open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Docker / Compose
- `redpanda`: Kafka-compatible broker on local port `9092`.
- `timescaledb`: Postgres/Timescale on local port `5432`.
- `redis`: configured runtime dependency for future/cache paths.
- `processor`: price/news ingest, metrics, anomaly detection.
- `summary-sidecar`: consumes summary jobs and updates anomaly summaries.
- `sentiment-sidecar`: consumes news and enriches headline sentiment.
- `backend`: FastAPI read API on `8000`.
- `frontend`: React dashboard on `3000`.

## Env
Core config lives in [`infra/.env.example`](infra/.env.example).

Common defaults:
- `SYMBOLS=btcusdt,ethusdt`
- `KAFKA_BROKERS=redpanda:29092`
- `DATABASE_URL=postgres://postgres:postgres@timescaledb:5432/anomalies`
- `NEWS_RSS=https://www.coindesk.com/arc/outboundfeeds/rss/`
- `LLM_PROVIDER=stub`
- `SENTIMENT_PROVIDER=onnx`
- `SENTIMENT_FAIL_FAST=false`
- `ANOMALY_TEST_MODE=false`

Model assets for ONNX sentiment are expected under `models/finbert/` unless `SENTIMENT_MODEL_PATH` is changed.

## Tests & lint
Backend:
```bash
cd backend
PYTHONPATH=.. .venv/bin/python -m pytest tests_unit tests_integration
```

Processor:
```bash
python3 -m pytest -q processor/tests
```

Processor smoke test:
```bash
make smoke-test
```

Frontend:
```bash
cd frontend
npm run test
npm run build
npm run lint
```

## Demo
Dashboard overview:

![Dashboard overview](docs/assets/dashboard-overview-v2.png)

Signal trends:

![Signal trends](docs/assets/signals-v2.png)

Alerts feed:

![Alerts feed](docs/assets/alerts-feed-v2.png)

Headlines feed:

![Headlines feed](docs/assets/headlines-feed-v2.png)

## Known limitations
- This is not a trading system and does not place orders.
- No schema registry yet; JSON payload contracts are enforced through typed models and tests.
- LLM summaries are asynchronous and can lag newly emitted alerts.
- Sentiment enrichment depends on local model assets unless fallback behavior is used.
- Frontend tests focus on component behavior, not visual snapshots or Recharts internals.
- Compose defaults are for local development, not hardened deployment.

## How to extend / Documentation
- Add or change stream behavior in `processor/src/services/ingest.py` and `processor/src/services/price_pipeline.py`.
- Change anomaly logic in `processor/src/domain/anomaly.py` and metric logic in `processor/src/domain/metrics.py`.
- Add backend read endpoints in `backend/app/main.py` and DB helpers in `backend/app/db.py`.
- Add dashboard views under `frontend/src/features/dashboard/`.
- Run `make verify-runtime` after processor/sidecar deploy changes.
- Use `scripts/probe_anomaly_path.py` to validate anomaly and summary flow.
- Use `make replay-summaries-dlq` to replay failed summary jobs.
