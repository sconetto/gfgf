"""Unit tests for the Health Export Kit (schema v2) export parser dispatch."""

from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal
from typing import Final

from app.health_payload import MetricDraft, parse_health_payload

_EXPORT: Final[str] = """
{
  "meta": {
    "app": "Health Export Kit",
    "appVersion": "1.0.16",
    "schemaVersion": 2,
    "timeZone": "America/Sao_Paulo",
    "rangeStart": "2026-09-07T17:56:06Z"
  },
  "activity": {
    "daily": [
      {
        "date": "2026-09-07",
        "steps": 8000,
        "activeEnergyKcal": 135.9,
        "basalEnergyKcal": 792.1,
        "distanceKm": 0.61,
        "flightsClimbed": 1,
        "workoutCount": 0
      },
      {"date": "2026-09-08", "steps": 12000, "activeEnergyKcal": 400.5}
    ],
    "totals": {"steps": 20000, "activeEnergyKcal": 536.4}
  },
  "additional": {
    "heart": {
      "daily": [
        {"date": "2026-09-07", "values": {"hrAll": 82, "spo2All": 94.8, "breathingDisturbances": 1.4}},
        {"date": "2026-09-08", "values": {"restingHR": 70, "hrAll": 75, "walkingHR": 68}}
      ],
      "streams": {"heartRate": [{"t": "09-07 21:12:14", "v": 72}]}
    },
    "medications": [{"name": "caffeine", "doseMg": 100}],
    "mind": {"daily": [{"date": "2026-09-08", "values": {"daylight": 40}}]},
    "mobility": {
      "daily": [
        {
          "date": "2026-09-07",
          "values": {
            "walkingSpeed": 3.4,
            "walkingAsymmetry": 0,
            "stepLength": 59,
            "doubleSupport": 32,
            "stairUp": 0.42
          }
        }
      ]
    }
  },
  "sleep": {
    "sessions": [
      {
        "asleepSec": 34535,
        "awakeSec": 957,
        "awakenings": 7,
        "durationSec": 35492,
        "end": "09-08 07:03:46",
        "sleepEfficiencyPct": 97.3,
        "source": "JSconetto Watch Ultra 2",
        "stageTotalsSec": {"asleepCore": 22874, "asleepDeep": 2571, "asleepREM": 9090},
        "stages": [{"durationSec": 1017, "end": "09-07 21:29:11", "stage": "asleepCore", "start": "09-07 21:12:14"}],
        "start": "09-07 21:12:14"
      }
    ],
    "streams": {}
  }
}
"""

_NO_MIND_MOBILITY_EXPORT: Final[str] = """
{
  "meta": {"timeZone": "America/Sao_Paulo", "rangeStart": "2026-09-07T17:56:06Z"},
  "activity": {"daily": [{"date": "2026-09-07", "steps": 100}]},
  "additional": {"heart": {"daily": [{"date": "2026-09-07", "values": {"hrAll": 60}}]}},
  "sleep": {
    "sessions": [
      {"asleepSec": 3600, "durationSec": 3600, "sleepEfficiencyPct": 100.0, "awakenings": 1, "end": "09-08 07:03:46"}
    ]
  }
}
"""

_NO_TZ_EXPORT: Final[str] = """
{
  "meta": {"rangeStart": "2026-09-07T17:56:06Z"},
  "activity": {"daily": [{"date": "2026-09-07", "steps": 5000}]},
  "sleep": {"sessions": []}
}
"""

_MALFORMED_ROWS_EXPORT: Final[str] = """
{
  "meta": {"timeZone": "America/Sao_Paulo", "rangeStart": "2026-09-07T17:56:06Z"},
  "activity": {
    "daily": [{"date": "oops", "steps": 1}, {"date": "2026-09-07", "steps": 5}, "not-an-object"]
  },
  "sleep": {"sessions": []}
}
"""


def _drafts_of(drafts: list[MetricDraft], metric_type: str) -> list[MetricDraft]:
    """All drafts of one metric type, in payload order."""
    return [draft for draft in drafts if draft.metric_type == metric_type]


