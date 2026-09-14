"""Unit tests for the Health Export Kit (schema v2) export parser dispatch."""

from collections import Counter
from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Final

from app.health_payload import MetricDraft, WeightDraft, parse_health_ingest, parse_health_payload

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


_EXTENDED_EXPORT: Final[str] = """
{
  "meta": {
    "app": "Health Export Kit",
    "appVersion": "1.0.16",
    "schemaVersion": 2,
    "timeZone": "America/Sao_Paulo",
    "rangeStart": "2026-09-07T17:56:06Z"
  },
  "activity": {
    "daily": [{"date": "2026-09-07", "steps": 9000}],
    "workouts": [
      {
        "start": "09-07 18:30:00",
        "durationSec": 3600,
        "distanceKm": 8.2,
        "activeEnergyKcal": 420.3,
        "totalEnergyKcal": 500.1,
        "averageHeartRateBpm": 155,
        "maxHeartRateBpm": 178,
        "type": "running",
        "splits": [{"distanceKm": 1.0, "durationSec": 300}],
        "streams": {"heartRate": [{"t": "09-07 18:31:00", "v": 120}]}
      },
      {"start": "09-09 07:15:00", "durationSec": 2400, "distanceKm": 5.0, "activeEnergyKcal": 250.0}
    ]
  },
  "additional": {
    "heart": {
      "daily": [{"date": "2026-09-07", "values": {"vo2max": 38.2, "restingHR": 62}}]
    },
    "body": {
      "daily": [
        {
          "date": "2026-09-07",
          "values": {
            "bodyMass": 82.4,
            "bodyFat": 24.1,
            "bmi": 26.3,
            "height": 177.5,
            "leanMass": 62.5
          }
        },
        {"date": "2026-09-08", "values": {"bodyMass": 82.1}}
      ]
    },
    "nutrition": {
      "daily": [
        {
          "date": "2026-09-07",
          "values": {
            "caffeine": 95,
            "carbs": 210.5,
            "cholesterol": 300,
            "dietEnergy": 2100,
            "fat": 70.2,
            "fiber": 12.4,
            "protein": 110.0,
            "satFat": 22.1,
            "sodium": 3400,
            "sugar": 60.5,
            "water": 2200
          }
        }
      ]
    }
  },
  "sleep": {
    "sessions": [
      {
        "asleepSec": 34535,
        "durationSec": 35492,
        "end": "09-08 07:03:46",
        "vitals": {
          "heartRate": {"avg": 52},
          "hrvSDNN": {"avg": 48},
          "oxygenSaturation": {"avg": 95.5},
          "respiratoryRate": {"avg": 14.2}
        }
      }
    ]
  }
}
"""


