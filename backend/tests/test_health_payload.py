"""Unit tests for the tolerant health-ingest payload parser."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from app.health_payload import IngestPayloadError, parse_health_payload


def test_parse_bare_list_payload() -> None:
    """Given a bare list of records, When parsed, Then one draft per record."""
    drafts = parse_health_payload(
        '[{"type": "step_count", "value": 8000, "unit": "count", "measured_at": "2026-09-01T10:00:00Z"}]'
    )
    assert len(drafts) == 1
    assert drafts[0].metric_type == "step_count"
    assert drafts[0].value == 8000.0
    assert drafts[0].unit == "count"
    assert drafts[0].measured_at == datetime(2026, 9, 1, 10, 0, tzinfo=UTC)


def test_parse_health_auto_export_style_payload() -> None:
    """Given a {"data": [...]} payload with dataType/quantity/dateFrom, When parsed, Then mapped."""
    drafts = parse_health_payload(
        '{"data": [{"dataType": "HeartRate", "quantity": 62, "unit": "bpm", "dateFrom": "2026-09-01 09:00:00 +0200"}]}'
    )
    assert len(drafts) == 1
    assert drafts[0].metric_type == "HeartRate"
    assert drafts[0].value == 62.0
    assert drafts[0].measured_at == datetime(2026, 9, 1, 7, 0, tzinfo=UTC)


def test_parse_metrics_container_with_snake_case_fields() -> None:
    """Given a {"metrics": [...]} payload with metric_type/value/measured_at, When parsed, Then mapped."""
    drafts = parse_health_payload(
        '{"metrics": [{"metric_type": "resting_heart_rate", "value": 55, "measured_at": "2026-09-01T08:00:00+00:00"}]}'
    )
    assert len(drafts) == 1
    assert drafts[0].metric_type == "resting_heart_rate"
    assert drafts[0].unit is None


def test_parse_multiple_records_in_one_payload() -> None:
    """Given several records, When parsed, Then all drafts returned in order."""
    drafts = parse_health_payload(
        '[{"type": "a", "value": 1}, {"type": "b", "value": 2}, {"type": "c", "value": 3}]'
    )
    assert [d.metric_type for d in drafts] == ["a", "b", "c"]


def test_parse_defaults_timestamp_to_now_utc() -> None:
    """Given a record without a timestamp, When parsed, Then measured_at is recent UTC."""
    before = datetime.now(UTC)
    drafts = parse_health_payload('[{"type": "weight", "value": 80.5}]')
    after = datetime.now(UTC)
    assert drafts[0].measured_at is not None
    assert before - timedelta(seconds=1) <= drafts[0].measured_at <= after + timedelta(seconds=1)


def test_parse_treats_naive_timestamp_as_utc() -> None:
    """Given a timestamp without an offset, When parsed, Then interpreted as UTC."""
    drafts = parse_health_payload('[{"type": "weight", "value": 80, "measured_at": "2026-09-01T08:30:00"}]')
    assert drafts[0].measured_at == datetime(2026, 9, 1, 8, 30, tzinfo=UTC)


def test_parse_converts_offset_timestamp_to_utc() -> None:
    """Given a +02:00 timestamp, When parsed, Then converted to UTC."""
    drafts = parse_health_payload('[{"type": "weight", "value": 80, "measured_at": "2026-09-01T10:30:00+02:00"}]')
    assert drafts[0].measured_at == datetime(2026, 9, 1, 8, 30, tzinfo=UTC)


def test_parse_accepts_date_only_timestamp() -> None:
    """Given a date-only timestamp, When parsed, Then UTC midnight."""
    drafts = parse_health_payload('[{"type": "weight", "value": 80, "measured_at": "2026-09-01"}]')
    assert drafts[0].measured_at == datetime(2026, 9, 1, 0, 0, tzinfo=UTC)


def test_parse_accepts_float_values() -> None:
    """Given a float value, When parsed, Then kept exactly as a Decimal."""
    drafts = parse_health_payload('[{"type": "body_temperature", "value": 36.6, "unit": "celsius"}]')
    assert drafts[0].value == Decimal("36.6")


def test_parse_empty_list_payload_yields_no_drafts() -> None:
    """Given an empty list, When parsed, Then zero drafts (valid, nothing to store)."""
    assert parse_health_payload("[]") == []


@pytest.mark.parametrize(
    "payload",
    [
        "not json",
        '{"type": "weight", "value": 80}',
        '{"foo": "bar"}',
        '[{"value": 80}]',
        '[{"type": "weight"}]',
        '[{"type": "weight", "value": "80"}]',
        '[{"type": "weight", "value": true}]',
        '[{"type": 5, "value": 80}]',
        '["not an object"]',
        '[{"type": "weight", "value": 80, "measured_at": "yesterday"}]',
        '"just a string"',
        "42",
    ],
)
def test_reject_malformed_payloads(payload: str) -> None:
    """Given a malformed payload, When parsed, Then IngestPayloadError."""
    with pytest.raises(IngestPayloadError):
        _ = parse_health_payload(payload)


def test_error_exposes_the_reason() -> None:
    """Given a record missing a value, When parse fails, Then the reason mentions the metric type."""
    with pytest.raises(IngestPayloadError) as excinfo:
        _ = parse_health_payload('[{"type": "step_count"}]')
    assert excinfo.value.reason == "record 'step_count' is missing a numeric value"
