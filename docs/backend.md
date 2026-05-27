# Backend (FastAPI) cheat sheet

## What it is
- Thin read-only API over TimescaleDB.
- Exposes latest prices/metrics/headlines/alerts for the frontend.
- No Kafka consumption or writes; everything is pulled from DB.

## Endpoints
- `GET /health` — pings DB (`SELECT 1`); 200 on OK, 503 on failure.
- `GET /diagnostics/pipeline` — read-only DB diagnostics for pipeline freshness, recent row counts, and `ok` / `degraded` / `stale` / `down` status; does not inspect Kafka.
- `GET /prices?symbol=&limit=` — latest ticks (desc). Params: `symbol` (required, case-insensitive), `limit` (default 200).
- `GET /metrics/latest?symbol=` — most recent rollup for a symbol; 404 if none.
- `GET /headlines?limit=&since=` — recent headlines with sentiment. Params: `limit` (default 20), `since` (optional ISO 8601).
- `GET /headlines/stream?limit=&interval=` — SSE stream of recent headlines (polls DB).
- `GET /alerts?limit=&since=` — recent anomalies (symbol, window, direction, return, threshold, summary, headline, sentiment). Params: `limit` (default 20), `since` (optional ISO 8601).
- `GET /alerts/stream?limit=&interval=` — SSE stream of recent alerts (polls DB).

## Config
- `backend/app/config.py` via pydantic-settings.
  - `database_url`
    - Compose default: `postgresql://postgres:postgres@timescaledb:5432/anomalies`
    - Local host runs: `postgresql://postgres:postgres@localhost:5432/anomalies`
  - `kafka_brokers` not used yet (reserved for future streaming).
  - Topics kept for parity: `price_topic`, `news_topic`, `alerts_topic`.
  - Host/port: `api_host` (0.0.0.0), `api_port` (8000).
  - Loads `.env` in `backend/.env` first, then falls back to `infra/.env` if present.

## DB layer
- `backend/app/db.py`: asyncpg pool; helpers:
  - `fetch_prices(symbol, limit)`
  - `fetch_latest_metrics(symbol)`
  - `fetch_headlines(limit)`
  - `fetch_alerts(limit)`
  - diagnostics helpers for latest price/metric/headline/alert timestamps and recent counts
- No schema creation here (processor handles DDL).

## Diagnostics
- `/health` is intentionally cheap and suitable for container/load-balancer health checks.
- `/diagnostics/pipeline` runs TimescaleDB reads only; it does not inspect Kafka offsets or broker state.
- Core freshness checks:
  - prices: `ok` up to 15s, `degraded` up to 60s, `stale` after 60s
  - metrics: `ok` up to 20s, `degraded` up to 90s, `stale` after 90s
  - headlines: `ok` up to 30m, `degraded` up to 2h, `stale` after 2h
  - alerts: informational; no recent alert does not make the pipeline unhealthy
- Counts are reported for prices, metrics, headlines, and alerts over `15m` and `1h` windows.

## How to run
```
cd infra
docker compose up -d backend timescaledb redpanda processor
curl http://localhost:8000/health
```
Local dev (venv):
```
cd backend
cp .env.example .env  # set local DATABASE_URL if needed
PYTHONPATH=.. .venv/bin/uvicorn app.main:app --reload
```

## Tests
- Unit tests in `backend/tests_unit`.
- Integration tests in `backend/tests_integration` (against Timescale).
Run all:
```
cd backend
PYTHONPATH=.. .venv/bin/python -m pytest tests_unit tests_integration
```

## Data it serves (from Timescale)
- `prices`: time, symbol, price (PK time+symbol).
- `metrics`: return_1m/5m/15m, vol_1m/5m/15m, attention.
- `headlines`: time, title, url, source, sentiment.
- `anomalies`: time, symbol, window_name, direction, return_value, threshold, headline, sentiment, summary.

## Notes
- Stateless; scaling is just more backend containers behind a load balancer.
- If Kafka streaming to clients is needed later, add a WS/SSE endpoint fed from Redpanda; DB reads stay as-is for history. 
