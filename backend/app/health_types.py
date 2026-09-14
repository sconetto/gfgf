"""Shared primitives for health-ingest parsing.

`JsonValue`, `IngestPayloadError`, and `MetricDraft` live in this leaf module
so the generic parser (`app.health_payload`) and the Health Export Kit parser
(`app.health_export_kit`) can share them without an import cycle:
basedpyright's reportImportCycles counts even function-level import edges, so
the dispatch's lazy import alone does not break the chain. `app.health_payload`
re-exports all three, keeping its public API unchanged.
"""

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

__all__ = ["IngestDraft", "IngestPayloadError", "JsonValue", "MetricDraft", "WeightDraft"]

type JsonValue = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]


class IngestPayloadError(ValueError):
    """Raised when a health-ingest payload cannot be parsed into metric records."""

    reason: str

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


@dataclass(frozen=True, slots=True)
class MetricDraft:
    """One parsed metric record ready to be stored."""

    metric_type: str
    value: Decimal
    unit: str | None
    measured_at: datetime


@dataclass(frozen=True, slots=True)
class WeightDraft:
    """One Apple body-mass reading ready to upsert into the weight table."""

    recorded_on: date
    weight_kg: Decimal
    body_fat_pct: Decimal | None


@dataclass(frozen=True, slots=True)
class IngestDraft:
    """Everything one ingest payload contributes: metrics and weight entries."""

    metrics: list[MetricDraft]
    weights: list[WeightDraft]
