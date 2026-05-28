from datetime import datetime, timedelta, timezone

from scripts import backtest_anomaly_thresholds as backtest


def _point(offset_sec: int, price: float, symbol: str = "btcusdt") -> backtest.PricePoint:
    return backtest.PricePoint(
        time=datetime(2026, 1, 27, 12, 0, tzinfo=timezone.utc) + timedelta(seconds=offset_sec),
        symbol=symbol,
        price=price,
    )


def test_backtest_replays_prices_through_threshold_logic():
    result = backtest.run_backtest(
        [
            _point(0, 100.0),
            _point(60, 106.0),
        ],
        thresholds={"1m": 0.05, "5m": 0.20, "15m": 0.25},
        cooldown_sec=60,
    )

    assert result.rows_seen == 2
    assert result.metrics_computed == 1
    assert len(result.alerts) == 1

    alert = result.alerts[0]
    assert alert.symbol == "btcusdt"
    assert alert.window == "1m"
    assert alert.direction == "up"
    assert alert.return_value == 0.06
    assert alert.threshold == 0.05
    assert alert.attention == 1.2


def test_backtest_respects_cooldown():
    result = backtest.run_backtest(
        [
            _point(0, 100.0),
            _point(60, 106.0),
            _point(90, 113.0),
        ],
        thresholds={"1m": 0.05, "5m": 0.20, "15m": 0.25},
        cooldown_sec=60,
    )

    assert len(result.alerts) == 1


def test_load_price_points_from_csv(tmp_path):
    source = tmp_path / "prices.csv"
    source.write_text(
        "time,symbol,price\n"
        "2026-01-27T12:00:00+00:00,BTCUSDT,100\n"
        "2026-01-27T12:01:00+00:00,BTCUSDT,106\n"
    )

    points = backtest.load_price_points(source)

    assert points == [
        _point(0, 100.0),
        _point(60, 106.0),
    ]


def test_render_report_includes_manual_review_fields():
    result = backtest.run_backtest(
        [
            _point(0, 100.0),
            _point(60, 106.0),
        ],
        thresholds={"1m": 0.05, "5m": 0.10, "15m": 0.15},
        cooldown_sec=60,
    )

    report = backtest.render_report(result)

    assert "alerts fired: 1" in report
    assert "Manual review table:" in report
    assert "time,symbol,window,direction,return,threshold,ewma_z,vol_z,attention" in report
    assert "btcusdt,1m,up,6.00%,5.00%" in report
