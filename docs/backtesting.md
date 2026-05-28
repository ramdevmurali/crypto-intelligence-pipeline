# Anomaly Backtesting

This project uses an offline threshold backtester to sanity-check anomaly settings against exported price rows. It is intentionally small: the goal is threshold inspection and tuning, not trading PnL or predictive accuracy.

## Purpose
- Replay historical or exported price rows through the same rolling-window math used by the processor.
- Apply the current anomaly thresholds and cooldown behavior.
- Produce a manual review table showing when alerts would have fired and why.
- Keep validation separate from the live pipeline.

## Input
The script accepts CSV, JSON, or JSONL files with these fields:

```text
time,symbol,price
```

Example CSV:

```csv
time,symbol,price
2026-01-27T12:00:00+00:00,btcusdt,100.0
2026-01-27T12:01:00+00:00,btcusdt,106.0
```

JSON input can be either a list of rows or an object with a `prices` list.

## What It Reuses
The backtester does not implement a separate detector. It imports and reuses:
- `PriceWindow`
- `compute_metrics`
- `detect_anomalies`
- configured windows and thresholds

That keeps offline validation aligned with the processor hot path.

## Running
```bash
PYTHONPATH=. .venv/bin/python scripts/backtest_anomaly_thresholds.py path/to/prices.csv
```

Or through the Makefile:

```bash
make backtest-anomalies ARGS="path/to/prices.csv"
```

Override thresholds for tuning:

```bash
PYTHONPATH=. .venv/bin/python scripts/backtest_anomaly_thresholds.py path/to/prices.csv \
  --threshold-1m 0.03 \
  --threshold-5m 0.06 \
  --threshold-15m 0.10
```

Write fired alerts to CSV:

```bash
PYTHONPATH=. .venv/bin/python scripts/backtest_anomaly_thresholds.py path/to/prices.csv \
  --output-csv reports/anomaly_backtest.csv
```

## Output
The text report includes:
- rows seen
- metric rows computed
- symbols replayed
- total alerts fired
- manual review rows with:
  - alert time
  - symbol
  - window
  - direction
  - return
  - threshold
  - EWMA z-score
  - volatility z-score
  - attention score

## Interpretation
Use the output to answer:
- Did alerts fire at times that look operationally meaningful?
- Are thresholds too sensitive or too quiet?
- Does cooldown suppress repeated alerts as expected?
- Which window is responsible for most alert volume?

This is not a claim of market prediction quality. It is a validation tool for explainable threshold behavior inside the real-time pipeline.

## Limitations
- No labeled ground-truth precision/recall yet.
- No PnL or trading simulation.
- No news/sentiment replay in the first version.
- The output is meant for manual review and threshold tuning.
