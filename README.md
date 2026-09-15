# gfgf — get fit, get fast

A self-hosted, single-user dashboard that connects the dots between your weight,
your go-kart lap times, and your Apple Watch health data — because losing weight
makes you faster on track.

> **Why the name:** the concrete motivation for the weight-loss grind is lap
> time. `gfgf` shows you the *correlation* between the two so the daily effort
> has visible payoff.

gfgf is LAN-only and single-user by design (no authentication). It runs as a
small Docker Compose stack of three containers: Postgres, a FastAPI backend, and
a Next.js frontend.

## What it tracks

| Area | How it works |
| --- | --- |
| **Weight** | Manual daily weigh-in (kg, optional body-fat % and note). One entry per day — re-entering the same date updates it. |
| **Lap times** | Log every lap per track as `m:ss.ms` (or `ss.ms`). Session best (per track + day) and lifetime personal best (per track) are derived automatically. |
| **Health signals** | Ingested from Apple Health via a bridge app on your iPhone — resting heart rate, sleep, active energy, steps, VO₂ max, and more. |
| **Habits** | A daily check-in ("did I exercise today?") with extensible boolean flags. |
| **Dashboard** | A sidebar-navigated dashboard with six panels: Insights, Log, Habits, Derived, Signals, and History. |

## Architecture

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` (Docker Hub) | internal only | named volume `gfgf-db-data` persists all data |
| `backend` | `ghcr.io/sconetto/gfgf-backend` | `:8000` | FastAPI (Python 3.12); REST API, schema auto-created on startup |
| `frontend` | `ghcr.io/sconetto/gfgf-frontend` | `:3000` | Next.js 16 (TypeScript) dashboard |
| `reverse-proxy` *(optional)* | `caddy:2-alpine` (Docker Hub) | `:80` | opt-in, see [Reverse proxy](#reverse-proxy-optional) |

The backend and frontend are published to **GitHub Container Registry (GHCR)**
and are **public**. You can deploy gfgf by pulling those images — no build step
and no source code required.

## Container images

| Image | Pull reference | Tags |
| --- | --- | --- |
| Backend | `ghcr.io/sconetto/gfgf-backend` | `latest`, `<major>.<minor>.<patch>`, `<major>.<minor>`, `<major>`, `sha-<short>` |
| Frontend | `ghcr.io/sconetto/gfgf-frontend` | same scheme |

`latest` tracks the most recent release. Pin to a specific `<major>.<minor>.<patch>`
tag if you want reproducible deploys.

To publish a new release: commit, then tag and push:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

The `release` GitHub Actions workflow builds both images and pushes them to GHCR.

## Deploying on ZimaOS

The full guide for running gfgf on a ZimaOS machine. This is a **pull-only**
deploy — ZimaOS downloads the prebuilt images and never compiles anything.

### Prerequisites

- A ZimaOS machine on your LAN.
- Shell/SSH access to it (or use ZimaOS's Docker/Compose UI).
- Nothing else — Node/Python are **not** required (the images are prebuilt).

### 1. Get the deployment files

You only need two files (plus one optional): `docker-compose.yml` and
`.env.example`. The easiest way is to clone the repo, which includes them:

```bash
git clone https://github.com/sconetto/gfgf.git
cd gfgf
```

> If you prefer not to clone, download just `docker-compose.yml` and
> `.env.example` from the repo — they are enough. The `build:` sections in the
> compose file are only used for local development and are ignored when pulling.

### 2. Configure the environment

```bash
cp .env.example .env
```

Every variable has a safe default. For a first deploy you typically need to
change **nothing**. The variables you may want to adjust:

| Variable | Default | When to change |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | `gfgf` | Set a real password if you want the DB hardened (then update `DATABASE_URL` to match) |
| `BACKEND_PORT` | `8000` | If `:8000` is already taken on the host |
| `FRONTEND_PORT` | `3000` | If `:3000` is already taken on the host |

> The backend URL is **auto-detected** at runtime from the browser's own hostname
> (same host, port 8000), so you do **not** need to set `NEXT_PUBLIC_API_BASE_URL`
> for normal LAN use. Set it only for a non-standard backend host/port.

### 3. Start the stack (pull only)

```bash
docker compose up -d --pull always
```

This pulls `ghcr.io/sconetto/gfgf-backend` and `ghcr.io/sconetto/gfgf-frontend`
and starts all three containers. No build happens.

### 4. Open the dashboard

```
http://<zimaos-lan-ip>:3000
```

from any device on the LAN (phone, tablet, desktop).

### 5. Verify it works

- The dashboard loads with a sidebar showing six panels (Insights, Log, Habits,
  Derived, Signals, History).
- The sidebar footer shows green chips: `backend: ok` and `database: ok`.
- Backend health endpoint returns ok:

  ```bash
  curl http://<zimaos-lan-ip>:8000/health
  # {"status":"ok","db":"ok"}
  ```

- Interactive API docs (for debugging): `http://<zimaos-lan-ip>:8000/docs`.

