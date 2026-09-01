# Developer Guide

Detailed developer reference for the AI Data Analytics platform. This file backs up the concise `CLAUDE.md` at the repo root — read it here when you need the full commands, architecture, or gotchas.

See also: `ARCHITECTURE.md` (system diagram & data flow), `API_DOCS.md` (endpoint reference), `SETUP_GUIDE.md` (first-run setup), `DEPLOYMENT.md` (hosting), `AGENT_SYSTEM.md` (agent prompts/roles), and `README.md` (product detail).

---

## Overview

Monorepo for an AI-powered analytics platform: upload a CSV/XLSX, run a multi-agent analysis pipeline, and get profiling, statistics, charts, business insights, chat, cleaning, and export. Frontend is Next.js 15 (App Router, TypeScript); backend is FastAPI (Python 3.12+).

## Common Commands

### Backend (FastAPI, port 8000)

```bash
cd backend
# Install (first time): python -m venv venv && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- **Tests**: `cd backend && pytest` (config in `backend/pytest.ini`, `asyncio_mode = auto`, in-memory DB via `tests/conftest.py`). Run one test: `pytest tests/test_upload.py -k test_name`.
- **API docs**: `http://localhost:8000/docs` (Swagger). Health is at `/health` (no `/api/v1` prefix).
- **Formatting/lint (optional)**: `black`, `isort`, `flake8`, `mypy` are in requirements but not wired to a CI config.

### Frontend (Next.js, port 3000)

```bash
cd frontend
npm install
npm run dev
```

- **Build**: `npm run build` — note `next.config.ts` sets `typescript.ignoreBuildErrors: true`, so the build will NOT catch type errors. Run `npx tsc --noEmit` to type-check.
- **Lint**: `npm run lint`
- **Tests**: `npm test` runs `jest`, but **there is no jest config or test files** — the script is a stub; backend pytest is the only working test suite.

### Full stack (Docker)

```bash
docker compose up --build   # backend :8000 + frontend :3000
```

## Architecture

### Backend (`backend/app`)

Layered: `api/routes` → `services` → `agents` → `database`. Routes registered in `app/main.py`; all except health get the `/api/v1` prefix.

- **Two databases** (`app/database/`):
  - **DuckDB** (`duckdb_client.py`) — analytics engine. DataFrames are **materialized to an on-disk file** (`./data/analytics.duckdb`) with `CREATE OR REPLACE TABLE "name" AS SELECT * FROM df`. A plain `conn.register()` only creates a connection-scoped in-memory view that vanishes on restart — never use it for tables that must survive.
  - **SQLite** (`sqlite_client.py` + `models.py`, SQLAlchemy 2) — metadata: datasets, analysis results, chat history, reports.
- **Multi-agent pipeline** (`agents/crew.py`, class `AnalysisCrew`) — a lightweight sequential pipeline, NOT the CrewAI framework. Four stages run in order: profiling → analytics → visualization → insights, each calling DuckDB tool functions (`agents/tools/*.py`), sending results to the AI via `services/ai_service.py` (LiteLLM), and returning JSON that is stored in SQLite. Insights receives profiling+analytics+visualization output as context.
- **Routes**: `upload` (ingest/preview/delete), `analyze` (queued background pipeline + status/result polling), `chat`, `report`, `cleaning`, `visualizations` (user-configured chart generation via `services/visualization_service.py`), `export` (CSV/JSON/Markdown; PDF/Excel reported as unsupported).
- **`config.py`** — pydantic-settings, cached via `@lru_cache`. Env vars for API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`), provider/model defaults, DB paths, upload limits.
- **Background analysis**: `/analyze/start` returns immediately with an `analysis_id`; the pipeline runs via FastAPI `BackgroundTasks` and writes progress into a persisted `AnalysisResult` row that `/analyze/status/{id}` polls. `analyze.py` `TYPE_ALIASES` maps user-facing analysis names (e.g. `correlation`) onto pipeline stages (`analytics`).

### Frontend (`frontend/app`)

- App Router; every route is a client component (`"use client"`). Path alias `@/*` → `./app/*`.
- **`layout.tsx`** wraps the app in `QueryClientProvider` (TanStack Query) + react-hot-toast `Toaster`, applies fonts (`--font-sans`, `--font-display`, `--font-mono`) and a theme bootstrapping script.
- **`components/layout/AppShell.tsx`** — shared shell (collapsible sidebar, breadcrumbs, command menu, theme toggle, "All Systems Normal" pill). Most pages render content inside `<AppShell>`. Nav items in `components/layout/sidebar-items.ts`.
- **`components/ui/`** — hand-rolled shadcn-style primitives (button, card, dialog, tabs, select, tooltip, etc.).
- **Per-feature folders**: each page (e.g. `analysis/`, `cleaning/`, `datasets/`, `export/`, `insights/`, `profiling/`, `visualizations/`, `settings/`, `reports/`) pairs a `page.tsx` with components under `components/<feature>/` and a hook under `hooks/` (`useAnalysis.ts`, `useCleaning.ts`, `useExport.ts`, `useVisualizations.ts`, …).
- **`services/api.ts`** — single axios client. `API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1"`. In dev, `next.config.ts` rewrites `/api/*` → `http://localhost:8000/api/*`; in production the rewrites are disabled and routing is handled by `vercel.json` / `NEXT_PUBLIC_API_URL`.
- **Charts**: Plotly via `react-plotly.js` against `plotly.js-dist-min` (webpack alias in `next.config.ts`). Theme colors in `utils/chartTheme.ts`.

### Deployment

- **Frontend**: Vercel (`vercel.json` at repo root builds `frontend/` and rewrites `/api/(.*)` to the Python serverless function in `api/index.py`, which re-exports the FastAPI app from `backend/`).
- **Backend**: Render (`backend/render.yaml`) or Docker (`docker-compose.yml`). **Do not rely on Vercel serverless for the backend** — DuckDB data lives on disk and is lost between serverless cold starts. Persistent hosts only.

## Gotchas

- **SQLAlchemy JSON columns**: mutating a JSON column in place (e.g. `record.result_data["status"] = x`) is not detected — SQLAlchemy sees the same object identity and emits no UPDATE. Always assign a fresh dict (`dict(record.result_data or {})`, mutate the copy, reassign). Affects `AnalysisResult.result_data`, `Dataset.preview_data`, `Report.charts_data`.
- **KPIs shape**: the analytics result's `kpis` may be a dict `{"kpis": [...]}` rather than a direct array (the tool returns `json.dumps({"kpis": ...})`). Consumers must handle both shapes; see `report_generator.py` and `dashboard/page.tsx` for the pattern.
- **`next build` skips type-checking** (`typescript.ignoreBuildErrors: true`). Run `npx tsc --noEmit` after frontend changes.
- **Health endpoint** is `/health`, not `/api/v1/health`. The dev rewrite maps `/api/v1/health` → `http://localhost:8000/health`.
- **AI chat/analysis need a real provider key.** With no `ANTHROPIC_API_KEY`/`GOOGLE_API_KEY`/`OPENAI_API_KEY` configured, LiteLLM calls fail and chat/analysis return 500 via the service's error path. There is no mock/offline mode.
- **Sample data**: `sample_data/` has CSVs for testing; `backend/uploads/` and `backend/data/analytics.duckdb` hold local runtime artifacts.
