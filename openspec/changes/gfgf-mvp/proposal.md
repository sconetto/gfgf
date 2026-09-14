## Why

I want a healthier lifestyle, and for me the concrete motivation is go-karting: losing weight makes me faster on track. I need a single self-hosted place that tracks my weight, my health signals from Apple Watch, and my lap times — and, most importantly, shows me the *correlation* between them so the daily grind has visible payoff. No existing app does the weight↔lap-time connection, so I'm building it for myself.

## What Changes

- A self-hosted web app (frontend + backend + database) run via docker compose on my ZimaOS home server, LAN-only, single-user, no authentication.
- **Weight tracking** — manual daily weigh-in entries (weight in kg, optional body-fat % and note).
- **Lap tracking** — manual per-track lap time entries (minutes, seconds, milliseconds + date + optional kart class), logged as individual laps; session best and lifetime personal-best are derived per track.
- **Health ingest** — a backend endpoint that accepts health data POSTed from a third-party iOS bridge app (reads Apple Health/HealthKit from my Apple Watch and pushes JSON), landing in a generic health-metrics store.
- **Habit tracking** — a daily log capturing "did I exercise today" plus extensible boolean habit flags.
- **Dashboard** — weight trend, weight-vs-lap-time correlation (aggregated per race day, per track), and a per-track lifetime PB board.

## Capabilities

### New Capabilities

- `weight-tracking`: Manual daily weigh-in entry and storage, with weight trend history.
- `lap-tracking`: Per-track lap time entry (individual laps), with derived session-best and lifetime personal-best per track.
- `health-ingest`: JSON ingest endpoint for third-party Apple Health bridge app, plus generic health-metric storage and retrieval.
- `habit-tracking`: Daily habit log (exercise days and extensible boolean flags).
- `dashboard`: The aggregated views — weight trend, weight↔lap-time correlation per track, and per-track lifetime PB board.

### Modified Capabilities

<!-- None — this is a greenfield project with no existing specs. -->

## Impact

- **New repository** — this change bootstraps the entire `gfgf` codebase (currently empty).
- **Services** — a docker compose stack: `frontend` (Next.js/TypeScript), `backend` (FastAPI/Python), `db` (Postgres 16), and an optional `reverse-proxy` (Caddy) for a clean hostname/HTTPS.
- **Database** — new Postgres schema: `weight_entries`, `lap_times`, `health_metrics`, `daily_logs`.
- **External dependency** — a third-party iOS bridge app (e.g., Health Auto Export) configured to POST to `POST /api/ingest/health`; exact app and payload schema to be finalized during implementation.
- **No public exposure** — LAN-only; no auth, no multi-tenancy.
