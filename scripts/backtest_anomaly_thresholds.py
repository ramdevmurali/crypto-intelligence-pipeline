#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from processor.src.config import get_thresholds, get_windows, settings
from processor.src.domain.anomaly import HeadlineContext, detect_anomalies
from processor.src.domain.metrics import compute_metrics
from processor.src.domain.windows import PriceWindow
from processor.src.utils import parse_iso_datetime


@dataclass(frozen=True)
class PricePoint:
    time: datetime
    symbol: str
    price: float


@dataclass(frozen=True)
class BacktestAlert:
    time: datetime
    symbol: str
    window: str
    direction: str
    return_value: float
    threshold: float
    return_z_ewma: float | None
    vol_z: float | None
    attention: float | None


@dataclass(frozen=True)
class BacktestResult:
    rows_seen: int
    metrics_computed: int
    symbols: tuple[str, ...]
    alerts: tuple[BacktestAlert, ...]


def _new_price_window() -> PriceWindow:
    windows = get_windows()
    return PriceWindow(
        history_maxlen=settings.window_history_maxlen,
        max_window=max(windows.values()),
        vol_resample_sec=settings.vol_resample_sec,
        window_max_gap_factor=settings.window_max_gap_factor,
        vol_max_gap_factor=settings.vol_max_gap_factor,
    )


def _parse_point(raw: dict) -> PricePoint:
    try:
        time = parse_iso_datetime(raw["time"])
        symbol = str(raw["symbol"]).strip().lower()
        price = float(raw["price"])
    except KeyError as exc:
        raise ValueError(f"missing required price field: {exc.args[0]}") from exc
    if not symbol:
        raise ValueError("symbol must not be empty")
    if price <= 0:
        raise ValueError("price must be positive")
    return PricePoint(time=time, symbol=symbol, price=price)


def load_price_points(path: str | Path) -> list[PricePoint]:
    source = Path(path)
    if source.suffix.lower() == ".csv":
        with source.open(newline="") as handle:
            return [_parse_point(row) for row in csv.DictReader(handle)]

    if source.suffix.lower() == ".jsonl":
        with source.open() as handle:
            return [_parse_point(json.loads(line)) for line in handle if line.strip()]

    with source.open() as handle:
        payload = json.load(handle)
    rows = payload.get("prices", payload) if isinstance(payload, dict) else payload
    if not isinstance(rows, list):
        raise ValueError("JSON input must be a list of price rows or an object with a prices list")
    return [_parse_point(row) for row in rows]


def _thresholds_from_args(args: argparse.Namespace) -> dict[str, float]:
    thresholds = dict(get_thresholds())
    overrides = {
        "1m": args.threshold_1m,
        "5m": args.threshold_5m,
        "15m": args.threshold_15m,
    }
    for window, value in overrides.items():
        if value is not None:
            if value <= 0:
                raise ValueError(f"threshold for {window} must be positive")
            thresholds[window] = value
    return thresholds


def run_backtest(
    points: Iterable[PricePoint],
    *,
    thresholds: dict[str, float] | None = None,
    cooldown_sec: int | None = None,
) -> BacktestResult:
    windows = get_windows()
    thresholds = dict(thresholds or get_thresholds())
    cooldown_sec = settings.anomaly_cooldown_sec if cooldown_sec is None else cooldown_sec
    if cooldown_sec < 0:
        raise ValueError("cooldown_sec must be >= 0")

    price_windows: dict[str, PriceWindow] = {}
    last_alerts = {}
    alerts: list[BacktestAlert] = []
    rows_seen = 0
    metrics_computed = 0

    sorted_points = sorted(points, key=lambda point: (point.time, point.symbol))
    for point in sorted_points:
        rows_seen += 1
        if point.symbol not in price_windows:
            price_windows[point.symbol] = _new_price_window()

        price_windows[point.symbol].add(point.time, point.price)
        metrics = compute_metrics(
            price_windows,
            point.symbol,
            point.time,
            windows=windows,
            thresholds=thresholds,
            settings=settings,
        )
        if not metrics:
            continue
        metrics_computed += 1

        events = detect_anomalies(
            point.symbol,
            point.time,
            metrics,
            thresholds,
            last_alerts,
            HeadlineContext(headline=None, sentiment=None, headline_ts=None),
            anomaly_cooldown_sec=cooldown_sec,
            headline_max_age_sec=settings.headline_max_age_sec,
        )
        for event in events:
            last_alerts[(event.symbol, event.window)] = event.time
            alerts.append(
                BacktestAlert(
                    time=event.time,
                    symbol=event.symbol,
                    window=event.window,
                    direction=event.direction,
                    return_value=event.ret,
                    threshold=event.threshold,
                    return_z_ewma=metrics.get(f"return_z_ewma_{event.window}"),
                    vol_z=metrics.get(f"vol_z_{event.window}"),
                    attention=metrics.get("attention"),
                )
            )

    return BacktestResult(
        rows_seen=rows_seen,
        metrics_computed=metrics_computed,
        symbols=tuple(sorted(price_windows)),
        alerts=tuple(alerts),
    )


