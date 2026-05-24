# Observability Implementation Plan

## Purpose
Add practical observability to the Real-Time Crypto Intelligence Pipeline without changing the core data flow. The goal is to make pipeline freshness, alert behavior, sidecar health, and failure modes easy to inspect during local runs and demos.

This plan excludes Prometheus, Grafana, OpenTelemetry, and frontend observability dashboards for now. The first pass should use lightweight JSON diagnostics, existing runtime counters, structured logs, and targeted tests.

## Current State
- The backend exposes a lightweight `GET /health` endpoint that checks DB reachability.
- The processor can expose a JSON `/metrics` endpoint through `processor/src/metrics_http.py`.
- The summary sidecar can expose JSON `/metrics` when `SUMMARY_METRICS_PORT` is configured.
- The sentiment sidecar can expose JSON `/metrics` when `SENTIMENT_METRICS_PORT` is configured.
- Runtime metrics are stored in `MetricsRegistry` as counters and rolling observations.
- The processor already tracks anomaly decision counters such as emitted, suppressed by threshold, and suppressed by cooldown.
- Alerts and summary requests already carry deterministic `event_id` values in Kafka payloads.

## Non-Goals
- No Prometheus/Grafana compose profile in this phase.
- No OpenTelemetry or distributed tracing stack.
- No new observability libraries.
- No frontend observability dashboard yet.
- No direct Kafka broker inspection from the backend diagnostics endpoint in the first version.
- No tests that assert exact log message prose.

## Backend Diagnostics Endpoint
Add a read-only endpoint:

```text
GET /diagnostics/pipeline
```

The endpoint should query TimescaleDB only. It should not consume Kafka, inspect broker offsets, or mutate state.

Recommended payload:

```json
{
  "status": "ok",
  "db": "ok",
  "generated_at": "2026-05-24T08:00:00+00:00",
  "freshness": {
    "prices": {
      "btcusdt": {"latest_time": "...", "age_sec": 3, "status": "ok"},
      "ethusdt": {"latest_time": "...", "age_sec": 4, "status": "ok"}
    },
    "metrics": {
      "btcusdt": {"latest_time": "...", "age_sec": 4, "status": "ok"},
      "ethusdt": {"latest_time": "...", "age_sec": 5, "status": "ok"}
    },
    "headlines": {"latest_time": "...", "age_sec": 420, "status": "ok"},
    "alerts": {"latest_time": "...", "age_sec": 1800, "status": "ok"}
  },
  "counts": {
    "15m": {"prices": 1200, "metrics": 500, "headlines": 3, "alerts": 1},
    "1h": {"prices": 4800, "metrics": 2100, "headlines": 12, "alerts": 4}
  },
  "reasons": []
}
```

Status levels:
- `ok`: data is fresh enough for the service type.
- `degraded`: one or more streams are stale, but the backend and DB are reachable.
- `stale`: core data has not updated within the expected freshness window.
- `down`: DB query failed or the endpoint cannot produce diagnostics.

First-version DB helpers:
- latest price time by symbol from `prices`
- latest metric time by symbol from `metrics`
- latest headline time from `headlines`
- latest anomaly time from `anomalies`
- counts for `prices`, `metrics`, `headlines`, and `anomalies` over 15 minutes and 1 hour

## Health Endpoint
Keep `GET /health` cheap.

Current behavior should remain valid:
- DB ping through `SELECT 1`
- `200` on healthy DB
- `503` on DB failure

Optional refinement:
- Keep `/health` as the uptime/load-balancer check.
- Put expensive freshness/count queries only in `/diagnostics/pipeline`.
- If `/health` is extended, include only a compact status summary and avoid table scans.

## Runtime Metrics
The existing JSON `/metrics` endpoints should be standardized before adding a monitoring stack.

Target services:
- processor
- summary sidecar
- sentiment sidecar

Current implementation:
- `processor/src/metrics.py` provides counters and rolling observations.
- `processor/src/metrics_http.py` serves the registry snapshot as JSON.
- processor uses the global registry with optional namespacing.
- sentiment sidecar owns a local `MetricsRegistry(service_name="sentiment_sidecar")`.
- summary sidecar uses the global registry namespace `summary`.

Recommended metric names:
- `processor.prices_ingested`
- `processor.news_ingested`
- `processor.price_dlq`
- `processor.price_dlq_failed`
- `processor.anomaly_candidates`
- `processor.anomaly_emitted`
- `processor.anomaly_suppressed_threshold`
- `processor.anomaly_suppressed_cooldown`
- `processor.anomaly_emitted_without_headline`
- `processor.latest_price_age_sec`
- `processor.latest_headline_age_sec`
- `summary.summary_batches`
- `summary.summary_success`
- `summary.summary_failures`
- `summary.summary_dlq`
- `summary.summary_dlq_failed`
- `summary.summary_publish_skipped`
- `summary.summary_latency_ms`
- `sentiment_sidecar.sentiment_batches`
- `sentiment_sidecar.sentiment_errors`
- `sentiment_sidecar.sentiment_fallbacks`
- `sentiment_sidecar.sentiment_dlq`
- `sentiment_sidecar.sentiment_dlq_failed`
- `sentiment_sidecar.sentiment_infer_ms`
- `sentiment_sidecar.queue_lag_ms`

