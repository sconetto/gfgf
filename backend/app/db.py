"""Process-wide async SQLAlchemy engine management."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.config import Settings

_engine: AsyncEngine | None = None


def init_engine(settings: Settings) -> AsyncEngine:
    """Create the process-wide async engine. Called once at app startup."""
    global _engine
    _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    return _engine


async def dispose_engine() -> None:
    """Dispose the engine and clear module state. Called at app shutdown."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
    _engine = None


def get_engine() -> AsyncEngine:
    """Return the initialized engine; raises if startup has not run."""
    if _engine is None:
        raise RuntimeError(
            "Database engine is not initialized; application startup has not run."
        )
    return _engine


async def ping() -> None:
    """Verify database connectivity with a SELECT 1 round-trip."""
    engine = get_engine()
    async with engine.connect() as connection:
        _ = await connection.execute(text("SELECT 1"))
