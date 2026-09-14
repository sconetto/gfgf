"""Idempotent runtime schema synchronization (no Alembic, by design).

`ensure_schema` first creates any missing tables from the ORM metadata, then
applies additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements so the
running database gains new columns without a migration framework. Every
statement is safe to re-run.
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.models import Base

ADDITIVE_SCHEMA_SQL: tuple[str, ...] = (
    "ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS flags JSONB NOT NULL DEFAULT '{}'::jsonb",
)


async def ensure_schema(engine: AsyncEngine) -> None:
    """Create missing tables and apply additive column changes; safe to re-run."""
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        for statement in ADDITIVE_SCHEMA_SQL:
            _ = await connection.execute(text(statement))
