# Darukaa.Earth — Geospatial Carbon & Biodiversity Dashboard

A full-stack platform for managing carbon and biodiversity restoration projects:
create projects, draw site boundaries on a map, and view time-series analytics
per site.

## 1. Architecture

```
┌─────────────┐        JWT / REST        ┌──────────────────┐        ┌──────────────────────┐
│   React SPA  │ ───────────────────────▶ │   FastAPI backend │ ─────▶ │ PostgreSQL + PostGIS  │
│ (Vite, Mapbox│ ◀─────────────────────── │  (Python, JWT auth│ ◀───── │ (geospatial storage)  │
│  GL, Chart.js)│        GeoJSON/JSON      │   SQLAlchemy ORM) │        └──────────────────────┘
└─────────────┘                          └──────────────────┘
```

- **Frontend (React + Vite)**: admin dashboard. Mapbox GL JS renders project
  sites as polygons and provides a draw tool (`@mapbox/mapbox-gl-draw`) to add
  new sites. Chart.js renders per-site carbon/biodiversity trends.
- **Backend (FastAPI)**: stateless REST API, JWT bearer auth, SQLAlchemy ORM,
  GeoAlchemy2 for PostGIS geometry columns. FastAPI was chosen over
  Flask/Django for speed of iteration and free interactive API docs at `/docs`,
  which doubles as a live spec for the frontend team.
- **Database (PostgreSQL + PostGIS)**: relational data (users, projects) plus
  native `POLYGON` geometry for sites, enabling future geospatial queries
  (area, overlap, containment) directly in SQL.

## 2. Database Schema

| Table          | Key columns                                                                 |
|-----------------|------------------------------------------------------------------------------|
| `users`         | `id` (UUID), `email` (unique), `hashed_password`, `full_name`               |
| `projects`      | `id`, `name`, `description`, `project_type`, `owner_id → users.id`         |
| `sites`         | `id`, `project_id → projects.id`, `name`, `geom` (PostGIS `POLYGON`, SRID 4326), `area_hectares` |
| `site_metrics`  | `id`, `site_id → sites.id`, `date`, `carbon_tons`, `biodiversity_index`      |

`site_metrics` is a simple time-series table (one row per site per month) —
kept deliberately narrow so it can later be swapped for a proper time-series
store (e.g. TimescaleDB) without touching the rest of the schema.

## 3. Local Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- A free [Mapbox](https://account.mapbox.com/) access token

### Backend + Database
```bash
docker compose up --build          # starts Postgres+PostGIS and the API on :8000
docker compose exec backend python -m app.seed   # loads demo user + mock data
```
Demo login: `demo@darukaa.earth` / `demo1234`
API docs: http://localhost:8000/docs

### Frontend
```bash
cd frontend
cp .env.example .env      # add your Mapbox token
npm install
npm run dev                # http://localhost:5173
```

### Git hooks (run once, from repo root)
```bash
npm install                # installs husky + lint-staged at the repo root
npm run prepare
```
From then on, every `git commit` auto-runs Prettier + ESLint on staged
frontend files and Black + Flake8 on staged backend files, blocking the
commit on failure.

## 4. CI/CD Pipeline

`.github/workflows/ci.yml` runs on every push and PR:
- **Backend job**: installs deps, runs `black --check`, `flake8`, `pytest`.
- **Frontend job**: installs deps, runs ESLint, then `vite build` (using
  `VITE_API_BASE_URL` / `VITE_MAPBOX_TOKEN` from repo secrets) to catch build
  breakage before merge.

**Deployment** is handled by connecting the repo directly to the hosting
platform rather than scripting deploys inside Actions, since both platforms
already redeploy automatically on every push to `main`:
- **Backend + DB → Render.com**: a Web Service built from `backend/Dockerfile`,
  plus a managed Postgres instance with the PostGIS extension enabled.
- **Frontend → Vercel**: root directory `frontend/`, build command
  `npm run build`, output `dist/`, with `VITE_API_BASE_URL` pointed at the
  deployed Render backend URL.

This keeps CI (correctness gate) and CD (hosting-native auto-deploy) cleanly
separated, and avoids storing cloud deploy tokens in the repo.

## 5. Key Trade-offs

- **FastAPI over Django/Flask**: faster to scaffold correctly under time
  pressure, and auto-generated OpenAPI docs reduce the need for separate API
  documentation.
- **Mock/seeded time-series data**: no real remote-sensing pipeline exists for
  this exercise, so `app/seed.py` generates 12 months of plausible
  carbon/biodiversity figures per site. This isolates the analytics UI from a
  data-ingestion concern that's out of scope for the assessment window.
- **GeoJSON in/out, PostGIS storage**: the frontend map library speaks GeoJSON
  natively; converting to/from WKT at the API boundary (via `shapely` +
  `geoalchemy2`) keeps the database in a format that supports real geospatial
  queries later (e.g. `ST_Area`, `ST_Intersects`) without an ORM rewrite.
- **JWT in `localStorage`**: simplest for a stateless demo API with a
  standalone SPA; a production version would consider httpOnly cookies to
  reduce XSS exposure.
- **No pagination/rate-limiting**: dataset size is small for a hackathon
  demo; noted here as a known gap rather than silently ignored.

## 6. What's Not Yet Done

- Site editing/deletion from the UI (backend supports it via a follow-up
  route; only create+list are wired into the frontend given the time box).
- Automated frontend tests (structure supports adding Vitest/RTL later).
- Role-based access beyond a single "owner" per project.
