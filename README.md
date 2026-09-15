# gfgf — get fit, get fast

A self-hosted, single-user dashboard that connects the dots between your weight,
your go-kart lap times, and your Apple Watch health data — because losing weight
makes you faster on track.

> **Why the name:** the concrete motivation for the weight-loss grind is lap
> time. `gfgf` shows you the *correlation* between the two so the daily effort
> has visible payoff.

## What it tracks

| Area | How it works |
| --- | --- |
| **Weight** | Manual daily weigh-in (kg, optional body-fat % and note). One entry per day — re-entering the same date updates it. |
| **Lap times** | Log every lap per track as `m:ss.ms` (or `ss.ms`). Session best (per track + day) and lifetime personal best (per track) are derived automatically. |
| **Health signals** | Ingested from Apple Health via a bridge app on your iPhone — resting heart rate, sleep, active energy, steps, VO₂ max, and more. |
| **Habits** | A daily check-in ("did I exercise today?") with extensible boolean flags. |
| **Dashboard** | Weight trend, a weight ↔ lap-time correlation per track, a personal-best board, and health-signal charts — all in an Apple Health–style Summary view. |

## Architecture

A docker compose stack, LAN-only and single-user (no authentication by design):

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `db` | `postgres:16-alpine` | internal only | named volume (`gfgf-db-data`) persists data |
| `backend` | FastAPI (Python 3.12) | `:8000` | REST API; schema is auto-created on startup |
| `frontend` | Next.js 16 (TypeScript) | `:3000` | the dashboard |
| `reverse-proxy` *(optional)* | `caddy:2-alpine` | `:80` | opt-in, see [Reverse proxy](#reverse-proxy-optional) |

## Quick start (local)

```bash
cp .env.example .env
docker compose up -d --build
```

- Dashboard: http://localhost:3000
- Backend health: http://localhost:8000/health

## Deploying on ZimaOS

1. **Get the code onto the ZimaOS box** — either `git clone <your-repo-url>` over
   SSH, or upload the folder through the ZimaOS Files app. ZimaOS can also run
   this compose file directly from its Docker/Compose UI if you prefer.

2. **Configure the environment:**

   ```bash
   cd gfgf
   cp .env.example .env
   ```

   Edit `.env` and set the browser-facing API URL to the machine's LAN address
   (this is required for the dashboard to reach the backend from another device):

   ```dotenv
   NEXT_PUBLIC_API_BASE_URL=http://<zimaos-lan-ip>:8000
   ```

3. **Start the stack:**

   ```bash
   docker compose up -d --build
   ```

4. **Open** `http://<zimaos-lan-ip>:3000` from any device on the LAN.

> **Note:** `NEXT_PUBLIC_API_BASE_URL` is inlined into the frontend bundle at
> build time. If you change it later, rebuild the frontend:
> `docker compose up -d --build frontend`.

## Apple Health bridge

gfgf ingests Apple Health data through a bridge app on your iPhone. The endpoint
accepts the **Health Export Kit** JSON export format (schema v2) natively — no
pre-processing required.

**Endpoint:** `POST /api/ingest/health` on the backend (`:8000`).

### Ingesting the export

The app produces a JSON export file; gfgf ingests it with one `POST`. Send the
raw `health-export-json-*.json` file **verbatim** — the endpoint parses Health
Export Kit's schema (v2) natively, no pre-processing.

- **Method / endpoint:** `POST http://<server-ip>:8000/api/ingest/health`
- **`Content-Type`:** `application/json`
- **Body:** the export file as-is (top-level `activity` / `additional` / `sleep` / `meta`)
- **Response:** `{"status":"ok","ingested":<n>}` — or `400` with a `detail` message for malformed JSON

```bash
curl -X POST http://<server-ip>:8000/api/ingest/health \
  -H "Content-Type: application/json" \
  --data-binary @health-export-json-2026-01-01-0000_to_2026-09-14-1542.json
```

The endpoint also accepts a generic flat list of records as a fallback:

```json
[{"type": "steps", "value": 8000, "unit": "count", "measured_at": "2026-09-14T10:00:00Z"}]
```

> **Not idempotent:** each `POST` inserts new rows. Re-importing the same (or an
> overlapping) export duplicates readings, so a cumulative export is best paired
> with a wipe-then-ingest (see below).

### Automating it

Health Export Kit has no automatic upload, so automate the import yourself. Since
the app exports a *cumulative* range, the clean pattern is wipe-then-ingest:

```bash
#!/usr/bin/env bash
# ingest the latest cumulative Health Export Kit export without duplicating
set -euo pipefail
latest="$(ls -t /path/to/exports/health-export-json-*.json | head -n1)"
docker compose exec -T db psql -U gfgf -d gfgf -c "DELETE FROM health_metrics;" >/dev/null
curl -fsS -X POST http://localhost:8000/api/ingest/health \
  -H "Content-Type: application/json" \
  --data-binary @"$latest"
```

Run it on a schedule with cron (or a launchd job, or an iOS Shortcut that hits
the same endpoint):

```cron
0 4 * * * /usr/local/bin/gfgf-ingest >> /var/log/gfgf-ingest.log 2>&1
```

### Signals ingested

All 48 stored signals are surfaced on the dashboard, grouped by section
(Activity, Heart, Sleep, Body, Nutrition, Workouts, Mobility, Mind). Five are
additionally pinned as Favorites tiles: `resting_heart_rate`, `sleep`,
`active_energy`, `steps`, `vo2_max`. Where a healthy range is known — e.g.
steps ≥ 7,500; resting heart rate 60–100 bpm — the charts draw a translucent
healthy band (or a dashed line when only one bound applies).

> Weight is *not* imported from Apple Health — it stays a manual entry in gfgf,
> which also keeps the weight↔lap correlation fully under your control.

## Configuration

All settings live in `.env` (copy from `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_USER` | `gfgf` | Postgres user |
| `POSTGRES_PASSWORD` | `gfgf` | Postgres password |
| `POSTGRES_DB` | `gfgf` | Postgres database name |
| `DATABASE_URL` | `postgresql+asyncpg://gfgf:gfgf@db:5432/gfgf` | Backend DSN (host `db` inside compose) |
| `BACKEND_PORT` | `8000` | Host port for the backend |
| `FRONTEND_PORT` | `3000` | Host port for the frontend |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Browser-facing backend URL (set to the LAN IP for remote access) |

If you change `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`, update
`DATABASE_URL` to match — the backend only reads `DATABASE_URL`.

## Reverse proxy (optional)

A Caddy reverse proxy is included but disabled by default. Enable it with:

```bash
docker compose --profile proxy up -d
```

This serves the frontend on `:80` (plain HTTP) with the `reverse-proxy/Caddyfile`.
TLS and Basic Auth can be layered here later if the app is ever exposed beyond
the LAN.

## Development

- **Frontend:** `cd frontend && npm install && npm run dev` (typecheck with
  `npm run typecheck`).
- **Backend:** `cd backend && uv sync && uv run uvicorn app.main:app --reload`
  (typecheck with `uv run basedpyright`, tests with `uv run pytest`).

The backend API is documented interactively at http://localhost:8000/docs.

## License

[GPL-3.0](LICENSE)
