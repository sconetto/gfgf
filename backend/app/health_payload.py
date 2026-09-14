"""Tolerant parsing of health-ingest JSON payloads into typed metric drafts.

The bridge app (e.g. Health Auto Export) pushes JSON whose exact shape is not
under our control, so field names are matched against common variants and the
payload may be a bare list of records or an object holding one under a
container key. Anything that does not yield well-formed records raises
IngestPayloadError so the HTTP boundary can reject it with a 400 before
anything is stored.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from typing import Final

from pydantic import RootModel, ValidationError

__all__ = ["IngestPayloadError", "MetricDraft", "parse_health_payload"]

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


_CONTAINER_KEYS: Final = ("data", "metrics", "records", "measurements")
_TYPE_KEYS: Final = ("type", "metric_type", "metric", "dataType", "name")
_VALUE_KEYS: Final = ("value", "quantity", "val")
_UNIT_KEYS: Final = ("unit", "units")
_TIMESTAMP_KEYS: Final = (
    "measured_at",
    "measuredAt",
    "timestamp",
    "date",
    "datetime",
    "dateFrom",
    "startDate",
    "time",
)
_SPACE_BEFORE_OFFSET: Final[re.Pattern[str]] = re.compile(r" ([+-]\d{2}:?\d{2})$")


class _JsonValue(RootModel[JsonValue]):
    """Typed wrapper so raw JSON bodies parse without untyped results."""


def parse_health_payload(raw: bytes | str) -> list[MetricDraft]:
    """Parse a raw JSON body into metric drafts; raises IngestPayloadError when malformed."""
    try:
        payload = _JsonValue.model_validate_json(raw).root
    except ValidationError as exc:
        raise IngestPayloadError("payload is not valid JSON") from exc
    records = _extract_records(payload)
    return [_parse_record(record) for record in records]


def _extract_records(payload: JsonValue) -> list[dict[str, JsonValue]]:
    if isinstance(payload, list):
        return _coerce_records(payload)
    if isinstance(payload, dict):
        for key in _CONTAINER_KEYS:
            container = payload.get(key)
            if isinstance(container, list):
                return _coerce_records(container)
        raise IngestPayloadError("payload contains no records list")
    raise IngestPayloadError("payload must be a list of records or an object holding one")


def _coerce_records(records: list[JsonValue]) -> list[dict[str, JsonValue]]:
    coerced: list[dict[str, JsonValue]] = []
    for record in records:
        if not isinstance(record, dict):
            raise IngestPayloadError("each record must be a JSON object")
        coerced.append(record)
    return coerced


def _parse_record(record: dict[str, JsonValue]) -> MetricDraft:
    metric_type = _find_str(record, _TYPE_KEYS)
    if metric_type is None:
        raise IngestPayloadError("record is missing a metric type")
    value = _find_number(record, _VALUE_KEYS)
    if value is None:
        raise IngestPayloadError(f"record {metric_type!r} is missing a numeric value")
    unit = _find_str(record, _UNIT_KEYS)
    measured_at = _parse_timestamp(_find_str(record, _TIMESTAMP_KEYS))
    return MetricDraft(
        metric_type=metric_type,
        value=value,
        unit=unit,
        measured_at=measured_at,
    )


def _find_str(record: dict[str, JsonValue], keys: Sequence[str]) -> str | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value != "":
            return value
    return None


def _find_number(record: dict[str, JsonValue], keys: Sequence[str]) -> Decimal | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, bool):
            continue
        if isinstance(value, int | float):
            return Decimal(str(value))
    return None


def _parse_timestamp(raw: str | None) -> datetime:
    if raw is None:
        return datetime.now(UTC)
    normalized = _SPACE_BEFORE_OFFSET.sub(r"\1", raw.strip())
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise IngestPayloadError(f"record has an unparseable timestamp {raw!r}") from exc
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)
