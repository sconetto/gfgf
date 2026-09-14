"""Integration tests for the weight tracking API (OpenSpec tasks 3.1-3.3)."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.schemas import WeightRead

_WEIGHTS = TypeAdapter(list[WeightRead])


def test_create_weight_returns_entry(api_client: TestClient) -> None:
    """Given no weigh-ins, When one is posted, Then it is stored with its fields."""
    response = api_client.post(
        "/api/weights", json={"recorded_on": "2026-08-01", "weight_kg": 80.5}
    )
    assert response.status_code == 200
    entry = WeightRead.model_validate_json(response.text)
    assert entry.id > 0
    assert entry.recorded_on == date(2026, 8, 1)
    assert entry.weight_kg == 80.5
    assert entry.body_fat_pct is None
    assert entry.note is None


def test_optional_fields_round_trip(api_client: TestClient) -> None:
    """Given a weigh-in with body fat and note, When stored, Then both come back."""
    response = api_client.post(
        "/api/weights",
        json={
            "recorded_on": "2026-08-01",
            "weight_kg": 80.5,
            "body_fat_pct": 17.2,
            "note": "morning, after bathroom",
        },
    )
    entry = WeightRead.model_validate_json(response.text)
    assert entry.body_fat_pct == 17.2
    assert entry.note == "morning, after bathroom"


@pytest.mark.parametrize("weight_kg", [0, -1])
def test_non_positive_weight_is_rejected(api_client: TestClient, weight_kg: float) -> None:
    """Given a weight at or below zero, When posted, Then a validation error is returned."""
    response = api_client.post(
        "/api/weights", json={"recorded_on": "2026-08-01", "weight_kg": weight_kg}
    )
    assert response.status_code == 422
    assert _WEIGHTS.validate_json(api_client.get("/api/weights").text) == []


def test_same_date_post_updates_existing_entry(api_client: TestClient) -> None:
    """Given a weigh-in on a date, When the same date is posted again, Then updated, not duplicated."""
    first = api_client.post(
        "/api/weights", json={"recorded_on": "2026-08-01", "weight_kg": 80.5}
    )
    second = api_client.post(
        "/api/weights", json={"recorded_on": "2026-08-01", "weight_kg": 79.9}
    )
    entries = _WEIGHTS.validate_json(api_client.get("/api/weights").text)
    assert [entry.weight_kg for entry in entries] == [79.9]
    assert (
        WeightRead.model_validate_json(first.text).id
        == WeightRead.model_validate_json(second.text).id
    )


def test_list_weights_orders_by_date_ascending(api_client: TestClient) -> None:
    """Given weigh-ins out of order, When listed, Then they come back date ascending."""
    for day, weight in [(3, 81.2), (1, 80.5), (2, 79.9)]:
        _ = api_client.post("/api/weights", json={"recorded_on": f"2026-08-{day:02d}", "weight_kg": weight})
    entries = _WEIGHTS.validate_json(api_client.get("/api/weights").text)
    assert [entry.recorded_on for entry in entries] == [
        date(2026, 8, 1),
        date(2026, 8, 2),
        date(2026, 8, 3),
    ]


def test_delete_weight_removes_entry(api_client: TestClient) -> None:
    """Given a stored weigh-in, When deleted by id, Then it is gone and 204 is returned."""
    entry = WeightRead.model_validate_json(
        api_client.post("/api/weights", json={"recorded_on": "2026-08-01", "weight_kg": 80.5}).text
    )
    assert api_client.delete(f"/api/weights/{entry.id}").status_code == 204
    assert _WEIGHTS.validate_json(api_client.get("/api/weights").text) == []


def test_delete_missing_weight_returns_404(api_client: TestClient) -> None:
    """Given no weigh-in with that id, When deleted, Then 404 is returned."""
    assert api_client.delete("/api/weights/999").status_code == 404
