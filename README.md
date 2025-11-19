<div align="center">

# GAIA Platform – Planetary Biodiversity Intelligence

An ambitious reference implementation for **"Planetary‑Scale Biodiversity Monitoring & Ecosystem Collapse Prediction"**. GAIA combines geospatial data workflows, species‑level image understanding, and interactive analytics into a single, end‑to‑end platform that can be extended toward satellite, drone, acoustic, and eDNA streams.

</div>

---

## 1. Overview

This project is designed as a **hackathon‑ready solution blueprint** for the Ecological Systems challenge:

> *"Build a system ingesting data from satellites, drones, camera traps, acoustic sensors, eDNA samplers, citizen scientists, and scientific literature to create a living model of Earth's biodiversity. Detect species automatically, track populations, predict ecosystem collapse, and recommend interventions."*

GAIA implements a focused but realistic **vertical slice** of that vision around butterflies and moths, showing how you would:

- Cluster large image collections into **species‑level groups** as the basis for population tracking.
- Classify new observations using **state‑of‑the‑art vision models (Google Gemini)** with rich, human‑readable explanations.
- Persist new samples and corrections into an append‑only dataset and immediately surface them in a **Species Discovery** UI for experts.

The same architecture can be scaled up to multiple sensor modalities (satellite tiles, drone RGB, acoustic spectrograms, eDNA barcodes) and other taxa.

The repository is organized as:

- `backend/` – FastAPI app, ML services, Celery worker definitions.
- `frontend/` – Next.js (App Router) web UI.
- `data/` – pre‑packaged butterfly dataset and model weights.

Everything runs locally via Docker, so you can reproduce the full experience with minimal setup.

---

## 2. Architecture

### 2.1 Services

- **Frontend (Next.js)**
  - TypeScript + React + TailwindCSS.
  - Communicates with backend via REST (`NEXT_PUBLIC_API_URL`) and WebSocket (`NEXT_PUBLIC_WS_URL`).

- **Backend (FastAPI)**
  - Main app in `backend/main.py`.
  - Key routers under `backend/api/`:
    - `species_routes.py` – scan dataset, build clusters, Species Discovery API.
    - `gemini_routes.py` – Gemini classification and classify‑upsert logic.
    - `butterfly_routes.py` – EfficientNet‑based local classifier.
    - additional routers for alerts, edge, twins, maps, etc.

- **Data & Models**
  - Base dataset (read‑only): `data/butterflies/train` – ~100 species, hundreds of images each.
  - Upserts (user uploads): `data/temp_extract/train` – new or incremented species.
  - Keras EfficientNet model: `data/butterflies/efficientnetb0_butterfly_model.h5`.

- **Infrastructure (Docker)**
  - Defined in `docker-compose.yml`:
    - `postgres` – main relational DB.
    - `redis` – cache + Celery broker.
    - `backend` – FastAPI app + models.
    - `frontend` – Next.js app.

Static files inside the backend container:

- Base dataset served at: `/static/<SPECIES>/<IMAGE>.jpg`
- Upserted images served at: `/uploads/<SPECIES>/<IMAGE>.jpg`

---

## 3. Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux).
- Docker Compose v2 (bundled with recent Docker Desktop).
- A **Google Gemini API key** with access to an image‑capable model.

Optional (for development without Docker):

- Python 3.10
- Node.js 18+

---

## 4. Configuration

### 4.1 Backend environment

Create `backend/.env` (or update if it already exists) with at least:

```bash
GOOGLE_API_KEY=your_gemini_api_key_here
# or
GEMINI_API_KEY=your_gemini_api_key_here

# Preferred Gemini model (image‑capable). The default stack is tuned for gemini-2.5-flash.
GEMINI_MODEL=gemini-2.5-flash
# Optionally, you can switch to another image-capable Gemini model that your key has access to
# (e.g. gemini-flash-latest) by changing this value and rebuilding the backend.

# Optional – DB & Redis (docker-compose provides defaults)
DATABASE_URL=postgresql://gaia_user:gaia_password@postgres:5432/gaia
REDIS_URL=redis://redis:6379
```

### 4.2 Frontend environment

`frontend/.env.local` is already wired for local Docker use:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NODE_ENV=development
DEBUG=gaia:*
```

No change is required for the default local environment.

---

## 5. Running Locally with Docker

From the project root (`gaia-platform/`):

```bash
docker-compose build
docker-compose up -d
```

Services will start in the background. Check status:

```bash
docker-compose ps
```

Useful URLs:

- Frontend UI: `http://localhost:3000`
- Backend root: `http://localhost:8000`
- Health check: `http://localhost:8000/health`

View logs if something is unhealthy:

```bash
docker-compose logs backend
docker-compose logs frontend
```

To stop everything:

```bash
docker-compose down
```

---

## 6. Core User Flows

### 6.1 Species Discovery

**URL:** `http://localhost:3000/species-discovery`

What it does:

