function resolveApiBaseUrl(): string {
  // Prefer an explicit override; otherwise derive the backend from the
  // browser's own hostname so a single published image works on any LAN host
  // (backend and frontend share a host, backend on the default port 8000).
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (configured && configured.length > 0) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

const apiBaseUrl: string = resolveApiBaseUrl();

export interface HealthStatus {
  readonly status: "ok";
  readonly db: "ok";
}

function isHealthStatus(value: unknown): value is HealthStatus {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (!("status" in value) || !("db" in value)) {
    return false;
  }
  return value.status === "ok" && value.db === "ok";
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  const response = await fetch(`${apiBaseUrl}/health`, {
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(`Backend health check failed: HTTP ${response.status}`);
  }
  const payload: unknown = await response.json();
  if (!isHealthStatus(payload)) {
    throw new Error("Backend health response had an unexpected shape");
  }
  return payload;
}

// --- shared request/response plumbing for the feature APIs ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_PATTERN.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isArrayOf<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): value is readonly T[] {
  return Array.isArray(value) && value.every((item: unknown) => guard(item));
}

async function rejectionMessage(response: Response): Promise<string> {
  let detail = "";
  try {
    const payload: unknown = await response.json();
    if (isRecord(payload)) {
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      } else if (Array.isArray(payload.detail)) {
        const first: unknown = payload.detail[0];
        if (isRecord(first) && typeof first.msg === "string") {
          detail = first.msg;
        }
      }
    }
  } catch {
    // Non-JSON error body — the status code alone is enough.
  }
  return detail === ""
    ? `HTTP ${response.status}`
    : `HTTP ${response.status}: ${detail}`;
}

async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${await rejectionMessage(response)}`);
  }
  return response.json();
}

async function postJson(
  path: string,
  body: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${await rejectionMessage(response)}`);
  }
  return response.json();
}

async function putJson(
  path: string,
  body: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(`PUT ${path} failed: ${await rejectionMessage(response)}`);
  }
  return response.json();
}

async function deleteAndExpectNoContent(
  path: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
    signal: signal ?? null,
  });
  if (!response.ok) {
    throw new Error(
      `DELETE ${path} failed: ${await rejectionMessage(response)}`,
    );
  }
}

// --- weights ---

export interface WeightRead {
  readonly id: number;
  readonly recorded_on: string;
  readonly weight_kg: number;
  readonly body_fat_pct: number | null;
  readonly note: string | null;
}

function isWeightRead(value: unknown): value is WeightRead {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isIsoDateString(value.recorded_on) &&
    typeof value.weight_kg === "number" &&
    (value.body_fat_pct === null || typeof value.body_fat_pct === "number") &&
    (value.note === null || typeof value.note === "string")
  );
}

export interface WeightCreatePayload {
  readonly recorded_on: string;
  readonly weight_kg: number;
  readonly body_fat_pct?: number | undefined;
  readonly note?: string | undefined;
}

export async function createWeight(
  payload: WeightCreatePayload,
  signal?: AbortSignal,
): Promise<WeightRead> {
  const result: unknown = await postJson(
    "/api/weights",
    JSON.stringify(payload),
    signal,
  );
  if (!isWeightRead(result)) {
    throw new Error("Weight response had an unexpected shape");
  }
  return result;
}

export async function fetchWeights(
  signal?: AbortSignal,
): Promise<readonly WeightRead[]> {
  const result: unknown = await getJson("/api/weights", signal);
  if (!isArrayOf(result, isWeightRead)) {
    throw new Error("Weight history response had an unexpected shape");
  }
  return result;
}

export async function deleteWeight(
  id: number,
  signal?: AbortSignal,
): Promise<void> {
  await deleteAndExpectNoContent(`/api/weights/${id}`, signal);
}

// --- laps ---

export interface LapRead {
  readonly id: number;
  readonly track_name: string;
  readonly time_ms: number;
  readonly lap_date: string;
  readonly kart_class: string | null;
  readonly note: string | null;
}

function isLapRead(value: unknown): value is LapRead {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.track_name === "string" &&
    typeof value.time_ms === "number" &&
    isIsoDateString(value.lap_date) &&
    (value.kart_class === null || typeof value.kart_class === "string") &&
    (value.note === null || typeof value.note === "string")
  );
}

export interface LapCreatePayload {
  readonly track_name: string;
  readonly lap_time: string;
  readonly lap_date: string;
  readonly kart_class?: string | undefined;
  readonly note?: string | undefined;
}

export async function createLap(
  payload: LapCreatePayload,
  signal?: AbortSignal,
): Promise<LapRead> {
  const result: unknown = await postJson(
    "/api/laps",
    JSON.stringify(payload),
    signal,
  );
  if (!isLapRead(result)) {
    throw new Error("Lap response had an unexpected shape");
  }
  return result;
}

export async function fetchLaps(
  track: string,
  signal?: AbortSignal,
): Promise<readonly LapRead[]> {
  const result: unknown = await getJson(
    `/api/laps?track=${encodeURIComponent(track)}`,
    signal,
  );
  if (!isArrayOf(result, isLapRead)) {
    throw new Error("Lap list response had an unexpected shape");
  }
  return result;
}

export interface PersonalBest {
  readonly track_name: string;
  readonly best_time_ms: number;
}

