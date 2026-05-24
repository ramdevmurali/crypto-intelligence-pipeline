import pytest


@pytest.mark.asyncio
async def test_pipeline_diagnostics(client, seed_data):
    resp = await client.get("/diagnostics/pipeline")

    assert resp.status_code == 200
    body = resp.json()
    assert set(body.keys()) == {"status", "db", "generated_at", "freshness", "counts", "reasons"}
    assert body["db"] == "ok"
    assert body["status"] in {"ok", "degraded", "stale"}
    assert set(body["freshness"]["prices"].keys()).issubset({"btcusdt", "ethusdt"})
    assert set(body["freshness"]["metrics"].keys()).issubset({"btcusdt", "ethusdt"})
    assert set(body["counts"].keys()) == {"15m", "1h"}
    assert body["counts"]["15m"]["prices"] >= 3
    assert body["counts"]["15m"]["metrics"] >= 1
    assert body["counts"]["15m"]["headlines"] >= 1
    assert body["counts"]["15m"]["alerts"] >= 1
