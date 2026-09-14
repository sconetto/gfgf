## 1. Project scaffolding & compose

- [x] 1.1 Initialize repo structure with `frontend/`, `backend/`, and root `docker-compose.yml`
- [x] 1.2 Author `docker-compose.yml` with services: `db` (Postgres 16), `backend` (FastAPI), `frontend` (Next.js), and optional `reverse-proxy` (Caddy)
- [x] 1.3 Configure Postgres named volume and healthcheck; wire service dependencies
- [x] 1.4 Add `.env` handling for the database connection string and ports

## 2. Backend foundation (FastAPI)

- [x] 2.1 Scaffold FastAPI app with a config module and a health endpoint
- [x] 2.2 Wire Postgres connectivity and a startup migration runner
- [x] 2.3 Define schema for `weight_entries`, `lap_times`, `health_metrics`, and `daily_logs`

## 3. Weight tracking API

- [x] 3.1 Implement create/upsert weight entry (one per date) with weight > 0 validation
- [x] 3.2 Implement list weight history ordered by date
- [x] 3.3 Implement delete weight entry by id

## 4. Lap tracking API

- [x] 4.1 Implement lap-time parser (`m:ss.ms` / `ss.ms` → integer milliseconds) with validation
- [x] 4.2 Implement create/list lap entries (per track)
- [x] 4.3 Implement derived session-best (per track+day) and lifetime-PB (per track) endpoints

## 5. Health ingest API

- [x] 5.1 Implement tolerant `POST /api/ingest/health` accepting generic JSON metric records
- [x] 5.2 Store metrics generically (type, value, unit, measured_at)
- [x] 5.3 Implement retrieve metrics by type ordered by time

## 6. Habit tracking API

- [x] 6.1 Implement daily-log upsert with `exercised` flag and extensible flags
- [x] 6.2 Implement retrieve daily logs for a date range

## 7. Frontend (Next.js / TypeScript)

- [x] 7.1 Scaffold Next.js app with Tailwind and a typed API client
- [x] 7.2 Build the weigh-in entry form
- [x] 7.3 Build the lap-time entry form (`m:ss.ms` input, per track)
- [x] 7.4 Build the daily habit check-in UI

## 8. Dashboard

- [x] 8.1 Render the weight trend chart with latest weight highlighted
- [x] 8.2 Render the weight-vs-lap-time correlation per track (per-race-day aggregation)
- [x] 8.3 Render the per-track lifetime personal-best board
- [x] 8.4 Render health-signal charts for prioritized metric types
- [x] 8.5 Implement "insufficient data" states for correlation and health views

## 9. Apple Health integration (Phase 2)

- [x] 9.1 Select the bridge app and capture a real export payload
- [ ] 9.2 Configure the bridge app to POST to `POST /api/ingest/health` on the LAN
- [ ] 9.3 Verify prioritized signals (weight, resting heart rate, sleep, active energy, VO2 max, steps) flow through

## 10. Polish & deploy

- [x] 10.1 Apply responsive visual polish to the dashboard (Apple Health style)
- [x] 10.2 Document plain IP access (no reverse proxy; Caddy stays optional for future hostname/HTTPS)
- [x] 10.3 Write README with ZimaOS deploy and Apple Health bridge setup notes