function isPersonalBest(value: unknown): value is PersonalBest {
  return (
    isRecord(value) &&
    typeof value.track_name === "string" &&
    typeof value.best_time_ms === "number"
  );
}

export async function fetchPersonalBests(
  signal?: AbortSignal,
): Promise<readonly PersonalBest[]> {
  const result: unknown = await getJson("/api/laps/personal-bests", signal);
  if (!isArrayOf(result, isPersonalBest)) {
    throw new Error("Personal-bests response had an unexpected shape");
  }
  return result;
}

export interface SessionBest {
  readonly track_name: string;
  readonly lap_date: string;
  readonly best_time_ms: number;
}

function isSessionBest(value: unknown): value is SessionBest {
  return (
    isRecord(value) &&
    typeof value.track_name === "string" &&
    isIsoDateString(value.lap_date) &&
    typeof value.best_time_ms === "number"
  );
}

export async function fetchSessionBests(
  signal?: AbortSignal,
): Promise<readonly SessionBest[]> {
  const result: unknown = await getJson("/api/laps/session-bests", signal);
  if (!isArrayOf(result, isSessionBest)) {
    throw new Error("Session-bests response had an unexpected shape");
  }
  return result;
}

// --- habits ---

export interface HabitLogRead {
  readonly id: number;
  readonly log_date: string;
  readonly exercised: boolean;
  readonly flags: Readonly<Record<string, boolean>>;
  readonly note: string | null;
}

function isHabitLogRead(value: unknown): value is HabitLogRead {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    isIsoDateString(value.log_date) &&
    typeof value.exercised === "boolean" &&
    isRecord(value.flags) &&
    Object.values(value.flags).every(
      (flag: unknown) => typeof flag === "boolean",
    ) &&
    (value.note === null || typeof value.note === "string")
  );
}

export interface HabitLogCreatePayload {
  readonly log_date: string;
  readonly exercised: boolean;
  readonly flags?: Readonly<Record<string, boolean>> | undefined;
  readonly note?: string | undefined;
}

export async function createHabitLog(
  payload: HabitLogCreatePayload,
  signal?: AbortSignal,
): Promise<HabitLogRead> {
  const result: unknown = await postJson(
    "/api/habits",
    JSON.stringify(payload),
    signal,
  );
  if (!isHabitLogRead(result)) {
    throw new Error("Habit-log response had an unexpected shape");
  }
  return result;
}

export async function fetchHabitLogs(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<readonly HabitLogRead[]> {
  const path = `/api/habits?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const result: unknown = await getJson(path, signal);
  if (!isArrayOf(result, isHabitLogRead)) {
    throw new Error("Habit-log response had an unexpected shape");
  }
  return result;
}

// --- health metrics ---

export interface MetricRead {
  readonly id: number;
  readonly metric_type: string;
  readonly value: number;
  readonly unit: string | null;
  readonly measured_at: string;
  readonly source: string | null;
}

function isMetricRead(value: unknown): value is MetricRead {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.metric_type === "string" &&
    typeof value.value === "number" &&
    (value.unit === null || typeof value.unit === "string") &&
    isIsoTimestamp(value.measured_at) &&
    (value.source === null || typeof value.source === "string")
  );
}

export async function fetchMetrics(
  metricType: string,
  signal?: AbortSignal,
): Promise<readonly MetricRead[]> {
  const result: unknown = await getJson(
    `/api/metrics?type=${encodeURIComponent(metricType)}`,
    signal,
  );
  if (!isArrayOf(result, isMetricRead)) {
    throw new Error("Metrics response had an unexpected shape");
  }
  return result;
}

// --- profile ---

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

export interface ProfileRead {
  readonly id: number;
  readonly age_years: number;
  readonly sex: Sex;
  readonly height_cm: number;
  readonly activity_level: ActivityLevel;
}

export interface ProfileCreatePayload {
  readonly age_years: number;
  readonly sex: Sex;
  readonly height_cm: number;
  readonly activity_level: ActivityLevel;
}

const SEX_VALUES: readonly string[] = ["male", "female"];
const ACTIVITY_VALUES: readonly string[] = [
  "sedentary",
  "light",
  "moderate",
  "very_active",
];

function isProfileRead(value: unknown): value is ProfileRead {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.age_years === "number" &&
    typeof value.sex === "string" &&
    SEX_VALUES.includes(value.sex) &&
    typeof value.height_cm === "number" &&
    typeof value.activity_level === "string" &&
    ACTIVITY_VALUES.includes(value.activity_level)
  );
}

export async function fetchProfile(
  signal?: AbortSignal,
): Promise<ProfileRead | null> {
  const result: unknown = await getJson("/api/profile", signal);
  if (result === null) {
    return null;
  }
  if (!isProfileRead(result)) {
    throw new Error("Profile response had an unexpected shape");
  }
  return result;
}

export async function saveProfile(
  payload: ProfileCreatePayload,
  signal?: AbortSignal,
): Promise<ProfileRead> {
  const result: unknown = await putJson(
    "/api/profile",
    JSON.stringify(payload),
    signal,
  );
  if (!isProfileRead(result)) {
    throw new Error("Profile response had an unexpected shape");
  }
  return result;
}
