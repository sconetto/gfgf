"""Native parsing of Health Export Kit (schema v2) export payloads.

The Health Export Kit iOS app exports a single JSON object with `activity`,
`additional`, `sleep`, and `meta` sections. Daily rows are keyed by a
`YYYY-MM-DD` date and flatten into metric drafts pinned at noon local time
(`meta.timeZone`, UTC fallback). Sleep sessions carry second totals that are
converted to hours and an `MM-dd HH:mm:ss` end timestamp anchored at the year
of `meta.rangeStart`; session vitals flatten alongside, and `activity.workouts`
rows anchor their `MM-dd HH:mm:ss` start stamps the same way (duration becomes
minutes). Apple body-mass rows additionally become weight drafts for the
manual weight table. Full-resolution streams, medications, workout
types/splits, and totals are intentionally skipped in favor of the daily
aggregates; malformed rows are skipped rather than rejected. The shared
primitives are imported from the `app.health_types` leaf module so no import
cycle exists between the two parsers (basedpyright counts even the dispatch's
lazy import as an edge).
"""

from collections.abc import Mapping
from datetime import UTC, date, datetime, time, tzinfo
from decimal import Decimal
from typing import Final
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.health_types import IngestDraft, IngestPayloadError, JsonValue, MetricDraft, WeightDraft

__all__ = ["parse_health_export_kit"]

_NOON: Final = time(12, 0)
_SECONDS_PER_HOUR: Final[Decimal] = Decimal(3600)
_SECONDS_PER_MINUTE: Final[Decimal] = Decimal(60)

_ACTIVITY_FIELDS: Final = {
    "steps": ("steps", "count"),
    "activeEnergyKcal": ("active_energy", "kcal"),
    "basalEnergyKcal": ("basal_energy", "kcal"),
    "distanceKm": ("distance_km", "km"),
    "flightsClimbed": ("flights_climbed", "flights"),
}
_HEART_FIELDS: Final = {
    "restingHR": ("resting_heart_rate", "bpm"),
    "hrAll": ("heart_rate_avg", "bpm"),
    "vo2max": ("vo2_max", "mL/kg·min"),
    "spo2All": ("spo2", "%"),
    "breathingDisturbances": ("breathing_disturbances", "count"),
    "walkingHR": ("walking_heart_rate", "bpm"),
}
_MIND_FIELDS: Final = {
    "daylight": ("daylight_minutes", "min"),
}
_MOBILITY_FIELDS: Final = {
    "walkingSpeed": ("walking_speed", "km/h"),
    "walkingAsymmetry": ("walking_asymmetry", "%"),
    "stepLength": ("step_length", "cm"),
    "doubleSupport": ("double_support_time", "%"),
    "stairUp": ("stair_speed_up", "m/s"),
}
_BODY_METRIC_FIELDS: Final = {
    "bmi": ("bmi", "BMI"),
    "height": ("height", "cm"),
    "leanMass": ("lean_mass", "kg"),
}
_NUTRITION_FIELDS: Final = {
    "caffeine": ("caffeine", "mg"),
    "carbs": ("carbs", "g"),
    "cholesterol": ("cholesterol", "mg"),
    "dietEnergy": ("diet_energy", "kcal"),
    "fat": ("fat", "g"),
    "fiber": ("fiber", "g"),
    "protein": ("protein", "g"),
    "satFat": ("sat_fat", "g"),
    "sodium": ("sodium", "mg"),
    "sugar": ("sugar", "g"),
    "water": ("water", "mL"),
}
_SLEEP_DIRECT_FIELDS: Final = {
    "sleepEfficiencyPct": ("sleep_efficiency", "%"),
    "awakenings": ("sleep_awakenings", "count"),
}
_SLEEP_HOUR_FIELDS: Final = {
    "asleepSec": ("sleep", "h"),
    "durationSec": ("sleep_duration", "h"),
}
_SLEEP_STAGE_FIELDS: Final = {
    "asleepDeep": ("sleep_deep", "h"),
    "asleepREM": ("sleep_rem", "h"),
    "asleepCore": ("sleep_core", "h"),
}
_SLEEP_VITAL_FIELDS: Final = {
    "heartRate": ("sleep_hr_avg", "bpm"),
    "hrvSDNN": ("sleep_hrv", "ms"),
    "oxygenSaturation": ("sleep_spo2", "%"),
    "respiratoryRate": ("sleep_respiratory_rate", "brpm"),
}
_WORKOUT_FIELDS: Final = {
    "distanceKm": ("workout_distance", "km"),
    "activeEnergyKcal": ("workout_active_energy", "kcal"),
    "totalEnergyKcal": ("workout_total_energy", "kcal"),
    "averageHeartRateBpm": ("workout_avg_hr", "bpm"),
    "maxHeartRateBpm": ("workout_max_hr", "bpm"),
}
_DAILY_VALUE_SECTIONS: Final = (
    ("heart", _HEART_FIELDS),
    ("mind", _MIND_FIELDS),
    ("mobility", _MOBILITY_FIELDS),
    ("body", _BODY_METRIC_FIELDS),
    ("nutrition", _NUTRITION_FIELDS),
)


