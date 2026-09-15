/** Lap-time parsing/formatting, mirroring `backend/app/laptime.py` exactly. */

const LAP_TIME_PATTERN = /^(?:(\d+):([0-5]?\d)|(\d{1,3}))(?:\.(\d{1,3}))?$/;

export type LapTimeParseResult =
  | { readonly ok: true; readonly ms: number }
  | { readonly ok: false; readonly message: string };

/**
 * Parse a lap-time string (`m:ss.ms` or `ss.ms`) into integer milliseconds.
 * The fraction may use 1-3 digits and is right-padded to milliseconds
 * (`.1` = 100 ms, `.50` = 500 ms, `.132` = 132 ms). Surrounding whitespace
 * is tolerated. Mirrors the backend regex and padding rules.
 */
export function parseLapTime(raw: string): LapTimeParseResult {
  const match = LAP_TIME_PATTERN.exec(raw.trim());
  if (match === null) {
    return {
      ok: false,
      message: "must be m:ss.ms or ss.ms — e.g. 1:03.500 or 40.132",
    };
  }
  const [, minutesRaw, secondsWithColonRaw, secondsBareRaw, fractionRaw] = match;
  const minutes = minutesRaw === undefined ? 0 : Number(minutesRaw);
  const seconds = Number(secondsWithColonRaw ?? secondsBareRaw ?? "0");
  const fractionMs =
    fractionRaw === undefined ? 0 : Number(fractionRaw.padEnd(3, "0"));
  return { ok: true, ms: (minutes * 60 + seconds) * 1000 + fractionMs };
}

/** Format integer milliseconds as `m:ss.ms` (or `ss.ms` under a minute). */
export function formatLapTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const fraction = ms % 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const fractionText = String(fraction).padStart(3, "0");
  if (minutes > 0) {
    return `${minutes}:${String(seconds).padStart(2, "0")}.${fractionText}`;
  }
  return `${seconds}.${fractionText}`;
}
