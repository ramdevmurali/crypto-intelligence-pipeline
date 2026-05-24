import asyncpg
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, TypedDict

from .config import settings

_pool: Optional[asyncpg.Pool] = None


class PriceRow(TypedDict):
    time: datetime
    symbol: str
    price: float | Decimal


class HeadlineRow(TypedDict):
    time: datetime
    title: str
    url: str | None
    source: str | None
    sentiment: float | None


AlertRow = TypedDict(
    "AlertRow",
    {
        "time": datetime,
        "symbol": str,
        "window": str,
        "direction": str,
        "return": float | Decimal,
        "threshold": float | Decimal,
        "summary": str | None,
        "headline": str | None,
        "sentiment": float | None,
    },
)


async def init_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5)
    return _pool


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("db pool not initialized; call init_pool() first")
    return _pool


async def close_pool():
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def fetch_prices(symbol: str, limit: int = 200) -> list[PriceRow]:
    pool = await get_pool()
    query = """
        SELECT time, symbol, price
        FROM prices
        WHERE symbol = $1
        ORDER BY time DESC
        LIMIT $2
    """
    return await pool.fetch(query, symbol, limit)


async def fetch_latest_metrics(symbol: str) -> asyncpg.Record | None:
    pool = await get_pool()
    query = """
        SELECT *
        FROM metrics
        WHERE symbol = $1
        ORDER BY time DESC
        LIMIT 1
    """
    return await pool.fetchrow(query, symbol)


async def fetch_latest_price_times(symbols: list[str] | None = None) -> dict[str, datetime]:
    pool = await get_pool()
    if symbols:
        rows = await pool.fetch(
            """
            SELECT symbol, max(time) AS latest_time
            FROM prices
            WHERE symbol = ANY($1::text[])
            GROUP BY symbol
            """,
            symbols,
        )
        return {row["symbol"]: row["latest_time"] for row in rows}
    rows = await pool.fetch(
        """
        SELECT symbol, max(time) AS latest_time
        FROM prices
        GROUP BY symbol
        """
    )
    return {row["symbol"]: row["latest_time"] for row in rows}


async def fetch_latest_metric_times(symbols: list[str] | None = None) -> dict[str, datetime]:
    pool = await get_pool()
    if symbols:
        rows = await pool.fetch(
            """
            SELECT symbol, max(time) AS latest_time
            FROM metrics
            WHERE symbol = ANY($1::text[])
            GROUP BY symbol
            """,
            symbols,
        )
        return {row["symbol"]: row["latest_time"] for row in rows}
    rows = await pool.fetch(
        """
        SELECT symbol, max(time) AS latest_time
        FROM metrics
        GROUP BY symbol
        """
    )
    return {row["symbol"]: row["latest_time"] for row in rows}


async def fetch_latest_headline_time() -> datetime | None:
    pool = await get_pool()
    return await pool.fetchval("SELECT max(time) FROM headlines")


async def fetch_latest_alert_time() -> datetime | None:
    pool = await get_pool()
    return await pool.fetchval("SELECT max(time) FROM anomalies")


async def fetch_pipeline_counts(now: datetime) -> dict[str, dict[str, int]]:
    pool = await get_pool()
    windows = {
        "15m": now - timedelta(minutes=15),
        "1h": now - timedelta(hours=1),
    }
    counts: dict[str, dict[str, int]] = {}
    async with pool.acquire() as conn:
        for label, since in windows.items():
            row = await conn.fetchrow(
                """
                SELECT
                    (SELECT count(*) FROM prices WHERE time >= $1) AS prices,
                    (SELECT count(*) FROM metrics WHERE time >= $1) AS metrics,
                    (SELECT count(*) FROM headlines WHERE time >= $1) AS headlines,
                    (SELECT count(*) FROM anomalies WHERE time >= $1) AS alerts
                """,
                since,
            )
            counts[label] = {
                "prices": row["prices"],
                "metrics": row["metrics"],
                "headlines": row["headlines"],
                "alerts": row["alerts"],
            }
    return counts


async def fetch_headlines(limit: int = 20, since: datetime | None = None) -> list[HeadlineRow]:
    pool = await get_pool()
    if since is None:
        query = """
            SELECT time, title, url, source, sentiment
            FROM headlines
            ORDER BY time DESC
            LIMIT $1
        """
        return await pool.fetch(query, limit)
    query = """
        SELECT time, title, url, source, sentiment
        FROM headlines
        WHERE time >= $1
        ORDER BY time DESC
        LIMIT $2
    """
    return await pool.fetch(query, since, limit)


async def fetch_alerts(limit: int = 20, since: datetime | None = None) -> list[AlertRow]:
    pool = await get_pool()
    if since is None:
        query = """
            SELECT
                time,
                symbol,
                window_name AS window,
                return_value AS return,
                direction,
                threshold,
                summary,
                headline,
                sentiment
            FROM anomalies
            ORDER BY time DESC
            LIMIT $1
        """
        return await pool.fetch(query, limit)
    query = """
        SELECT
            time,
            symbol,
            window_name AS window,
            return_value AS return,
            direction,
            threshold,
            summary,
            headline,
            sentiment
        FROM anomalies
        WHERE time >= $1
        ORDER BY time DESC
        LIMIT $2
    """
    return await pool.fetch(query, since, limit)