def parse_health_export_kit(payload: dict[str, JsonValue]) -> IngestDraft:
    """Flatten a Health Export Kit export into metric and weight drafts."""
    meta = payload.get("meta")
    if not isinstance(meta, dict):
        raise IngestPayloadError("health export kit payload is missing meta")
    tz = _timezone_from_meta(meta)
    anchor_year = _anchor_year_from_meta(meta)
    drafts = _activity_drafts(payload.get("activity"), tz, anchor_year)
    weights: list[WeightDraft] = []
    additional = payload.get("additional")
    if isinstance(additional, dict):
        for section_name, field_map in _DAILY_VALUE_SECTIONS:
            drafts.extend(_daily_values_drafts(additional.get(section_name), field_map, tz))
        weights = _body_weight_drafts(additional.get("body"))
    drafts.extend(_sleep_drafts(payload.get("sleep"), tz, anchor_year))
    return IngestDraft(metrics=drafts, weights=weights)


def _timezone_from_meta(meta: dict[str, JsonValue]) -> tzinfo:
    """Resolve the export's IANA timezone, falling back to UTC."""
    raw = meta.get("timeZone")
    if not isinstance(raw, str):
        return UTC
    try:
        return ZoneInfo(raw)
    except (ValueError, ZoneInfoNotFoundError):
        return UTC


def _anchor_year_from_meta(meta: dict[str, JsonValue]) -> int | None:
    """Year the export range starts in; sleep and workout MM-dd stamps anchor to it."""
    raw = meta.get("rangeStart")
    if not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw).year
    except ValueError:
        return None


def _daily_date(raw: JsonValue) -> date | None:
    """A daily row's YYYY-MM-DD date, or None when absent or unparseable."""
    if not isinstance(raw, str):
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def _daily_timestamp(raw: JsonValue, tz: tzinfo) -> datetime | None:
    """Noon local time on the row's YYYY-MM-DD date, converted to UTC."""
    day = _daily_date(raw)
    if day is None:
        return None
    return datetime.combine(day, _NOON, tz).astimezone(UTC)


def _anchored_timestamp(raw: JsonValue, tz: tzinfo, anchor_year: int) -> datetime | None:
    """Resolve an MM-dd HH:mm:ss stamp in the anchor year, as UTC."""
    if not isinstance(raw, str):
        return None
    try:
        stamp = datetime.strptime(f"{anchor_year} {raw}", "%Y %m-%d %H:%M:%S")
    except ValueError:
        return None
    return stamp.replace(tzinfo=tz).astimezone(UTC)


def _decimal_value(value: JsonValue) -> Decimal | None:
    """Numeric JSON value as an exact Decimal; None for anything else."""
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return Decimal(str(value))
    return None


def _row_drafts(
    source: Mapping[str, JsonValue],
    field_map: Mapping[str, tuple[str, str]],
    measured_at: datetime,
) -> list[MetricDraft]:
    """One draft per mapped field that is present and numeric in `source`."""
    drafts: list[MetricDraft] = []
    for field, (metric_type, unit) in field_map.items():
        value = _decimal_value(source.get(field))
        if value is None:
            continue
        drafts.append(
            MetricDraft(metric_type=metric_type, value=value, unit=unit, measured_at=measured_at)
        )
    return drafts


def _hour_drafts(
    source: Mapping[str, JsonValue],
    field_map: Mapping[str, tuple[str, str]],
    measured_at: datetime,
) -> list[MetricDraft]:
    """One draft per mapped field, with the seconds value converted to hours."""
    drafts: list[MetricDraft] = []
    for field, (metric_type, unit) in field_map.items():
        seconds = _decimal_value(source.get(field))
        if seconds is None:
            continue
        drafts.append(
            MetricDraft(
                metric_type=metric_type,
                value=seconds / _SECONDS_PER_HOUR,
                unit=unit,
                measured_at=measured_at,
            )
        )
    return drafts