### Updating to a new release

```bash
docker compose pull
docker compose up -d
```

Data in the `gfgf-db-data` volume persists across updates.

## Local development (build from source)

If you want to build from source instead of pulling:

```bash
cp .env.example .env
docker compose up -d --build
```

- Dashboard: http://localhost:3000
- Backend health: http://localhost:8000/health

## Apple Health bridge

gfgf ingests Apple Health data through a bridge app on your iPhone. The endpoint
accepts the **Health Export Kit** JSON export format (schema v2) natively — no
pre-processing required.

**Endpoint:** `POST /api/ingest/health` on the backend (`:8000`).

Send the raw `health-export-json-*.json` file **verbatim**:

```bash
curl -X POST http://<zimaos-lan-ip>:8000/api/ingest/health \
  -H "Content-Type: application/json" \
  --data-binary @health-export-json-2026-01-01-0000_to_2026-09-14-1542.json
```

- **Response:** `{"status":"ok","ingested":<n>}` — or `400` with a `detail` message for malformed JSON.
- **Not idempotent:** each `POST` inserts new rows. Re-importing an overlapping
  export duplicates readings, so pair a cumulative export with wipe-then-ingest.

The endpoint also accepts a generic flat list of records as a fallback:

```json
[{"type": "steps", "value": 8000, "unit": "count", "measured_at": "2026-09-14T10:00:00Z"}]
```

### Automating the ingest

Health Export Kit has no automatic upload, so automate the import yourself. The
clean pattern is wipe-then-ingest:

```bash
#!/usr/bin/env bash
set -euo pipefail
latest="$(ls -t /path/to/exports/health-export-json-*.json | head -n1)"
docker compose exec -T db psql -U gfgf -d gfgf -c "DELETE FROM health_metrics;" >/dev/null
curl -fsS -X POST http://localhost:8000/api/ingest/health \
  -H "Content-Type: application/json" \
  --data-binary @"$latest"
```

Run it on a schedule with cron (or an iOS Shortcut hitting the same endpoint).

### Signals ingested

All 48 stored signals are surfaced on the dashboard, grouped by section
(Activity, Heart, Sleep, Body, Nutrition, Workouts, Mobility, Mind). Five are
pinned as Favorites tiles: `resting_heart_rate`, `sleep`, `active_energy`,
`steps`, `vo2_max`. Where a healthy range is known, charts draw a translucent
healthy band (or a dashed line when only one bound applies).

> Weight is *not* imported from Apple Health — it stays a manual entry in gfgf.

## Configuration reference

All settings live in `.env` (copy from `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` | `gfgf` | Postgres user |
| `POSTGRES_PASSWORD` | `gfgf` | Postgres password |
| `POSTGRES_DB` | `gfgf` | Postgres database name |
| `DATABASE_URL` | `postgresql+asyncpg://gfgf:gfgf@db:5432/gfgf` | Backend DSN (host `db` inside compose) |
| `BACKEND_PORT` | `8000` | Host port for the backend API |
| `FRONTEND_PORT` | `3000` | Host port for the frontend |
| `NEXT_PUBLIC_API_BASE_URL` | *(auto-detected)* | Optional override. Defaults to the browser's hostname on port 8000 |

If you change `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, update
`DATABASE_URL` to match — the backend only reads `DATABASE_URL`.

## Reverse proxy (optional)

A Caddy reverse proxy is included but disabled by default. Enable it to serve the
frontend on `:80` (plain HTTP) behind a single origin:

```bash
docker compose --profile proxy up -d
```

This mounts `reverse-proxy/Caddyfile`. TLS and Basic Auth can be layered here
later if the app is ever exposed beyond the LAN.

## Development

- **Frontend:** `cd frontend && npm install && npm run dev` (typecheck with
  `npm run typecheck`).
- **Backend:** `cd backend && uv sync && uv run uvicorn app.main:app --reload`
  (typecheck with `uv run basedpyright`, tests with `uv run pytest`).

## License

[GPL-3.0](LICENSE)
