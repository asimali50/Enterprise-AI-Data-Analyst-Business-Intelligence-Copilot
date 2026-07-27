# Setup Guide

## Prerequisites

- Python 3.12+
- Node.js 18+
- Git

## Quick Start

### 1. Clone & Environment

```bash
git clone <repo-url>
cd enterprise-ai-data-analyst
cp .env.example .env
# Edit .env with your API keys
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open

Navigate to `http://localhost:3000`

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | For OpenAI | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | For Claude | — | Anthropic API key |
| `GOOGLE_API_KEY` | For Gemini | — | Google AI API key |
| `GROQ_API_KEY` | For Groq | — | Groq API key |
| `OLLAMA_BASE_URL` | For Ollama | `http://localhost:11434` | Ollama server URL |
| `DEFAULT_AI_PROVIDER` | No | `openai` | Default AI provider |
| `DEFAULT_MODEL` | No | `gpt-4-turbo` | Default model |
| `DUCKDB_PATH` | No | `./data/analytics.duckdb` | DuckDB file path |
| `MAX_UPLOAD_SIZE_MB` | No | `100` | Max upload size |

## Docker

```bash
docker compose up --build
```

Frontend: `http://localhost:3000` | Backend: `http://localhost:8000`

## Troubleshooting

- **DuckDB path error**: Ensure `data/` directory exists (auto-created on startup)
- **Upload fails**: Check `MAX_UPLOAD_SIZE_MB` and file format (CSV/XLSX only)
- **AI errors**: Verify API key is set for the selected provider
- **Port conflict**: Change ports in uvicorn/next config
