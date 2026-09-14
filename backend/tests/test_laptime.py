"""Unit tests for the pure lap-time parser."""

import pytest

from app.laptime import LapTimeParseError, parse_lap_time_ms


def test_parse_returns_milliseconds_for_bare_seconds_with_fraction() -> None:
    """Given "40.132", When parsed, Then 40132 ms."""
    assert parse_lap_time_ms("40.132") == 40132


def test_parse_returns_milliseconds_for_minutes_seconds_fraction() -> None:
    """Given "1:03.500", When parsed, Then 63500 ms."""
    assert parse_lap_time_ms("1:03.500") == 63500


def test_parse_returns_milliseconds_for_zero_minutes_short_fraction() -> None:
    """Given "0:40.1", When parsed, Then 40100 ms (fraction padded to 100 ms)."""
    assert parse_lap_time_ms("0:40.1") == 40100


@pytest.mark.parametrize(
    ("raw", "expected_ms"),
    [
        ("40", 40000),
        ("1:03", 63000),
        ("1:03.5", 63500),
        ("1:03.50", 63500),
        ("2:00.000", 120000),
        ("59.999", 59999),
        ("100.5", 100500),
        (" 40.132 ", 40132),
        ("10:00.0", 600000),
    ],
)
def test_parse_valid_lap_time_formats(raw: str, expected_ms: int) -> None:
    """Given a valid m:ss.ms or ss.ms string, When parsed, Then exact ms."""
    assert parse_lap_time_ms(raw) == expected_ms


@pytest.mark.parametrize(
    "raw",
    [
        "abc",
        "1:2:3",
        "",
        "   ",
        "-40.5",
        "-1:03.5",
        "1:60.0",
        "40.1324",
        ":40.1",
        "1:.5",
        "40,132",
        "1234",
        "1:3.4.5",
    ],
)
def test_reject_invalid_lap_time_strings(raw: str) -> None:
    """Given an unparseable string, When parsed, Then LapTimeParseError."""
    with pytest.raises(LapTimeParseError):
        _ = parse_lap_time_ms(raw)


def test_error_exposes_the_raw_input() -> None:
    """Given invalid input, When parse fails, Then the error carries the raw value."""
    with pytest.raises(LapTimeParseError) as excinfo:
        _ = parse_lap_time_ms("abc")
    assert excinfo.value.raw == "abc"
