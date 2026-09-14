"""Tests for the /health endpoint."""

from typing import Literal, cast

from fastapi.testclient import TestClient

from app.main import create_app, get_db_status


def test_health_reports_ok_when_db_round_trip_succeeds() -> None:
    """Given a faked DB dependency, /health returns status ok and db ok."""
    async def fake_db_status() -> Literal["ok"]:
        return "ok"

    application = create_app()
    application.dependency_overrides[get_db_status] = fake_db_status
    client = TestClient(application)

    response = client.get("/health")

    assert response.status_code == 200
    body: object = cast(object, response.json())
    assert body == {"status": "ok", "db": "ok"}