Implementation notes:
- Preserve existing metric names where they are already used by tests.
- Add aliases only if a rename would break too much existing coverage.
- Keep JSON output for now; Prometheus format can be added later.
- Avoid high-cardinality labels in the current registry design.

## Structured Logging
Standardize important log fields so pipeline events can be traced in plain Docker logs.

Recommended common fields:
- `event_id`
- `symbol`
- `window`
- `topic`
- `consumer_group`
- `operation`
- `duration_ms`
- `error`

Key log events to normalize:
- price consumed
- price persisted
- metrics computed
- anomaly emitted
- anomaly suppressed
- summary request published
- summary request received
- summary persisted
- enriched alert skipped because already published
- enriched alert published during recovery
- summary DLQ write
- sentiment batch processed
- sentiment enriched event published
- sentiment DLQ write

Implementation guidance:
- Do not assert exact log text in tests.
- Prefer tests only where a log field is part of a contract, such as `event_id` propagation.
- Keep log messages short and stable.

## Event ID / Correlation
Treat `event_id` as tracing-lite for the alert path.

Current event ID shape:
- alert/summary: `{time}:{symbol}:{window}`
- enriched news: `news:{source}:{hash}`

Target propagation:
- Kafka `alerts`
- Kafka `summaries`
- summary sidecar logs
- summary DLQ records
- enriched alert if published
- backend alert response if the DB schema supports it later

Current gap:
- The `anomalies` table does not currently store `event_id`; it uses `(time, symbol, window_name)` as the primary key.
- Backend alert responses are reconstructed from DB rows and do not currently include `event_id`.

Recommended approach:
- Do not add a DB `event_id` column in the first diagnostics phase.
- Document that `(time, symbol, window)` is the DB correlation key.
- Consider adding a generated/reconstructed `event_id` to backend alert responses later if useful.

## Freshness Targets
Freshness thresholds should be explicit so stale data is not confused with service failure.

Initial operational targets:
- prices: `ok` under 15 seconds, `degraded` under 60 seconds, `stale` after 60 seconds
- metrics: `ok` under 20 seconds, `degraded` under 90 seconds, `stale` after 90 seconds
- headlines: `ok` under 30 minutes, `degraded` under 2 hours, `stale` after 2 hours
- alerts: informational; no recent alert is not necessarily unhealthy
- summaries: asynchronous; pending summaries are acceptable if the summary sidecar is running and DLQ is not growing

Notes:
- RSS feeds can naturally lag. Old headlines should not automatically mark the whole pipeline down.
- Alerts are event-driven. A quiet market should not be treated as failure.
- Price and metric freshness are the strongest indicators of core pipeline health.

## Testing Plan
Backend diagnostics tests:
- unit test DB helper query shaping with mocked rows
- integration test `/diagnostics/pipeline` against seeded Timescale data
- test `ok`, `degraded`, and `stale` status decisions
- test DB failure returns a clear `down`/error response

Processor metrics tests:
- verify counters increment for price ingest, anomaly emitted, threshold suppression, cooldown suppression, and DLQ paths where practical
- verify rolling observations are present for latency/freshness metrics
- avoid tests that depend on exact timing unless fake time is used

Sidecar metrics tests:
- summary sidecar processed/failed/DLQ counters
- summary latency observation
- sentiment processed/error/fallback/DLQ counters
- sentiment queue lag and inference timing observations

Structured logging tests:
- only test fields that protect correlation behavior, such as `event_id`
- avoid brittle assertions around full log text

## Implementation Phases

### Phase 1: Backend Diagnostics Endpoint
Add DB helpers and `GET /diagnostics/pipeline`.

Deliverables:
- diagnostics DB helper functions
- endpoint payload model or plain typed dict
- backend tests for freshness/count payload
- backend docs update

Why first:
- It is easy to demo.
- It gives immediate visibility into pipeline state without adding infrastructure.
- It avoids Kafka inspection complexity.

### Phase 2: Freshness Status Model
Centralize `ok`/`degraded`/`stale`/`down` status decisions.

Deliverables:
- small backend helper for age-to-status classification
- explicit freshness thresholds
- tests for boundary behavior
- optional compact `/health` summary if it stays cheap

### Phase 3: Runtime Metrics Cleanup
Audit existing runtime counters and standardize names where safe.

Deliverables:
- documented metric inventory
- missing counters added for important failure paths
- tests for high-value counters
- no Prometheus format yet

### Phase 4: Structured Log Field Consistency
Normalize log extras for key pipeline events.

Deliverables:
- consistent `event_id`, `symbol`, `window`, `topic`, `operation`, `duration_ms`, `error`
- no broad logging rewrite
- targeted tests only where useful

### Phase 5: Documentation Updates
Update:
- `docs/backend.md`
- `docs/processor.md`
- `docs/architecture.md`
- main `README.md` if the diagnostics endpoint becomes part of the demo flow

### Later: Prometheus/Grafana Profile
Out of scope for this plan.

Possible later work:
- Prometheus scrape config
- Grafana dashboard JSON
- compose profile `observability`
- optional Prometheus-format endpoint adapter

## Definition of Done
- The backend can explain current pipeline freshness from one read-only diagnostics endpoint.
- Processor and sidecar runtime metrics expose useful counters and rolling observations consistently.
- Logs carry enough fields to trace alert and summary events by `event_id`.
- Freshness semantics are documented and tested.
- No monitoring stack is required for local development.