def test_parse_export_kit_heart_vo2max_field() -> None:
    """Given a heart daily row with vo2max, When parsed, Then a vo2_max draft with its unit."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    vo2 = _one_draft(drafts, "vo2_max")
    assert (vo2.value, vo2.unit) == (Decimal("38.2"), "mL/kg·min")
    assert vo2.measured_at == datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def test_parse_export_kit_body_metric_fields() -> None:
    """Given a body daily row, When parsed, Then bmi/height/leanMass map with exact units."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    expected = {
        "bmi": (Decimal("26.3"), "BMI"),
        "height": (Decimal("177.5"), "cm"),
        "lean_mass": (Decimal("62.5"), "kg"),
    }
    for metric_type, (value, unit) in expected.items():
        draft = _one_draft(drafts, metric_type)
        assert (draft.value, draft.unit) == (value, unit)
        assert draft.measured_at == datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def test_parse_export_kit_nutrition_fields() -> None:
    """Given a nutrition daily row, When parsed, Then all eleven sums map with exact units."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    expected = {
        "caffeine": (Decimal("95"), "mg"),
        "carbs": (Decimal("210.5"), "g"),
        "cholesterol": (Decimal("300"), "mg"),
        "diet_energy": (Decimal("2100"), "kcal"),
        "fat": (Decimal("70.2"), "g"),
        "fiber": (Decimal("12.4"), "g"),
        "protein": (Decimal("110.0"), "g"),
        "sat_fat": (Decimal("22.1"), "g"),
        "sodium": (Decimal("3400"), "mg"),
        "sugar": (Decimal("60.5"), "g"),
        "water": (Decimal("2200"), "mL"),
    }
    for metric_type, (value, unit) in expected.items():
        draft = _one_draft(drafts, metric_type)
        assert (draft.value, draft.unit) == (value, unit)
        assert draft.measured_at == datetime(2026, 9, 7, 15, 0, tzinfo=UTC)


def test_parse_export_kit_sleep_vitals() -> None:
    """Given a sleep session with vitals, When parsed, Then each avg maps at the session end stamp."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    expected = {
        "sleep_hr_avg": (Decimal("52"), "bpm"),
        "sleep_hrv": (Decimal("48"), "ms"),
        "sleep_spo2": (Decimal("95.5"), "%"),
        "sleep_respiratory_rate": (Decimal("14.2"), "brpm"),
    }
    for metric_type, (value, unit) in expected.items():
        draft = _one_draft(drafts, metric_type)
        assert (draft.value, draft.unit) == (value, unit)
        assert draft.measured_at == datetime(2026, 9, 8, 10, 3, 46, tzinfo=UTC)


def test_parse_export_kit_workout_fields() -> None:
    """Given workouts, When parsed, Then mapped fields yield drafts with duration in minutes."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    duration = _drafts_of(drafts, "workout_duration")
    assert {d.value for d in duration} == {Decimal("3600") / Decimal(60), Decimal("2400") / Decimal(60)}
    assert all(d.unit == "min" for d in duration)
    expected = {
        "workout_distance": [(Decimal("8.2"), "km"), (Decimal("5.0"), "km")],
        "workout_active_energy": [(Decimal("420.3"), "kcal"), (Decimal("250.0"), "kcal")],
        "workout_total_energy": [(Decimal("500.1"), "kcal")],
        "workout_avg_hr": [(Decimal("155"), "bpm")],
        "workout_max_hr": [(Decimal("178"), "bpm")],
    }
    for metric_type, pairs in expected.items():
        assert {(d.value, d.unit) for d in _drafts_of(drafts, metric_type)} == set(pairs)
    starts = {d.measured_at for d in _drafts_of(drafts, "workout_duration")}
    assert starts == {
        datetime(2026, 9, 7, 21, 30, 0, tzinfo=UTC),
        datetime(2026, 9, 9, 10, 15, 0, tzinfo=UTC),
    }


def test_parse_export_kit_body_mass_becomes_weight_drafts() -> None:
    """Given body daily rows with bodyMass, When ingested, Then weight drafts carry body fat when numeric."""
    ingest = parse_health_ingest(_EXTENDED_EXPORT)
    assert ingest.weights == [
        WeightDraft(
            recorded_on=date(2026, 9, 7), weight_kg=Decimal("82.4"), body_fat_pct=Decimal("24.1")
        ),
        WeightDraft(recorded_on=date(2026, 9, 8), weight_kg=Decimal("82.1"), body_fat_pct=None),
    ]


def test_parse_export_kit_extended_metrics_include_new_signals() -> None:
    """Given the extended export, When parsed via the metrics wrapper, Then new signals are present."""
    drafts = parse_health_payload(_EXTENDED_EXPORT)
    for metric_type in ("vo2_max", "bmi", "caffeine", "sleep_hrv", "workout_duration"):
        assert _drafts_of(drafts, metric_type), f"expected at least one {metric_type} draft"


def test_parse_health_ingest_generic_payload_has_no_weights() -> None:
    """Given a generic records list, When ingested, Then metrics parse as before and no weights."""
    ingest = parse_health_ingest('[{"type": "x", "value": 1}]')
    assert ingest.weights == []
    assert len(ingest.metrics) == 1
    assert ingest.metrics[0].metric_type == "x"
