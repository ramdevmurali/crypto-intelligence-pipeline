# Data model & topics

## Kafka topics
- `prices`: raw price ticks. Example
  ```json
  {"time":"2026-01-27T19:20:00Z","symbol":"btcusdt","price":42750.12}
  ```
- `news`: RSS headlines with sentiment. Example
  ```json
  {"time":"2026-01-27T19:19:00Z","title":"SEC delays ETF decision","url":"https://...","source":"coindesk","sentiment":-0.4}
  ```
- `alerts`: emitted when thresholds breached. Example
  ```json
  {"time":"2026-01-27T19:20:30Z","symbol":"ethusdt","window":"1m","direction":"down","ret":-0.052,"threshold":0.05,"headline":"SEC delays ETF decision","sentiment":-0.4,"summary":"ETH fell 5.2% in 1m; headline negative."}
  ```

## TimescaleDB tables
- `prices(time, symbol, price)` — hypertable for raw ticks; PK `(time, symbol)`; index by `(symbol, time desc)`.
- `metrics(time, symbol, return_1m, return_5m, return_15m, vol_1m, vol_5m, vol_15m, return_z_*, return_z_ewma_*, vol_z_*, vol_spike_*, p05_return_*, p95_return_*, attention)` — rolling metrics per symbol; PK `(time, symbol)`; index `(symbol, time desc)`.
- `headlines(time, title, source, url, sentiment)` — recent RSS items with basic sentiment; PK `(time, title)`; index `(time desc)`.
- `anomalies(time, symbol, window_name, direction, return_value, threshold, headline, sentiment, summary, alert_published)` — persisted alerts with context and publish idempotency; PK `(time, symbol, window_name)`; index `(symbol, time desc)`.

## Applying schema
Preferred migration path:
```
PYTHONPATH=processor/src:. .venv/bin/python scripts/migrate_db.py
```

Manual SQL snapshot:
```
psql "$DATABASE_URL" -f infra/schema.sql
```
Ensure TimescaleDB image has the extension preinstalled (true for the compose image).

Keep `infra/schema.sql` aligned with `scripts/migrate_db.py`; the Python migration is the source used by Makefile and tests.
