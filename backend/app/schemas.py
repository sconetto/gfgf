"""Pydantic v2 request/response schemas for the feature APIs."""

from datetime import date, datetime
from decimal import Decimal
from typing import ClassVar, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.laptime import parse_lap_time_ms


class WeightCreate(BaseModel):
    """POST /api/weights request body."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    recorded_on: date
    weight_kg: Decimal = Field(gt=0)
    body_fat_pct: Decimal | None = Field(default=None, ge=0, le=100)
    note: str | None = None


class WeightRead(BaseModel):
    """A weigh-in as returned by the API."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, from_attributes=True)

    id: int
    recorded_on: date
    weight_kg: float
    body_fat_pct: float | None
    note: str | None


class LapCreate(BaseModel):
    """POST /api/laps request body; lap_time is an m:ss.ms or ss.ms string."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    track_name: str = Field(min_length=1)
    lap_time: str
    lap_date: date
    kart_class: str | None = None
    note: str | None = None

    @field_validator("lap_time")
    @classmethod
    def _lap_time_is_parseable(cls, value: str) -> str:
        # LapTimeParseError is a ValueError, so pydantic turns it into a 422.
        _ = parse_lap_time_ms(value)
        return value

    @computed_field  # pydantic: include in serialization
    @property
    def time_ms(self) -> int:
        """Lap time parsed to integer milliseconds (design D3)."""
        return parse_lap_time_ms(self.lap_time)


class LapRead(BaseModel):
    """A stored lap as returned by the API."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, from_attributes=True)

    id: int
    track_name: str
    time_ms: int
    lap_date: date
    kart_class: str | None
    note: str | None


class PersonalBestRead(BaseModel):
    """Lifetime best (minimum) lap time for one track."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    track_name: str
    best_time_ms: int


class SessionBestRead(BaseModel):
    """Best (minimum) lap time for one track on one day."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    track_name: str
    lap_date: date
    best_time_ms: int


class IngestResponse(BaseModel):
    """POST /api/ingest/health response body."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    status: Literal["ok"]
    ingested: int


class MetricRead(BaseModel):
    """A stored health metric reading as returned by the API."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, from_attributes=True)

    id: int
    metric_type: str
    value: float
    unit: str | None
    measured_at: datetime
    source: str | None


class HabitLogCreate(BaseModel):
    """POST /api/habits request body."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    log_date: date
    exercised: bool
    flags: dict[str, bool] = Field(default_factory=dict)
    note: str | None = None


class HabitLogRead(BaseModel):
    """A daily habit log as returned by the API."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, from_attributes=True)

    id: int
    log_date: date
    exercised: bool
    flags: dict[str, bool]
    note: str | None


ActivityLevel = Literal["sedentary", "light", "moderate", "very_active"]
Sex = Literal["male", "female"]


class ProfileCreate(BaseModel):
    """PUT /api/profile request body."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    age_years: int = Field(ge=1, le=120)
    sex: Sex
    height_cm: Decimal = Field(gt=0)
    activity_level: ActivityLevel


class ProfileRead(BaseModel):
    """The single-user profile as returned by the API."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, from_attributes=True)

    id: int
    age_years: int
    sex: Sex
    height_cm: float
    activity_level: ActivityLevel