- Reads species folders from two roots inside the container:
  - `/app/data/temp_extract/train` – upserted species/images (new anomalies).
  - `/app/data/butterflies/train` – base dataset.
- Aggregates images per species and returns clusters via:
  - `GET /api/species/clusters?page=<page>&limit=<limit>`.

Each cluster has:

- `name` – folder name, used as species label.
- `size` – number of images for that species.
- `cohesion_score` – heuristic score based on image count.
- `is_anomaly` – `true` for low‑count species (good candidates for new or rare species).
- `images` – up to 5 thumbnail URLs (`/static/...` or `/uploads/...`).

UI behavior:

- **Upserted species** (from `temp_extract`) are listed first, so new cards appear at the top of the grid.
- Base 100 species follow after that.
- Pagination is handled client‑side with “Load more” based on `page`/`limit`.

### 6.2 Butterfly Classifier

**URL:** `http://localhost:3000/butterfly-classifier`

Flow:

1. Upload an image in the drop area.
2. Click **Identify Species**.
3. The frontend calls `POST /api/gemini/classify`:
   - Next.js API route forwards the image to `backend:8000/api/gemini/classify`.
   - Backend uses `GeminiClassifier` (`backend/app/services/gemini_classifier.py`) to:
     - Call Gemini vision.
     - Parse the structured JSON response into predictions.
4. Predictions are rendered with:
   - Scientific name (`species`).
   - Common name.
   - Confidence percentage.
   - Rich natural‑language description.

#### 6.2.1 Classify + Upsert

After classification, the UI also triggers an upsert:

- `POST /api/butterfly/gemini` → backend `/api/gemini/classify-upsert`.

`classify-upsert` will:

1. Use Gemini predictions (or a manual hint) to determine a species name.
2. Compare against existing species folders in both roots.
3. If there is a close match:
   - Save the image into that species folder under `/app/data/temp_extract/train/<species>/upload_*.jpg`.
   - Respond with `upsert.action = "incremented"`.
4. Otherwise:
   - Create a new folder in `temp_extract/train`.
   - Save the image there.
   - Respond with `upsert.action = "created"`.
5. Invalidate the in‑memory clusters cache so Species Discovery will rescan.

The classifier page shows a toast with the outcome, and the next visit to Species Discovery will show the updated cluster(s).

---

## 7. Key APIs

Backend (FastAPI):

- `GET /health` – health/status.
- `GET /api/species/clusters?page=&limit=` – paginated species clusters.
- `GET /api/gemini/species` – list known species based on folder names.
- `POST /api/gemini/classify` – Gemini vision classifier.
- `POST /api/gemini/classify-upsert` – classify + save image + refresh clusters.
- `POST /api/butterfly/classify` – EfficientNet classifier over base dataset.

Frontend (Next.js API routes):

- `POST /api/gemini/classify` – proxy to backend Gemini classify.
- `POST /api/butterfly/gemini` – proxy to backend classify‑upsert.

Static mounts:

- `/static/…` → `/app/data/butterflies/train` (base dataset).
- `/uploads/…` → `/app/data/temp_extract/train` (user‑upserted images).

---

## 8. Troubleshooting

### 8.1 Clusters count seems inconsistent

- The backend now always performs a full dataset scan and caches it.
- Check the real value via:

  ```bash
  Invoke-WebRequest -Uri "http://localhost:8000/api/species/clusters?page=1&limit=200" -UseBasicParsing | Select-Object -ExpandProperty Content
  ```

- `total` should be stable across calls (e.g. `110`), increasing only when you upsert new species.
- Frontend caching for clusters has been disabled so the UI should match the backend response after a hard refresh.

### 8.2 New species not visible immediately

- Upserts write into `data/temp_extract/train` and invalidate the backend clusters cache.
- The classifier page also clears the relevant `sessionStorage` keys.
- If you don’t see the card:
  - Hard‑refresh `/species-discovery`.
  - New species should appear at the **top** of the grid, often marked as anomaly.

### 8.3 Gemini returns "Unknown" or 0% confidence

- The Gemini API may occasionally return low‑confidence or error responses (timeouts, overload, parse issues).
- Check backend logs for entries like `Gemini generate_content failed` or `Model output parse error`.
- Verify:
  - `GOOGLE_API_KEY` / `GEMINI_API_KEY` is valid.
  - The configured `GEMINI_MODEL` is accessible to that key.

### 8.4 Permission errors when saving images

- Upserted images are saved to `data/temp_extract/train`, which must be writable.
- On Windows/OneDrive, ensure the `data` folder is **not read‑only**.
  - Right‑click folder → Properties → clear **Read-only** → Apply.
  - If OneDrive policies interfere, consider moving the repo outside OneDrive.

---

## 9. Status

This repository is ready for demonstration and coursework submission:

- Reproducible full stack via Docker.
- Clear separation between frontend UI and backend APIs.
- Documented core flows (Species Discovery and Butterfly Classifier).
- Extensible to additional models, datasets, and geospatial features.
frame