# Deployment Guide

## Frontend (Vercel)

```bash
cd frontend
npm run build
npx vercel deploy
```

Set environment variable:
- `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., `https://your-api.onrender.com/api/v1`)

## Backend (Render)

1. Push to GitHub
2. Connect repo on Render
3. Render auto-detects `render.yaml` and deploys
4. Set environment variables in Render dashboard

Required env vars:
```
ENVIRONMENT=production
DEFAULT_AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

## Docker (Any Cloud)

```bash
docker compose -f docker-compose.yml up --build -d
```

## Environment Checklist

- [ ] API keys configured (at least one provider)
- [ ] CORS origins updated for production frontend URL
- [ ] `SECRET_KEY` changed from default
- [ ] `DUCKDB_PATH` uses a persistent volume
- [ ] `UPLOAD_DIR` uses a persistent volume
- [ ] `ENVIRONMENT=production`
- [ ] `DEBUG=false`
