"""Integration tests for the single-user profile API (design D9)."""

from fastapi.testclient import TestClient

from app.schemas import ProfileRead


def test_get_profile_empty_returns_null(api_client: TestClient) -> None:
    """Given no saved profile, When fetched, Then null is returned."""
    response = api_client.get("/api/profile")
    assert response.status_code == 200
    assert response.json() is None


def test_put_creates_then_updates_single_row(api_client: TestClient) -> None:
    """Given a PUT, Then one row is stored; a second PUT updates it, not duplicates."""
    created = api_client.put(
        "/api/profile",
        json={
            "age_years": 34,
            "sex": "male",
            "height_cm": 178.5,
            "activity_level": "moderate",
        },
    )
    assert created.status_code == 200
    first = ProfileRead.model_validate_json(created.text)
    assert first.age_years == 34
    assert first.sex == "male"
    assert first.height_cm == 178.5
    assert first.activity_level == "moderate"

    updated = api_client.put(
        "/api/profile",
        json={
            "age_years": 35,
            "sex": "male",
            "height_cm": 178.5,
            "activity_level": "very_active",
        },
    )
    assert updated.status_code == 200
    second = ProfileRead.model_validate_json(updated.text)
    assert second.age_years == 35
    assert second.activity_level == "very_active"

    fetched = ProfileRead.model_validate_json(api_client.get("/api/profile").text)
    assert fetched.id == first.id
    assert fetched.age_years == 35


def test_put_rejects_invalid_sex_and_activity(api_client: TestClient) -> None:
    """Given an out-of-enum value, When PUT, Then a validation error is returned."""
    bad_sex = api_client.put(
        "/api/profile",
        json={
            "age_years": 30,
            "sex": "other",
            "height_cm": 170,
            "activity_level": "moderate",
        },
    )
    assert bad_sex.status_code == 422

    bad_activity = api_client.put(
        "/api/profile",
        json={
            "age_years": 30,
            "sex": "female",
            "height_cm": 170,
            "activity_level": "extreme",
        },
    )
    assert bad_activity.status_code == 422
