"""Integration tests for the habit tracking API (OpenSpec tasks 6.1-6.2)."""

from datetime import date

from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.schemas import HabitLogRead

_HABITS = TypeAdapter(list[HabitLogRead])


def _post_log(api_client: TestClient, day: int, *, exercised: bool = True) -> HabitLogRead:
    response = api_client.post(
        "/api/habits", json={"log_date": f"2026-05-{day:02d}", "exercised": exercised}
    )
    assert response.status_code == 200
    return HabitLogRead.model_validate_json(response.text)


def test_upsert_habit_log_defaults_empty_flags(api_client: TestClient) -> None:
    """Given a log without flags, When posted, Then flags default to empty."""
    log = _post_log(api_client, 1)
    assert log.exercised is True
    assert log.flags == {}
    assert log.note is None


def test_upsert_same_date_replaces_log(api_client: TestClient) -> None:
    """Given a log on a date, When the same date is posted again, Then updated, not duplicated."""
    _ = api_client.post(
        "/api/habits",
        json={"log_date": "2026-05-01", "exercised": True, "flags": {"read": True}},
    )
    _ = api_client.post(
        "/api/habits",
        json={"log_date": "2026-05-01", "exercised": False, "flags": {"ran": True}},
    )
    logs = _HABITS.validate_json(
        api_client.get("/api/habits", params={"from": "2026-05-01", "to": "2026-05-31"}).text
    )
    assert len(logs) == 1
    assert logs[0].exercised is False
    assert logs[0].flags == {"ran": True}


def test_arbitrary_flags_round_trip(api_client: TestClient) -> None:
    """Given any boolean flags, When stored, Then they come back exactly as sent (design D8)."""
    flags = {"read": True, "cold_plunge": False, "ran": True}
    _ = api_client.post(
        "/api/habits", json={"log_date": "2026-05-01", "exercised": True, "flags": flags}
    )
    logs = _HABITS.validate_json(
        api_client.get("/api/habits", params={"from": "2026-05-01", "to": "2026-05-01"}).text
    )
    assert logs[0].flags == flags


def test_range_is_inclusive_and_ordered(api_client: TestClient) -> None:
    """Given logs across a month, When a range is queried, Then inclusive and ascending."""
    _ = _post_log(api_client,1)
    _ = _post_log(api_client,10, exercised=False)
    _ = _post_log(api_client,20)
    middle = _HABITS.validate_json(
        api_client.get("/api/habits", params={"from": "2026-05-10", "to": "2026-05-20"}).text
    )
    assert [log.log_date for log in middle] == [date(2026, 5, 10), date(2026, 5, 20)]
    whole = _HABITS.validate_json(
        api_client.get("/api/habits", params={"from": "2026-05-01", "to": "2026-05-31"}).text
    )
    assert [log.log_date for log in whole] == [
        date(2026, 5, 1),
        date(2026, 5, 10),
        date(2026, 5, 20),
    ]


def test_range_outside_bounds_returns_empty(api_client: TestClient) -> None:
    """Given logs in May, When June is queried, Then an empty list is returned."""
    _ = _post_log(api_client,1)
    logs = _HABITS.validate_json(
        api_client.get("/api/habits", params={"from": "2026-06-01", "to": "2026-06-30"}).text
    )
    assert logs == []


def test_range_params_are_required(api_client: TestClient) -> None:
    """Given missing range parameters, When queried, Then a validation error is returned."""
    assert api_client.get("/api/habits").status_code == 422
    assert api_client.get("/api/habits", params={"from": "2026-05-01"}).status_code == 422
