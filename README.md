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

### Manual import (verified)

Export a JSON from the bridge app, copy it to the machine, then:

```bash
curl -X POST http://<server-ip>:8000/api/ingest/health \
  -H "Content-Type: application/json" \
  --data-binary @health-export.json
```

The response is `{"status":"ok","ingested":<n>}`.

### Automated sync

If your bridge app supports exporting to a custom URL (a "sync to server" /
REST destination), point it at `http://<server-ip>:8000/api/ingest/health` so it
pushes on a schedule. The exact steps live in the app's own export settings.

### Signals ingested

Prioritized (shown on the dashboard): `resting_heart_rate`, `sleep`,
`active_energy`, `steps`, `vo2_max`.

Also stored (available via the API, surfaced later): SpO₂, basal energy,
distance, flights climbed, average/walking heart rate, breathing disturbances,
mindful daylight minutes, walking speed/asymmetry/step length, and per-session
sleep stage breakdowns (deep/REM/core/efficiency/awakenings).

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