def _fmt_percent(value: float | None) -> str:
    return "n/a" if value is None else f"{value * 100:.2f}%"


def _fmt_number(value: float | None) -> str:
    return "n/a" if value is None else f"{value:.3f}"


def render_report(result: BacktestResult, *, limit: int | None = None) -> str:
    lines = [
        "Anomaly threshold backtest",
        f"rows seen: {result.rows_seen}",
        f"metric rows computed: {result.metrics_computed}",
        f"symbols: {', '.join(result.symbols) if result.symbols else 'none'}",
        f"alerts fired: {len(result.alerts)}",
        "",
        "Manual review table:",
    ]
    if not result.alerts:
        lines.append("no alerts fired")
        return "\n".join(lines)

    header = "time,symbol,window,direction,return,threshold,ewma_z,vol_z,attention"
    lines.append(header)
    rows = result.alerts if limit is None else result.alerts[:limit]
    for alert in rows:
        lines.append(
            ",".join(
                [
                    alert.time.isoformat(),
                    alert.symbol,
                    alert.window,
                    alert.direction,
                    _fmt_percent(alert.return_value),
                    _fmt_percent(alert.threshold),
                    _fmt_number(alert.return_z_ewma),
                    _fmt_number(alert.vol_z),
                    _fmt_number(alert.attention),
                ]
            )
        )
    if limit is not None and len(result.alerts) > limit:
        lines.append(f"... {len(result.alerts) - limit} more alerts omitted")
    return "\n".join(lines)


def write_alert_csv(path: str | Path, alerts: Iterable[BacktestAlert]) -> None:
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "time",
                "symbol",
                "window",
                "direction",
                "return",
                "threshold",
                "return_z_ewma",
                "vol_z",
                "attention",
            ],
        )
        writer.writeheader()
        for alert in alerts:
            writer.writerow(
                {
                    "time": alert.time.isoformat(),
                    "symbol": alert.symbol,
                    "window": alert.window,
                    "direction": alert.direction,
                    "return": alert.return_value,
                    "threshold": alert.threshold,
                    "return_z_ewma": alert.return_z_ewma,
                    "vol_z": alert.vol_z,
                    "attention": alert.attention,
                }
            )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Replay exported price rows through the existing anomaly threshold logic.",
    )
    parser.add_argument("input", help="CSV, JSON, or JSONL file with time,symbol,price rows")
    parser.add_argument("--threshold-1m", type=float, default=None, help="override 1m return threshold")
    parser.add_argument("--threshold-5m", type=float, default=None, help="override 5m return threshold")
    parser.add_argument("--threshold-15m", type=float, default=None, help="override 15m return threshold")
    parser.add_argument("--cooldown-sec", type=int, default=settings.anomaly_cooldown_sec)
    parser.add_argument("--output-csv", default=None, help="optional CSV path for fired alerts")
    parser.add_argument("--limit", type=int, default=50, help="max alert rows to print")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    points = load_price_points(args.input)
    result = run_backtest(
        points,
        thresholds=_thresholds_from_args(args),
        cooldown_sec=args.cooldown_sec,
    )
    if args.output_csv:
        write_alert_csv(args.output_csv, result.alerts)
    print(render_report(result, limit=args.limit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
