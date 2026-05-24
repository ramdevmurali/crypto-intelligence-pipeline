from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.app import db, main
from backend.app.diagnostics import (
    HEADLINE_POLICY,
    METRIC_POLICY,
    PRICE_POLICY,
    build_pipeline_diagnostics,
    classify_age,
)


NOW = datetime(2026, 5, 24, 8, 0, 0, tzinfo=timezone.utc)


def test_freshness_status_boundaries():
    assert classify_age(PRICE_POLICY.ok_sec, PRICE_POLICY) == "ok"
    assert classify_age(PRICE_POLICY.ok_sec + 1, PRICE_POLICY) == "degraded"
    assert classify_age(PRICE_POLICY.stale_sec, PRICE_POLICY) == "degraded"
    assert classify_age(PRICE_POLICY.stale_sec + 1, PRICE_POLICY) == "stale"

    assert classify_age(METRIC_POLICY.ok_sec, METRIC_POLICY) == "ok"
    assert classify_age(METRIC_POLICY.ok_sec + 1, METRIC_POLICY) == "degraded"
    assert classify_age(METRIC_POLICY.stale_sec, METRIC_POLICY) == "degraded"
    assert classify_age(METRIC_POLICY.stale_sec + 1, METRIC_POLICY) == "stale"

    assert classify_age(HEADLINE_POLICY.ok_sec, HEADLINE_POLICY) == "ok"
    assert classify_age(HEADLINE_POLICY.ok_sec + 1, HEADLINE_POLICY) == "degraded"
    assert classify_age(HEADLINE_POLICY.stale_sec, HEADLINE_POLICY) == "degraded"
    assert classify_age(HEADLINE_POLICY.stale_sec + 1, HEADLINE_POLICY) == "stale"


def test_build_pipeline_diagnostics_ok():
    body = build_pipeline_diagnostics(
        latest_prices={
            "btcusdt": NOW - timedelta(seconds=3),
            "ethusdt": NOW - timedelta(seconds=4),
        },
        latest_metrics={
            "btcusdt": NOW - timedelta(seconds=4),
            "ethusdt": NOW - timedelta(seconds=5),
        },
        latest_headline=NOW - timedelta(minutes=7),
        latest_alert=NOW - timedelta(minutes=30),
        counts={
            "15m": {"prices": 120, "metrics": 80, "headlines": 2, "alerts": 1},
            "1h": {"prices": 480, "metrics": 320, "headlines": 8, "alerts": 3},
        },
        now=NOW,
    )

    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["generated_at"] == NOW.isoformat()
    assert body["freshness"]["prices"]["btcusdt"]["age_sec"] == 3
    assert body["freshness"]["metrics"]["ethusdt"]["status"] == "ok"
    assert body["freshness"]["headlines"]["status"] == "ok"
    assert body["freshness"]["alerts"]["status"] == "ok"
    assert body["counts"]["15m"]["alerts"] == 1
    assert body["reasons"] == []


def test_build_pipeline_diagnostics_stale_reasons():
    body = build_pipeline_diagnostics(
        latest_prices={"btcusdt": NOW - timedelta(minutes=5)},
        latest_metrics={},
        latest_headline=NOW - timedelta(hours=3),
        latest_alert=None,
        counts={
            "15m": {"prices": 0, "metrics": 0, "headlines": 0, "alerts": 0},
            "1h": {"prices": 10, "metrics": 0, "headlines": 0, "alerts": 0},
        },
        now=NOW,
    )

    assert body["status"] == "stale"
    assert body["freshness"]["prices"]["btcusdt"]["status"] == "stale"
    assert body["freshness"]["metrics"]["btcusdt"]["status"] == "stale"
    assert body["freshness"]["headlines"]["status"] == "stale"
    assert "prices.btcusdt_stale" in body["reasons"]
    assert "metrics.btcusdt_missing" in body["reasons"]
    assert "headlines_stale" in body["reasons"]


def test_build_pipeline_diagnostics_degraded_reasons():
    body = build_pipeline_diagnostics(
        latest_prices={"btcusdt": NOW - timedelta(seconds=16)},
        latest_metrics={"btcusdt": NOW - timedelta(seconds=21)},
        latest_headline=NOW - timedelta(minutes=31),
        latest_alert=None,
        counts={
            "15m": {"prices": 10, "metrics": 10, "headlines": 1, "alerts": 0},
            "1h": {"prices": 40, "metrics": 40, "headlines": 4, "alerts": 0},
        },
        symbols=["btcusdt"],
        now=NOW,
    )

    assert body["status"] == "degraded"
    assert body["freshness"]["prices"]["btcusdt"]["status"] == "degraded"
    assert body["freshness"]["metrics"]["btcusdt"]["status"] == "degraded"
    assert body["freshness"]["headlines"]["status"] == "degraded"
    assert body["reasons"] == [
        "prices.btcusdt_degraded",
        "metrics.btcusdt_degraded",
        "headlines_degraded",
    ]


