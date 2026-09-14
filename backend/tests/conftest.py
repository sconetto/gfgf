"""Integration test fixtures: real Postgres, wiped between tests.

Requires GFGF_TEST_DATABASE_URL pointing at a throwaway database (the name
must contain "test"). The schema is created/verified and all rows deleted
before each test, so every test starts from a clean slate.
"""

from collections.abc import Iterator
from os import environ
from urllib.parse import urlparse

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import create_async_engine

from app.main import create_app
from app.models import DailyLog, HealthMetric, LapTime, WeightEntry
from app.schema_sync import ensure_schema


async def _wipe_database(database_url: str) -> None:
    """Ensure the schema exists, then delete every row (fresh container safe)."""
    engine = create_async_engine(database_url)
    try:
        await ensure_schema(engine)
        async with engine.begin() as connection:
            _ = await connection.execute(delete(WeightEntry))
            _ = await connection.execute(delete(LapTime))
            _ = await connection.execute(delete(HealthMetric))
            _ = await connection.execute(delete(DailyLog))
    finally:
        await engine.dispose()


@pytest.fixture()
def api_client() -> Iterator[TestClient]:
    """Yield a TestClient backed by an isolated, freshly wiped test database."""
    database_url = environ.get("GFGF_TEST_DATABASE_URL")
    if database_url is None:
        pytest.fail("GFGF_TEST_DATABASE_URL must point at a throwaway test database")
    if "test" not in urlparse(database_url).path:
        pytest.fail("refusing to run against a database whose name lacks 'test'")

    previous = environ.get("DATABASE_URL")
    environ["DATABASE_URL"] = database_url
    anyio.run(_wipe_database, database_url)
    with TestClient(create_app()) as client:
        yield client
    if previous is None:
        del environ["DATABASE_URL"]
    else:
        environ["DATABASE_URL"] = previous
