"""Integration tests for the lap tracking API (OpenSpec tasks 4.1-4.3)."""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from app.schemas import LapRead, PersonalBestRead, SessionBestRead

_LAPS = TypeAdapter(list[LapRead])
_PERSONAL_BESTS = TypeAdapter(list[PersonalBestRead])
_SESSION_BESTS = TypeAdapter(list[SessionBestRead])


def _post_lap(
    api_client: TestClient, track: str, lap_time: str, day: int, *, kart_class: str | None = None
) -> LapRead:
    response = api_client.post(
        "/api/laps",
        json={
            "track_name": track,
            "lap_time": lap_time,
            "lap_date": f"2026-07-{day:02d}",
            "kart_class": kart_class,
        },
    )
    assert response.status_code == 201
    return LapRead.model_validate_json(response.text)


@pytest.mark.parametrize("lap_time", ["abc", "1:60.0", "", "40.1324", "1:2:3"])
def test_create_lap_rejects_invalid_time(api_client: TestClient, lap_time: str) -> None:
    """Given an unparseable lap time, When posted, Then a validation error is returned."""
    response = api_client.post(
        "/api/laps", json={"track_name": "Interlagos", "lap_time": lap_time, "lap_date": "2026-07-01"}
    )
    assert response.status_code == 422
    assert _LAPS.validate_json(api_client.get("/api/laps").text) == []


def test_create_lap_converts_time_to_ms(api_client: TestClient) -> None:
    """Given a m:ss.ms lap time, When posted, Then it is stored as milliseconds."""
    lap = _post_lap(api_client, "Interlagos", "1:03.500", 1, kart_class="Sprint")
    assert lap.time_ms == 63500
    assert lap.kart_class == "Sprint"
    assert lap.lap_date == date(2026, 7, 1)


def test_list_laps_orders_by_date_and_filters_by_track(api_client: TestClient) -> None:
    """Given laps on several dates and tracks, When listed, Then date-ascending and filtered."""
    _ = _post_lap(api_client,"Interlagos", "1:03.500", 2)
    _ = _post_lap(api_client,"Bira", "0:41.000", 1)
    _ = _post_lap(api_client,"Interlagos", "1:02.000", 1)
    all_laps = _LAPS.validate_json(api_client.get("/api/laps").text)
    assert [lap.lap_date for lap in all_laps] == [
        date(2026, 7, 1),
        date(2026, 7, 1),
        date(2026, 7, 2),
    ]
    only_bira = _LAPS.validate_json(api_client.get("/api/laps", params={"track": "Bira"}).text)
    assert [lap.track_name for lap in only_bira] == ["Bira"]


def test_personal_bests_returns_min_per_track(api_client: TestClient) -> None:
    """Given multiple laps per track, When personal bests are queried, Then minimum per track."""
    _ = _post_lap(api_client,"Interlagos", "1:03.500", 1)
    _ = _post_lap(api_client,"Interlagos", "1:02.000", 2)
    _ = _post_lap(api_client,"Bira", "0:41.000", 1)
    bests = _PERSONAL_BESTS.validate_json(api_client.get("/api/laps/personal-bests").text)
    assert bests == [
        PersonalBestRead(track_name="Bira", best_time_ms=41000),
        PersonalBestRead(track_name="Interlagos", best_time_ms=62000),
    ]


def test_session_bests_returns_min_per_track_per_day(api_client: TestClient) -> None:
    """Given laps per track on two days, When session bests are queried, Then minimum per day."""
    _ = _post_lap(api_client,"Interlagos", "1:03.500", 1)
    _ = _post_lap(api_client,"Interlagos", "1:02.000", 1)
    _ = _post_lap(api_client,"Interlagos", "1:01.000", 2)
    bests = _SESSION_BESTS.validate_json(api_client.get("/api/laps/session-bests").text)
    assert bests == [
        SessionBestRead(track_name="Interlagos", lap_date=date(2026, 7, 1), best_time_ms=62000),
        SessionBestRead(track_name="Interlagos", lap_date=date(2026, 7, 2), best_time_ms=61000),
    ]


def test_bests_are_empty_without_laps(api_client: TestClient) -> None:
    """Given no laps, When bests are queried, Then empty lists are returned."""
    assert _PERSONAL_BESTS.validate_json(api_client.get("/api/laps/personal-bests").text) == []
    assert _SESSION_BESTS.validate_json(api_client.get("/api/laps/session-bests").text) == []