def _activity_drafts(activity: JsonValue, tz: tzinfo, anchor_year: int | None) -> list[MetricDraft]:
    """Flatten activity.daily rows and workouts; each mapped numeric field becomes one draft."""
    if not isinstance(activity, dict):
        return []
    drafts: list[MetricDraft] = []
    daily = activity.get("daily")
    if isinstance(daily, list):
        for row in daily:
            if not isinstance(row, dict):
                continue
            measured_at = _daily_timestamp(row.get("date"), tz)
            if measured_at is None:
                continue
            drafts.extend(_row_drafts(row, _ACTIVITY_FIELDS, measured_at))
    drafts.extend(_workout_drafts(activity.get("workouts"), tz, anchor_year))
    return drafts


def _workout_drafts(workouts: JsonValue, tz: tzinfo, anchor_year: int | None) -> list[MetricDraft]:
    """Flatten activity.workouts rows; duration becomes minutes, start stamps anchor at the range year."""
    if not isinstance(workouts, list) or anchor_year is None:
        return []
    drafts: list[MetricDraft] = []
    for workout in workouts:
        if not isinstance(workout, dict):
            continue
        measured_at = _anchored_timestamp(workout.get("start"), tz, anchor_year)
        if measured_at is None:
            continue
        drafts.extend(_row_drafts(workout, _WORKOUT_FIELDS, measured_at))
        duration_sec = _decimal_value(workout.get("durationSec"))
        if duration_sec is not None:
            drafts.append(
                MetricDraft(
                    metric_type="workout_duration",
                    value=duration_sec / _SECONDS_PER_MINUTE,
                    unit="min",
                    measured_at=measured_at,
                )
            )
    return drafts


def _daily_values_drafts(
    section: JsonValue,
    field_map: Mapping[str, tuple[str, str]],
    tz: tzinfo,
) -> list[MetricDraft]:
    """Flatten a daily[].values section (heart, mind, mobility, body, nutrition)."""
    if not isinstance(section, dict):
        return []
    daily = section.get("daily")
    if not isinstance(daily, list):
        return []
    drafts: list[MetricDraft] = []
    for row in daily:
        if not isinstance(row, dict):
            continue
        measured_at = _daily_timestamp(row.get("date"), tz)
        values = row.get("values")
        if measured_at is None or not isinstance(values, dict):
            continue
        drafts.extend(_row_drafts(values, field_map, measured_at))
    return drafts


def _sleep_drafts(sleep: JsonValue, tz: tzinfo, anchor_year: int | None) -> list[MetricDraft]:
    """Flatten sleep.sessions rows; second totals become hours."""
    if not isinstance(sleep, dict) or anchor_year is None:
        return []
    sessions = sleep.get("sessions")
    if not isinstance(sessions, list):
        return []
    drafts: list[MetricDraft] = []
    for session in sessions:
        if not isinstance(session, dict):
            continue
        measured_at = _anchored_timestamp(session.get("end"), tz, anchor_year)
        if measured_at is None:
            continue
        drafts.extend(_row_drafts(session, _SLEEP_DIRECT_FIELDS, measured_at))
        drafts.extend(_hour_drafts(session, _SLEEP_HOUR_FIELDS, measured_at))
        stages = session.get("stageTotalsSec")
        if isinstance(stages, dict):
            drafts.extend(_hour_drafts(stages, _SLEEP_STAGE_FIELDS, measured_at))
        drafts.extend(_sleep_vital_drafts(session.get("vitals"), measured_at))
    return drafts


def _sleep_vital_drafts(vitals: JsonValue, measured_at: datetime) -> list[MetricDraft]:
    """One draft per session vital whose avg is present and numeric."""
    if not isinstance(vitals, dict):
        return []
    drafts: list[MetricDraft] = []
    for field, (metric_type, unit) in _SLEEP_VITAL_FIELDS.items():
        avg = vitals.get(field)
        if not isinstance(avg, dict):
            continue
        value = _decimal_value(avg.get("avg"))
        if value is None:
            continue
        drafts.append(
            MetricDraft(metric_type=metric_type, value=value, unit=unit, measured_at=measured_at)
        )
    return drafts


def _body_weight_drafts(body: JsonValue) -> list[WeightDraft]:
    """Apple body-mass daily rows become weight drafts; body fat rides along when numeric."""
    if not isinstance(body, dict):
        return []
    daily = body.get("daily")
    if not isinstance(daily, list):
        return []
    weights: list[WeightDraft] = []
    for row in daily:
        if not isinstance(row, dict):
            continue
        recorded_on = _daily_date(row.get("date"))
        values = row.get("values")
        if recorded_on is None or not isinstance(values, dict):
            continue
        weight_kg = _decimal_value(values.get("bodyMass"))
        if weight_kg is None:
            continue
        weights.append(
            WeightDraft(
                recorded_on=recorded_on,
                weight_kg=weight_kg,
                body_fat_pct=_decimal_value(values.get("bodyFat")),
            )
        )
    return weights
