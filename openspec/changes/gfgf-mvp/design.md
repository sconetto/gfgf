## Context

`gfgf` ("get fit, get fast") is a greenfield, single-user, self-hosted app to track a weight-loss journey whose motivating payoff is faster go-kart lap times. It runs on a ZimaOS home server via docker compose, is LAN-only (no auth), and is maintained long-term by a single owner. Health data flows in from an Apple Watch through a third-party iOS bridge app; weight and lap times are entered manually; the dashboard's centerpiece is the correlation between weight and lap time.

The repo is currently empty (OpenSpec scaffolding only). Everything in this design is being introduced for the first time.

## Goals / Non-Goals

**Goals:**

- A compose stack that runs reliably on ZimaOS with persistent data.
- Clean two-service separation: Next.js (TypeScript) frontend, FastAPI (Python) backend, Postgres database.
- Manual entry for weight and lap times that is fast and low-friction.
- Automated ingest of Apple Health data via a third-party bridge app (no iOS development).
- A dashboard that surfaces the weight↔lap-time correlation per track (the core motivation).
- A data model that makes the correlation honest (per-race-day aggregation, integer millisecond lap storage).

**Non-Goals:**

- Public internet exposure, TLS from a public CA, multi-user auth, or RBAC.
- Native iOS development (HealthKit is read by the third-party bridge app, not us).
- Importing/parsing Apple Health XML export files (superseded by the bridge app).
- Telemetry or automatic lap timing from a karting app.
- Body-composition analytics (body-fat % is captured optionally, not analyzed).
- Predictive insights and streak/gamification (deferred to later phases).

## Decisions

### D1 — Two-service architecture: Next.js frontend + FastAPI backend

- **Decision**: Separate `frontend` (Next.js/TypeScript) and `backend` (FastAPI/Python) containers, joined by a Postgres container.
- **Rationale**: The user explicitly wants a frontend + backend split; it keeps presentation and data logic cleanly separated, and lets each service scale/debug independently.
- **Alternatives considered**:
  - *Single Next.js fullstack* — simpler (one service), but mixes concerns and the user asked for a distinct backend.
  - *FastAPI serving a static React build* — one language for backend + bundled frontend, but loses Next.js's DX and the user's stated preference.

### D2 — Postgres as the datastore

- **Decision**: Postgres 16 with a named volume.
- **Rationale**: Relational, transactional, trivial to query for the correlation joins (`lap_times` ↔ `weight_entries`), and well-supported in compose.
- **Alternatives considered**:
  - *SQLite* — simplest (single file), but the user wants a distinct database service and Postgres gives cleaner time-series-style queries and headroom for future features.

### D3 — Lap times stored as integer milliseconds

- **Decision**: `time_ms integer` for lap times; format to `m:ss.ms` only in the UI.
- **Rationale**: Integer ms is trivially comparable, sortable, and chartable; avoids string parsing bugs.
- **Alternatives considered**: storing `m:ss.ms` strings or separate min/sec/ms columns — both force parsing/validation gymnastics with no benefit.

### D4 — "Every lap" model with derived aggregates

- **Decision**: Store individual lap rows (`track_name`, `time_ms`, `lap_date`, `kart_class?`, `note?`). Derive session best (MIN per track+day) and lifetime PB (MIN per track) at query time.
- **Rationale**: The user chose to log every lap they record. Storing raw laps is the most flexible and honest representation; bests are a projection, not a separate write path.
- **Alternatives considered**: storing only lifetime PBs — rejected because it starves the correlation (few data points per year).

### D5 — Correlation aggregated per race day, not per lap

- **Decision**: The weight↔lap-time view plots one point per (track, race day) using that day's best (or median) lap, joined to the nearest weight reading.
- **Rationale**: Many laps on the same day share the same weight; plotting raw laps produces vertical clusters that hide the trend. Aggregating per day yields a clean, honest signal.
- **Alternatives considered**: plotting every raw lap — visually misleading; and a single global correlation — rejected in favor of per-track (a PB at one track is meaningless at another).

### D6 — No authentication

- **Decision**: No auth layer; the app is LAN-only and single-user.
- **Rationale**: Removes a whole class of complexity (sessions, passwords, middleware) for zero practical risk on a private home network.
- **Alternatives considered**: single-password HTTP Basic Auth via reverse proxy — kept as an easy future addition on the Caddy layer if exposure changes.

### D7 — Health ingest via generic JSON endpoint

- **Decision**: A single tolerant `POST /api/ingest/health` endpoint accepts a JSON payload of metric records (`metric_type`, `value`, `unit`, `measured_at`) and lands them in `health_metrics`.
- **Rationale**: The third-party bridge app (e.g., Health Auto Export) pushes HealthKit data as JSON to a configurable URL. A generic, tolerant schema decouples us from any one app's exact payload.
- **Alternatives considered**: parsing Apple Health XML exports — rejected (manual, superseded by bridge); a per-app bespoke parser — rejected (over-fits one vendor).

### D8 — docker compose layout

- **Decision**: Services `reverse-proxy` (Caddy, optional), `frontend` (Next.js), `backend` (FastAPI), `db` (Postgres), with the backend exposed internally and the frontend proxying `/api` to it.
- **Rationale**: Matches the user's ZimaOS hosting and keeps the health-ingest endpoint reachable from the phone on the LAN.

## Risks / Trade-offs

- **[Third-party bridge app dependency] → Mitigation**: The exact app and its payload shape are unknown until implementation. We keep `POST /api/ingest/health` generic and tolerant (accept multiple field-name variants), and verify against a real export during Phase 2.
- **[No auth on LAN] → Mitigation**: Acceptable for now; document the Caddy Basic-Auth upgrade path if the network ever becomes shared or exposed.
- **[Sparse correlation data] → Mitigation**: Logging every lap (D4) plus per-day aggregation (D5) maximizes density; if a track has too few race days, the dashboard gracefully shows "insufficient data" rather than a misleading trend.
- **[Weight-reading timing] → Mitigation**: Lap and weight are joined by nearest date; a documented note explains that same-day or nearest-day weight is used, and the dashboard labels the pairing.
- **[Two languages to maintain] → Mitigation**: The owner chose this deliberately and maintains it long-term; the separation is clean (no shared code), so each side is independently debuggable.

## Migration Plan

- Greenfield: no migration from prior state.
- Deploy: `docker compose up -d` on ZimaOS; Postgres schema is created via the backend's startup migration.
- Rollback: `docker compose down`; data persists in the named volume and is unaffected by re-deploys.

## Open Questions

- **Which exact bridge app**, and its exact POST payload schema (resolve during Phase 2 with a real export).
- **Which Apple Health signals to prioritize** in the UI — default: weight, resting heart rate, sleep, active energy, VO2 max, steps.
- **Whether weigh-ins include body-fat %** — the field is optional in the model; UX decision pending.
- **Reverse proxy**: whether to run Caddy for a hostname/HTTPS now, or plain `http://<server-ip>:3000` first.
