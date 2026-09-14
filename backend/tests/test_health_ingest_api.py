"""Integration tests for the health-data ingest API (OpenSpec tasks 5.1-5.3)."""

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.schemas import IngestResponse, MetricRead

_METRICS = TypeAdapter(list[MetricRead])

_MALFORMED_BODIES = [
    "not json",
    '{"foo": "bar"}',
    '[{"type": "step_count"}]',
    '[{"value": 8000}]',
    '[{"type": "step_count", "value": "80"}]',
    '[{"type": "step_count", "value": true}]',
    '[{"type": "step_count", "value": 1, "measured_at": "yesterday"}]',
]


def test_ingest_bridge_app_shape(api_client: TestClient) -> None:
    """Given a Health Auto Export style payload, When ingested, Then stored with UTC time."""
    payload = {
        "data": [
            {
                "dataType": "step_count",
                "quantity": 8000,
                "dateFrom": "2026-06-01 09:00:00 +0200",
            }
        ]
    }
    response = api_client.post("/api/ingest/health", json=payload)
    assert response.status_code == 200
    assert IngestResponse.model_validate_json(response.text) == IngestResponse(
        status="ok", ingested=1
    )
    metrics = _METRICS.validate_json(
        api_client.get("/api/metrics", params={"type": "step_count"}).text
    )
    assert len(metrics) == 1
    assert metrics[0].metric_type == "step_count"
    assert metrics[0].value == 8000.0
    assert metrics[0].unit is None
    assert metrics[0].measured_at == datetime(2026, 6, 1, 7, 0, tzinfo=UTC)
    assert metrics[0].source == "ingest"


def test_ingest_snake_case_shape(api_client: TestClient) -> None:
    """Given a snake_case payload, When ingested, Then unit and timestamp are kept."""
    payload = {"metrics": [{"type": "body_temperature", "value": 36.6, "unit": "celsius", "measured_at": "2026-06-01T08:00:00Z"}]}
    response = api_client.post("/api/ingest/health", json=payload)
    assert IngestResponse.model_validate_json(response.text).ingested == 1
    metrics = _METRICS.validate_json(
        api_client.get("/api/metrics", params={"type": "body_temperature"}).text
    )
    assert metrics[0].unit == "celsius"
    assert metrics[0].measured_at == datetime(2026, 6, 1, 8, 0, tzinfo=UTC)


def test_ingest_multiple_records(api_client: TestClient) -> None:
    """Given a payload with several records, When ingested, Then all are stored."""
    payload = [
        {"type": "step_count", "value": 8000},
        {"type": "heart_rate", "value": 62},
    ]
    response = api_client.post("/api/ingest/health", json=payload)
    assert IngestResponse.model_validate_json(response.text).ingested == 2


def test_ingest_empty_list_stores_nothing(api_client: TestClient) -> None:
    """Given an empty payload, When ingested, Then zero records are stored."""
    response = api_client.post("/api/ingest/health", json=[])
    assert IngestResponse.model_validate_json(response.text) == IngestResponse(
        status="ok", ingested=0
    )


@pytest.mark.parametrize("body", _MALFORMED_BODIES)
def test_malformed_payload_rejected_and_stores_nothing(
    api_client: TestClient, body: str
) -> None:
    """Given a malformed payload, When ingested, Then 400 and nothing stored."""
    response = api_client.post(
        "/api/ingest/health", content=body, headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    metrics = _METRICS.validate_json(
        api_client.get("/api/metrics", params={"type": "step_count"}).text
    )
    assert metrics == []


def test_ingest_without_timestamp_defaults_to_now(api_client: TestClient) -> None:
    """Given a record without timestamp, When ingested, Then measured_at is now in UTC."""
    _ = api_client.post("/api/ingest/health", json=[{"type": "heart_rate", "value": 62}])
    metrics = _METRICS.validate_json(
        api_client.get("/api/metrics", params={"type": "heart_rate"}).text
    )
    now = datetime.now(tz=UTC)
    assert abs((metrics[0].measured_at - now).total_seconds()) < 60


def test_metrics_ordered_and_isolated_by_type(api_client: TestClient) -> None:
    """Given metrics of two types out of order, When queried, Then filtered and time-ascending."""
    _ = api_client.post(
        "/api/ingest/health",
        json=[
            {"type": "step_count", "value": 8000, "measured_at": "2026-06-02T10:00:00Z"},
            {"type": "step_count", "value": 9000, "measured_at": "2026-06-01T10:00:00Z"},
            {"type": "heart_rate", "value": 62, "measured_at": "2026-06-01T09:00:00Z"},
        ],
    )
    steps = _METRICS.validate_json(
        api_client.get("/api/metrics", params={"type": "step_count"}).text
    )
    assert [metric.value for metric in steps] == [9000.0, 8000.0]


def test_metrics_requires_type_param(api_client: TestClient) -> None:
    """Given no type query parameter, When metrics are queried, Then a validation error."""
    assert api_client.get("/api/metrics").status_code == 422
