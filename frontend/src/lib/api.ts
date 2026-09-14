const DEFAULT_API_BASE_URL = "http://localhost:8000";

const apiBaseUrl: string =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;

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