def test_build_pipeline_diagnostics_missing_core_streams_are_stale():
    body = build_pipeline_diagnostics(
        latest_prices={},
        latest_metrics={},
        latest_headline=None,
        latest_alert=None,
        counts={
            "15m": {"prices": 0, "metrics": 0, "headlines": 0, "alerts": 0},
            "1h": {"prices": 0, "metrics": 0, "headlines": 0, "alerts": 0},
        },
        symbols=["btcusdt"],
        now=NOW,
    )

    assert body["status"] == "stale"
    assert body["freshness"]["prices"]["btcusdt"]["status"] == "stale"
    assert body["freshness"]["metrics"]["btcusdt"]["status"] == "stale"
    assert body["freshness"]["headlines"]["status"] == "stale"
    assert "prices.btcusdt_missing" in body["reasons"]
    assert "metrics.btcusdt_missing" in body["reasons"]
    assert "headlines_missing" in body["reasons"]


def test_build_pipeline_diagnostics_alerts_are_informational():
    body = build_pipeline_diagnostics(
        latest_prices={"btcusdt": NOW - timedelta(seconds=3)},
        latest_metrics={"btcusdt": NOW - timedelta(seconds=4)},
        latest_headline=NOW - timedelta(minutes=5),
        latest_alert=NOW - timedelta(days=3),
        counts={
            "15m": {"prices": 10, "metrics": 10, "headlines": 1, "alerts": 0},
            "1h": {"prices": 40, "metrics": 40, "headlines": 4, "alerts": 0},
        },
        symbols=["btcusdt"],
        now=NOW,
    )

    assert body["status"] == "ok"
    assert body["freshness"]["alerts"]["status"] == "ok"
    assert body["freshness"]["alerts"]["age_sec"] == 259200
    assert body["reasons"] == []


def test_pipeline_diagnostics_endpoint(monkeypatch):
    async def fake_latest_prices(symbols):
        assert symbols == ["btcusdt", "ethusdt"]
        return {
            "btcusdt": NOW - timedelta(seconds=3),
            "ethusdt": NOW - timedelta(seconds=4),
        }

    async def fake_latest_metrics(symbols):
        assert symbols == ["btcusdt", "ethusdt"]
        return {
            "btcusdt": NOW - timedelta(seconds=4),
            "ethusdt": NOW - timedelta(seconds=5),
        }

    async def fake_latest_headline():
        return NOW - timedelta(minutes=5)

    async def fake_latest_alert():
        return NOW - timedelta(minutes=10)

    async def fake_counts(now):
        assert now == NOW
        return {
            "15m": {"prices": 10, "metrics": 8, "headlines": 1, "alerts": 1},
            "1h": {"prices": 40, "metrics": 32, "headlines": 4, "alerts": 2},
        }

    monkeypatch.setattr(main, "utc_now", lambda: NOW)
    monkeypatch.setattr(db, "fetch_latest_price_times", fake_latest_prices)
    monkeypatch.setattr(db, "fetch_latest_metric_times", fake_latest_metrics)
    monkeypatch.setattr(db, "fetch_latest_headline_time", fake_latest_headline)
    monkeypatch.setattr(db, "fetch_latest_alert_time", fake_latest_alert)
    monkeypatch.setattr(db, "fetch_pipeline_counts", fake_counts)

    client = TestClient(main.app)
    resp = client.get("/diagnostics/pipeline")

    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"status", "db", "generated_at", "freshness", "counts", "reasons"}
    assert body["status"] == "ok"
    assert body["db"] == "ok"
    assert body["freshness"]["prices"]["btcusdt"]["age_sec"] == 3
    assert body["counts"]["15m"]["prices"] == 10


def test_pipeline_diagnostics_endpoint_db_failure(monkeypatch):
    async def fake_latest_prices(symbols):
        assert symbols == ["btcusdt", "ethusdt"]
        raise RuntimeError("db down")

    monkeypatch.setattr(main, "utc_now", lambda: NOW)
    monkeypatch.setattr(db, "fetch_latest_price_times", fake_latest_prices)

    client = TestClient(main.app)
    resp = client.get("/diagnostics/pipeline")

    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "down"
    assert body["db"] == "error"
    assert "db_error: db down" in body["reasons"]
