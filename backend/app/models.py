"""SQLAlchemy models defining the gfgf database schema."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all gfgf models."""


class CreatedAtMixin:
    """Adds a database-managed creation timestamp (TIMESTAMPTZ) to a model."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class WeightEntry(CreatedAtMixin, Base):
    """A single daily weigh-in; one row per recorded day."""

    __tablename__: str = "weight_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recorded_on: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    weight_kg: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    body_fat_pct: Mapped[Decimal | None] = mapped_column(Numeric, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class LapTime(CreatedAtMixin, Base):
    """One recorded lap at a track, stored as integer milliseconds (design D3)."""

    __tablename__: str = "lap_times"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    track_name: Mapped[str] = mapped_column(Text, nullable=False)
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    lap_date: Mapped[date] = mapped_column(Date, nullable=False)
    kart_class: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class HealthMetric(CreatedAtMixin, Base):
    """A generic health metric reading ingested from a bridge app (design D7)."""

    __tablename__: str = "health_metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    metric_type: Mapped[str] = mapped_column(Text, nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    unit: Mapped[str | None] = mapped_column(Text, nullable=True)
    measured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    source: Mapped[str | None] = mapped_column(Text, nullable=True)


class DailyLog(CreatedAtMixin, Base):
    """A daily habit log; one row per logged day."""

    __tablename__: str = "daily_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    log_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False)
    exercised: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    flags: Mapped[dict[str, bool]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
