from datetime import datetime, timezone
from typing import Literal

FreshnessStatus = Literal["ok", "degraded", "stale", "down"]
PipelineStatus = Literal["ok", "degraded", "stale", "down"]

PRICE_OK_SEC = 15
PRICE_STALE_SEC = 60
METRIC_OK_SEC = 20
METRIC_STALE_SEC = 90
HEADLINE_OK_SEC = 30 * 60
HEADLINE_STALE_SEC = 2 * 60 * 60


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def coerce_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def age_seconds(value: datetime | None, now: datetime) -> int | None:
    ts = coerce_utc(value)
    if ts is None:
        return None
    return max(0, int((now - ts).total_seconds()))


def classify_age(age_sec: int | None, *, ok_sec: int, stale_sec: int) -> FreshnessStatus:
    if age_sec is None:
        return "stale"
    if age_sec <= ok_sec:
        return "ok"
    if age_sec <= stale_sec:
        return "degraded"
    return "stale"


def freshness_entry(value: datetime | None, now: datetime, *, ok_sec: int, stale_sec: int) -> dict:
    ts = coerce_utc(value)
    age_sec = age_seconds(ts, now)
    return {
        "latest_time": ts.isoformat() if ts else None,
        "age_sec": age_sec,
        "status": classify_age(age_sec, ok_sec=ok_sec, stale_sec=stale_sec),
    }


def alert_freshness_entry(value: datetime | None, now: datetime) -> dict:
    ts = coerce_utc(value)
    return {
        "latest_time": ts.isoformat() if ts else None,
        "age_sec": age_seconds(ts, now),
        "status": "ok",
    }


def reason_for(scope: str, entry: dict) -> str | None:
    status = entry["status"]
    if status == "ok":
        return None
    if entry["age_sec"] is None:
        return f"{scope}_missing"
    return f"{scope}_{status}"


def aggregate_status(reasons: list[str]) -> PipelineStatus:
    if any(reason.endswith("_stale") or reason.endswith("_missing") for reason in reasons):
        return "stale"
    if reasons:
        return "degraded"
    return "ok"


def build_pipeline_diagnostics(
    *,
    latest_prices: dict[str, datetime],
    latest_metrics: dict[str, datetime],
    latest_headline: datetime | None,
    latest_alert: datetime | None,
    counts: dict[str, dict[str, int]],
    symbols: list[str] | None = None,
    now: datetime | None = None,
) -> dict:
    current = now or utc_now()
    symbol_list = sorted(set(symbols or []) | set(latest_prices) | set(latest_metrics))
    reasons: list[str] = []

    price_freshness = {}
    metric_freshness = {}
    for symbol in symbol_list:
        price_entry = freshness_entry(
            latest_prices.get(symbol),
            current,
            ok_sec=PRICE_OK_SEC,
            stale_sec=PRICE_STALE_SEC,
        )
        metric_entry = freshness_entry(
            latest_metrics.get(symbol),
            current,
            ok_sec=METRIC_OK_SEC,
            stale_sec=METRIC_STALE_SEC,
        )
        price_freshness[symbol] = price_entry
        metric_freshness[symbol] = metric_entry

        price_reason = reason_for(f"prices.{symbol}", price_entry)
        metric_reason = reason_for(f"metrics.{symbol}", metric_entry)
        if price_reason:
            reasons.append(price_reason)
        if metric_reason:
            reasons.append(metric_reason)

    if not symbol_list:
        reasons.append("prices_missing")
        reasons.append("metrics_missing")

    headline_entry = freshness_entry(
        latest_headline,
        current,
        ok_sec=HEADLINE_OK_SEC,
        stale_sec=HEADLINE_STALE_SEC,
    )
    headline_reason = reason_for("headlines", headline_entry)
    if headline_reason:
        reasons.append(headline_reason)

    return {
        "status": aggregate_status(reasons),
        "db": "ok",
        "generated_at": current.isoformat(),
        "freshness": {
            "prices": price_freshness,
            "metrics": metric_freshness,
            "headlines": headline_entry,
            "alerts": alert_freshness_entry(latest_alert, current),
        },
        "counts": counts,
        "reasons": reasons,
    }


def build_down_diagnostics(error: str, now: datetime | None = None) -> dict:
    current = now or utc_now()
    return {
        "status": "down",
        "db": "error",
        "generated_at": current.isoformat(),
        "freshness": {
            "prices": {},
            "metrics": {},
            "headlines": {"latest_time": None, "age_sec": None, "status": "down"},
            "alerts": {"latest_time": None, "age_sec": None, "status": "down"},
        },
        "counts": {
            "15m": {"prices": 0, "metrics": 0, "headlines": 0, "alerts": 0},
            "1h": {"prices": 0, "metrics": 0, "headlines": 0, "alerts": 0},
        },
        "reasons": [f"db_error: {error}"],
    }
