# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## TL;DR
Monorepo: Next.js 15 frontend (`frontend/`) + FastAPI backend (`backend/`). Upload CSV/XLSX → 4-stage `AnalysisCrew` pipeline (profiling → analytics → visualization → insights) → profiling, charts, chat, cleaning, export. DBs: DuckDB (analytics) + SQLite (metadata).

## Commands
- Backend: `cd backend && uvicorn app.main:app --reload --port 8000` · tests: `pytest` (single: `-k name`).
- Frontend: `cd frontend && npm run dev` · build skips type-check (run `npx tsc --noEmit`) · `npm test` is a jest stub.

## Docs — read the relevant one when you need detail
- Developer commands/architecture/gotchas: `docs/DEVELOPER_GUIDE.md` · Architecture: `docs/ARCHITECTURE.md` · Deployment: `docs/DEPLOYMENT.md` · Setup: `docs/SETUP_GUIDE.md` · API: `docs/API_DOCS.md`

## Top gotchas (full list in `docs/DEVELOPER_GUIDE.md`)
- SQLAlchemy JSON columns: in-place mutation not detected — assign a fresh dict.
- `kpis` may be a dict wrapping an array, not a direct array.
- Health endpoint is `/health`; AI features need a real provider key (no mock mode).
- Never host the backend on Vercel serverless (DuckDB file lost on cold start).
