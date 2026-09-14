"""Native parsing of Health Export Kit (schema v2) export payloads.

The Health Export Kit iOS app exports a single JSON object with `activity`,
`additional`, `sleep`, and `meta` sections. Daily rows are keyed by a
`YYYY-MM-DD` date and flatten into metric drafts pinned at noon local time
(`meta.timeZone`, UTC fallback). Sleep sessions carry second totals that are
converted to hours and an `MM-dd HH:mm:ss` end timestamp anchored at the year
of `meta.rangeStart`. Full-resolution streams, medications, and totals are
intentionally skipped in favor of the daily aggregates; malformed rows are
skipped rather than rejected. The shared primitives are imported from the
`app.health_types` leaf module so no import cycle exists between the two
parsers (basedpyright counts even the dispatch's lazy import as an edge).
"""

from collections.abc import Mapping
from datetime import UTC, datetime, time, tzinfo
from decimal import Decimal
from typing import Final
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.health_types import IngestPayloadError, JsonValue, MetricDraft

__all__ = ["parse_health_export_kit"]

_NOON: Final = time(12, 0)
_SECONDS_PER_HOUR: Final[Decimal] = Decimal(3600)

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
_DAILY_VALUE_SECTIONS: Final = (
    ("heart", _HEART_FIELDS),
    ("mind", _MIND_FIELDS),
    ("mobility", _MOBILITY_FIELDS),
)


def parse_health_export_kit(payload: dict[str, JsonValue]) -> list[MetricDraft]:
    """Flatten a Health Export Kit export into metric drafts."""
    meta = payload.get("meta")
    if not isinstance(meta, dict):
        raise IngestPayloadError("health export kit payload is missing meta")
    tz = _timezone_from_meta(meta)
    drafts = _activity_drafts(payload.get("activity"), tz)
    additional = payload.get("additional")
    if isinstance(additional, dict):
        for section_name, field_map in _DAILY_VALUE_SECTIONS:
            drafts.extend(_daily_values_drafts(additional.get(section_name), field_map, tz))
    drafts.extend(_sleep_drafts(payload.get("sleep"), tz, _anchor_year_from_meta(meta)))
    return drafts


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
    """Year the export range starts in; sleep MM-dd stamps anchor to it."""
    raw = meta.get("rangeStart")
    if not isinstance(raw, str):
        return None
    try:
        return datetime.fromisoformat(raw).year
    except ValueError:
        return None


def _daily_timestamp(raw: JsonValue, tz: tzinfo) -> datetime | None:
    """Noon local time on the row's YYYY-MM-DD date, converted to UTC."""
    if not isinstance(raw, str):
        return None
    try:
        day = datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None
    return datetime.combine(day, _NOON, tz).astimezone(UTC)


def _sleep_timestamp(raw: JsonValue, tz: tzinfo, anchor_year: int) -> datetime | None:
    """Resolve an MM-dd HH:mm:ss end stamp in the anchor year, as UTC."""
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


def _activity_drafts(activity: JsonValue, tz: tzinfo) -> list[MetricDraft]:
    """Flatten activity.daily rows; each mapped numeric field becomes one draft."""
    if not isinstance(activity, dict):
        return []
    daily = activity.get("daily")
    if not isinstance(daily, list):
        return []
    drafts: list[MetricDraft] = []
    for row in daily:
        if not isinstance(row, dict):
            continue
        measured_at = _daily_timestamp(row.get("date"), tz)
        if measured_at is None:
            continue
        drafts.extend(_row_drafts(row, _ACTIVITY_FIELDS, measured_at))
    return drafts


def _daily_values_drafts(
    section: JsonValue,
    field_map: Mapping[str, tuple[str, str]],
    tz: tzinfo,
) -> list[MetricDraft]:
    """Flatten a daily[].values section (heart, mind, mobility)."""
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
        measured_at = _sleep_timestamp(session.get("end"), tz, anchor_year)
        if measured_at is None:
            continue
        drafts.extend(_row_drafts(session, _SLEEP_DIRECT_FIELDS, measured_at))
        drafts.extend(_hour_drafts(session, _SLEEP_HOUR_FIELDS, measured_at))
        stages = session.get("stageTotalsSec")
        if isinstance(stages, dict):
            drafts.extend(_hour_drafts(stages, _SLEEP_STAGE_FIELDS, measured_at))
    return drafts