def _one_draft(drafts: list[MetricDraft], metric_type: str) -> MetricDraft:
    """The single draft of one metric type; asserts it exists exactly once."""
    matches = _drafts_of(drafts, metric_type)
    assert len(matches) == 1
    return matches[0]


def test_parse_export_kit_activity_daily_fields() -> None:
    """Given activity.daily rows, When parsed, Then each mapped field becomes a draft with its unit."""
    drafts = parse_health_payload(_EXPORT)
    assert {(d.value, d.unit) for d in _drafts_of(drafts, "steps")} == {
        (Decimal("8000"), "count"),
        (Decimal("12000"), "count"),
    }
    assert {(d.value, d.unit) for d in _drafts_of(drafts, "active_energy")} == {
        (Decimal("135.9"), "kcal"),
        (Decimal("400.5"), "kcal"),
    }
    basal = _one_draft(drafts, "basal_energy")
    assert (basal.value, basal.unit) == (Decimal("792.1"), "kcal")
    distance = _one_draft(drafts, "distance_km")
    assert (distance.value, distance.unit) == (Decimal("0.61"), "km")
    flights = _one_draft(drafts, "flights_climbed")
    assert (flights.value, flights.unit) == (Decimal("1"), "flights")


def test_parse_export_kit_daily_timestamps_are_noon_local_utc() -> None:
    """Given daily rows in America/Sao_Paulo, When parsed, Then measured at noon local = 15:00 UTC."""
    drafts = parse_health_payload(_EXPORT)
    assert {d.measured_at for d in _drafts_of(drafts, "steps")} == {
        datetime(2026, 9, 7, 15, 0, tzinfo=UTC),
        datetime(2026, 9, 8, 15, 0, tzinfo=UTC),
    }
    daylight = _one_draft(drafts, "daylight_minutes")
    assert daylight.measured_at == datetime(2026, 9, 8, 15, 0, tzinfo=UTC)


def test_parse_export_kit_heart_daily_partial_values() -> None:
    """Given heart daily rows with differing value keys, When parsed, Then only present fields yield drafts."""
    drafts = parse_health_payload(_EXPORT)
    resting = _drafts_of(drafts, "resting_heart_rate")
    assert len(resting) == 1
    assert (resting[0].value, resting[0].unit) == (Decimal("70"), "bpm")
    assert resting[0].measured_at == datetime(2026, 9, 8, 15, 0, tzinfo=UTC)
    spo2 = _one_draft(drafts, "spo2")
    assert (spo2.value, spo2.unit) == (Decimal("94.8"), "%")
    breathing = _one_draft(drafts, "breathing_disturbances")
    assert (breathing.value, breathing.unit) == (Decimal("1.4"), "count")
    walking_hr = _one_draft(drafts, "walking_heart_rate")
    assert (walking_hr.value, walking_hr.unit) == (Decimal("68"), "bpm")
    assert {(d.value, d.unit) for d in _drafts_of(drafts, "heart_rate_avg")} == {
        (Decimal("82"), "bpm"),
        (Decimal("75"), "bpm"),
    }


def test_parse_export_kit_mind_daylight() -> None:
    """Given a mind daily row, When parsed, Then daylight becomes minutes at noon local."""
    drafts = parse_health_payload(_EXPORT)
    daylight = _one_draft(drafts, "daylight_minutes")
    assert (daylight.value, daylight.unit) == (Decimal("40"), "min")
    assert daylight.measured_at == datetime(2026, 9, 8, 15, 0, tzinfo=UTC)


