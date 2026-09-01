# Deployment Guide

## Recommended Architecture

**Frontend on Vercel, Backend on Render (or Docker on a single host).**

> ⚠️ **Do NOT host the backend on Vercel serverless.** The backend uses a
> file-based DuckDB + SQLite store and file uploads. Vercel serverless
> functions have an ephemeral filesystem that is wiped on cold start and may
> hit different instances per request — uploaded datasets and analytics would
> be silently lost. This project is therefore wired to serve **only the
> frontend from Vercel** (see `vercel.json`); the backend runs as a long-lived
> process on Render/Docker where disk persists.

## Frontend (Vercel)

```bash
cd frontend
npm run build
npx vercel deploy
```

Set the environment variable in the Vercel dashboard:

- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://your-api.onrender.com/api/v1`)

Without this, the frontend falls back to `/api/v1` on the Vercel origin, which
will not reach the backend.

## Backend (Render)

1. Push to GitHub
2. Connect repo on Render
3. Render auto-detects `backend/render.yaml` and deploys
4. Set environment variables in the Render dashboard

Required env vars (the ones marked `sync: false` in `render.yaml`):

```
ENVIRONMENT=production
DEBUG=false
DEFAULT_AI_PROVIDER=openai
DEFAULT_MODEL=<provider model id>
OPENAI_API_KEY=sk-...   # or ANTHROPIC_API_KEY / GOOGLE_API_KEY / GROQ_API_KEY
SECRET_KEY=<long random string>
CORS_ORIGINS=https://your-frontend.vercel.app
```

For data durability across service restarts/deploys, attach a **persistent
disk** to the Render service and point `DUCKDB_PATH` + `UPLOAD_DIR` at it
(e.g. `/var/data/analytics.duckdb` and `/var/data/uploads`). The default
`/tmp` paths survive process restarts on Render but **not** deploys.

## Docker (Any Cloud / VPS)

```bash
docker compose -f docker-compose.yml up --build -d
```

Persistent named volumes (`backend_data`, `backend_uploads`) are already
configured in `docker-compose.yml`.

## Production Safety Guard

When `ENVIRONMENT=production`, the backend **refuses to start** if any of the
following is true (see `Settings.validate_production` in `backend/app/config.py`):

- `SECRET_KEY` is still the development default (`dev-secret-key-change-in-production`)
- `DEBUG` is `True`
- `CORS_ORIGINS` includes `*`

This prevents an accidental insecure deployment. Fix the flagged setting to start.

## Environment Checklist

- [ ] API keys configured (at least one AI provider) — required for chat/insights
- [ ] `NEXT_PUBLIC_API_URL` set on the frontend to the backend URL
- [ ] CORS origins updated for the production frontend URL
- [ ] `SECRET_KEY` changed from default
- [ ] `DUCKDB_PATH` uses a persistent volume/disk
- [ ] `UPLOAD_DIR` uses a persistent volume/disk
- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=false`
