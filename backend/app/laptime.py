"""Pure lap-time parsing: `m:ss.ms` or `ss.ms` strings to integer milliseconds."""

import re
from typing import Final

__all__ = ["LapTimeParseError", "parse_lap_time_ms"]


class LapTimeParseError(ValueError):
    """Raised when a lap-time string cannot be parsed into milliseconds."""

    raw: str

    def __init__(self, raw: str) -> None:
        self.raw = raw
        super().__init__(f"invalid lap time: {raw!r}")


_LAP_TIME_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"^(?:(\d+):([0-5]?\d)|(\d{1,3}))(?:\.(\d{1,3}))?$"
)


def parse_lap_time_ms(raw: str) -> int:
    """Parse a lap-time string (`m:ss.ms` or `ss.ms`) into integer milliseconds.

    The fraction may use 1-3 digits and is right-padded to milliseconds
    (`.1` = 100 ms, `.50` = 500 ms, `.132` = 132 ms). Surrounding whitespace
    is tolerated. Raises LapTimeParseError for anything unparseable.
    """
    match = _LAP_TIME_PATTERN.fullmatch(raw.strip())
    if match is None:
        raise LapTimeParseError(raw)
    minutes_str, seconds_str, bare_seconds_str, fraction_str = match.groups()
    minutes = int(minutes_str) if minutes_str is not None else 0
    seconds = int(seconds_str or bare_seconds_str or "0")
    fraction_ms = int(fraction_str.ljust(3, "0")) if fraction_str is not None else 0
    return (minutes * 60 + seconds) * 1000 + fraction_ms