def test_parse_export_kit_mobility_fields() -> None:
    """Given a mobility daily row, When parsed, Then all five fields map with exact units."""
    drafts = parse_health_payload(_EXPORT)
    expected = {
        "walking_speed": (Decimal("3.4"), "km/h"),
        "walking_asymmetry": (Decimal("0"), "%"),
        "step_length": (Decimal("59"), "cm"),
        "double_support_time": (Decimal("32"), "%"),
        "stair_speed_up": (Decimal("0.42"), "m/s"),
    }
    for metric_type, (value, unit) in expected.items():
        draft = _one_draft(drafts, metric_type)
        assert (draft.value, draft.unit) == (value, unit)
        assert draft.measured_at == datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def test_parse_export_kit_sleep_session_converts_seconds_to_hours() -> None:
    """Given sleep session second totals, When parsed, Then exact Decimal hours and direct fields."""
    drafts = parse_health_payload(_EXPORT)
    expected_hours = {
        "sleep": Decimal("34535"),
        "sleep_duration": Decimal("35492"),
        "sleep_deep": Decimal("2571"),
        "sleep_rem": Decimal("9090"),
        "sleep_core": Decimal("22874"),
    }
    for metric_type, seconds in expected_hours.items():
        draft = _one_draft(drafts, metric_type)
        assert draft.value == seconds / Decimal(3600)
        assert draft.unit == "h"
    efficiency = _one_draft(drafts, "sleep_efficiency")
    assert (efficiency.value, efficiency.unit) == (Decimal("97.3"), "%")
    awakenings = _one_draft(drafts, "sleep_awakenings")
    assert (awakenings.value, awakenings.unit) == (Decimal("7"), "count")


def test_parse_export_kit_sleep_timestamp_anchors_at_range_start_year() -> None:
    """Given an MM-dd sleep end stamp, When parsed, Then anchored at the rangeStart year in local tz."""
    drafts = parse_health_payload(_EXPORT)
    sleep = _one_draft(drafts, "sleep")
    assert sleep.measured_at == datetime(2026, 9, 8, 10, 3, 46, tzinfo=UTC)


def test_parse_export_kit_skips_streams_totals_medications_and_unknown_fields() -> None:
    """Given streams/totals/medications and unknown fields, When parsed, Then only daily aggregates yield drafts."""
    drafts = parse_health_payload(_EXPORT)
    assert len(drafts) == 26
    assert Counter(d.metric_type for d in drafts) == Counter(
        [
            "steps",
            "steps",
            "active_energy",
            "active_energy",
            "basal_energy",
            "distance_km",
            "flights_climbed",
            "heart_rate_avg",
            "heart_rate_avg",
            "spo2",
            "breathing_disturbances",
            "resting_heart_rate",
            "walking_heart_rate",
            "daylight_minutes",
            "walking_speed",
            "walking_asymmetry",
            "step_length",
            "double_support_time",
            "stair_speed_up",
            "sleep",
            "sleep_duration",
            "sleep_efficiency",
            "sleep_deep",
            "sleep_rem",
            "sleep_core",
            "sleep_awakenings",
        ]
    )


def test_parse_export_kit_tolerates_missing_mind_and_mobility() -> None:
    """Given an export without mind/mobility sections, When parsed, Then the rest still yields drafts."""
    drafts = parse_health_payload(_NO_MIND_MOBILITY_EXPORT)
    assert _drafts_of(drafts, "daylight_minutes") == []
    assert _drafts_of(drafts, "walking_speed") == []
    steps = _one_draft(drafts, "steps")
    assert steps.value == Decimal("100")
    sleep = _one_draft(drafts, "sleep")
    assert (sleep.value, sleep.unit) == (Decimal("1"), "h")


def test_parse_export_kit_falls_back_to_utc_without_timezone() -> None:
    """Given meta without timeZone, When parsed, Then daily rows pin at noon UTC."""
    drafts = parse_health_payload(_NO_TZ_EXPORT)
    steps = _one_draft(drafts, "steps")
    assert steps.measured_at == datetime(2026, 9, 7, 12, 0, tzinfo=UTC)


def test_parse_export_kit_skips_malformed_daily_rows() -> None:
    """Given an unparseable date row and a non-object row, When parsed, Then only the well-formed row yields drafts."""
    drafts = parse_health_payload(_MALFORMED_ROWS_EXPORT)
    steps = _drafts_of(drafts, "steps")
    assert len(steps) == 1
    assert steps[0].value == Decimal("5")
    assert steps[0].measured_at == datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def test_generic_list_payload_still_routes_to_generic_parser() -> None:
    """Given a generic records list, When parsed, Then the tolerant parser handles it as before."""
    drafts = parse_health_payload('[{"type": "x", "value": 1}]')
    assert len(drafts) == 1
    assert drafts[0].metric_type == "x"
    assert drafts[0].value == Decimal("1")
    assert drafts[0].unit is None
