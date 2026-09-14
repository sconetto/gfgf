"""Application configuration loaded from the environment."""

from typing import ClassVar

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ASYNC_DSN_PREFIX = "postgresql+asyncpg://"


class Settings(BaseSettings):
    """Runtime settings for the gfgf backend."""

    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    """Async SQLAlchemy DSN, e.g. postgresql+asyncpg://user:pass@db:5432/gfgf."""

    @field_validator("database_url")
    @classmethod
    def _require_async_dsn(cls, value: str) -> str:
        if not value.startswith(ASYNC_DSN_PREFIX):
            raise ValueError(
                f"DATABASE_URL must be an async DSN starting with {ASYNC_DSN_PREFIX!r} (got {value!r})"
            )
        return value


def get_settings() -> Settings:
    """Build Settings from the process environment (plus optional .env file)."""
    return Settings.model_validate({})
