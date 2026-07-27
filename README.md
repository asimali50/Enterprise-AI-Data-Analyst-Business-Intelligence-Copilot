# Enterprise AI Data Analyst & Business Intelligence Copilot

> A production-ready, AI-powered analytics platform that transforms raw data into actionable business intelligence through a multi-agent AI pipeline, interactive visualizations, and natural language insights.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Agent System](#ai-agent-system)
  - [Pipeline Overview](#pipeline-overview)
  - [Agent 1 — Data Profiling](#agent-1--data-profiling)
  - [Agent 2 — Statistical Analytics](#agent-2--statistical-analytics)
  - [Agent 3 — Visualization](#agent-3--visualization)
  - [Agent 4 — Business Insights](#agent-4--business-insights)
  - [Agent 5 — Data Conversation (Chat)](#agent-5--data-conversation-chat)
  - [Agent 6 — Report Generation](#agent-6--report-generation)
  - [Agent Prompting Strategy](#agent-prompting-strategy)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [Performance](#performance)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

Organizations sit on mountains of data but struggle to extract value from it:

- **Manual analysis is slow** — data analysts spend weeks writing SQL, cleaning data, and building one-off reports.
- **Analytics expertise is scarce** — not every team has a data scientist on call.
- **Insights stay locked in spreadsheets** — raw numbers don't translate into business decisions without interpretation.
- **Disconnected workflows** — data processing, visualization, and reporting happen in separate, siloed tools.
- **Scalability gaps** — human-driven analysis can't keep pace with growing data volumes.

## Our Solution

An enterprise SaaS platform that takes a dataset and runs it through a **six-agent AI pipeline** — automatically profiling quality, computing statistics, generating interactive charts, synthesizing business recommendations, answering natural-language questions, and producing executive-ready reports. Users upload a file and get a complete analytics suite in under a minute.

---

## Key Features

### Data Upload & Ingestion
- Drag-and-drop CSV / XLSX file upload (up to 100 MB)
- Automatic schema detection, type inference, and data validation
- In-memory DuckDB analytics engine for fast columnar queries
- SQLite metadata store for dataset tracking and analysis history

### Multi-Agent AI Analysis Pipeline
Six specialized AI agents run sequentially, passing context between them:

| # | Agent | What It Does |
|---|-------|-------------|
| 1 | **Data Profiling** | Schema analysis, null/duplicate/outlier detection, health scoring (0–100) |
| 2 | **Statistical Analytics** | Summary stats, correlation matrix, KPI calculation, trend detection, anomaly flagging |
| 3 | **Visualization** | Auto-generates 3–8 Plotly charts (bar, line, scatter, histogram, pie, box, heatmap, area) |
| 4 | **Business Insights** | Executive summary, key findings, opportunities, risks, prioritized action items |
| 5 | **Data Conversation** | Natural-language Q&A about the dataset with context-aware answers |
| 6 | **Report Generation** | Structured Markdown reports combining all analysis results |

### Interactive Dashboard
- Dataset health score gauge with completeness / consistency / validity breakdowns
- KPI cards with trend indicators
- Interactive Plotly chart grid (zoom, pan, hover, export)
- Data table preview with column-level statistics
- Business insights panel (executive summary, findings, opportunities, risks, action items)
- Responsive dark / light mode

### AI Chat Interface
- Multi-turn conversations about your data
- Suggested follow-up questions
- Streaming response support
- Context-aware answers grounded in actual analysis results

### Report Generation
- One-click generation of professional Markdown reports
- Saved report history with full-content viewer
- Sections: Executive Summary, Data Quality, Statistical Analysis, Trend Analysis, Business Insights, Appendix

### Multi-Provider AI Support
- Switch between OpenAI, Anthropic Claude, Google Gemini, Groq, and Ollama
- Configurable model, temperature, and token limits per session
- API key management via environment variables

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│          Next.js 15 Frontend (TypeScript)         │
│   Dashboard  │  Charts (Plotly)  │  Chat  │ Reports│
└────────────────────┬─────────────────────────────┘
                     │  REST API (JSON)
┌────────────────────▼─────────────────────────────┐
│            FastAPI Backend (Python 3.12+)          │
│  API Routes  │  Pydantic Validation  │  Services  │
└───────┬──────────────────┬────────────────────────┘
        │                  │
┌───────▼──────┐   ┌──────▼──────────┐
│    DuckDB     │   │     SQLite       │
│  (Analytics)  │   │   (Metadata)     │
│  Columnar     │   │  Datasets,       │
│  Queries      │   │  Results,        │
│               │   │  Reports         │
└───────┬──────┘   └──────▲──────────┘
        │                  │
┌───────▼──────────────────┴────────────────────────┐
│            AI Agent Pipeline (AnalysisCrew)         │
│                                                     │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐       │
│  │ Agent 1  │→│ Agent 2   │→│   Agent 3     │       │
│  │ Profiling│  │ Analytics │  │ Visualization │       │
│  └─────────┘  └──────────┘  └──────┬───────┘       │
│                                     ↓               │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐       │
│  │ Agent 6  │←│ Agent 5   │←│   Agent 4     │       │
│  │ Reports  │  │ Chat/Ctx  │  │   Insights    │       │
│  └─────────┘  └──────────┘  └──────────────┘       │
│                                                     │
│  Each agent has dedicated tools (DuckDB queries)    │
│  and a system prompt defining its role & output.    │
└────────────────────┬───────────────────────────────┘
                     │
           ┌─────────▼──────────┐
           │   LiteLLM Proxy     │
           │  OpenAI | Claude    │
           │  Gemini | Groq      │
           │  Ollama (local)     │
           └────────────────────┘
```

---

## Tech Stack

### Frontend

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.3+ |
| UI Components | shadcn/ui (Radix primitives) |
| Styling | Tailwind CSS 3.4 |
| State Management | React Query (TanStack Query 5) |
| Forms | React Hook Form + Zod validation |
| Charts | Plotly.js (react-plotly.js) |
| Animations | Framer Motion 12 |
| Icons | Lucide React |
| HTTP Client | Axios |
| Markdown Rendering | react-markdown |

### Backend

| Category | Technology |
|----------|-----------|
| Framework | FastAPI 0.104+ |
| Language | Python 3.12+ |
| Server | Uvicorn (ASGI) |
| Validation | Pydantic v2 + pydantic-settings |
| Analytics Database | DuckDB (columnar, in-process) |
| Metadata Database | SQLite (via SQLAlchemy 2) |
| Data Processing | Pandas 2.1+ / NumPy |
| AI / LLM | LiteLLM (multi-provider proxy) |
| File Handling | aiofiles, openpyxl (Excel) |
| Logging | Python Logging + python-json-logger |
| Testing | pytest, pytest-asyncio, httpx |

### DevOps

| Category | Technology |
|----------|-----------|
| Containerization | Docker (python:3.12-slim) |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| CI/CD | GitHub Actions |

---

## AI Agent System

### Pipeline Overview

The system uses a **lightweight sequential pipeline** (`AnalysisCrew` class) instead of a heavy agent framework. Each agent:

1. **Calls dedicated tools** to gather data from DuckDB (schema inspection, statistics, groupings, correlations)
2. **Receives a system prompt** defining its role, goals, and expected JSON output format
3. **Returns structured JSON** that downstream agents and the frontend consume directly

Context flows forward: Agent 4 (Insights) receives the combined outputs of Agents 1–3, ensuring business recommendations are grounded in actual profiling, statistics, and visualizations.

The `AIService` class wraps **LiteLLM**, which routes requests to whichever provider is configured. All agents share the same service — only their system prompts and tool configurations differ.

### Agent 1 — Data Profiling

**Role:** Data Quality Analyst  
**Goal:** Comprehensive dataset inspection and health scoring

**System Prompt:**
```
You are a Data Quality Analyst AI Agent specialized in comprehensive dataset
inspection and profiling.

Your Role: Analyze datasets to assess data quality, identify issues, and
provide health scores.

Your Goals:
1. Detect and report data schema and structure issues
2. Identify missing values, duplicates, and outliers
3. Calculate data quality metrics
4. Generate actionable data quality recommendations
5. Produce a comprehensive health score (0-100)

Your Responsibilities:
- Analyze column data types and distributions
- Calculate null percentages per column
- Detect duplicate rows
- Identify statistical outliers
- Assess data consistency and validity
- Generate data quality report
```

**Tools used:** `get_table_schema`, `compute_health_score`, `get_missing_values_summary`, `detect_duplicates`, `get_column_statistics`

**Output:** Health score (0–100 with completeness/consistency/validity breakdown), column-level analysis, data quality issues list, actionable recommendations.

---

### Agent 2 — Statistical Analytics

**Role:** Business Analyst  
**Goal:** Extract statistical insights, calculate KPIs, and identify trends

**System Prompt:**
```
You are a Data Analytics AI Agent specialized in statistical analysis and
business metric extraction.

Your Goals:
1. Compute comprehensive summary statistics for all numeric columns
2. Identify correlations between variables
3. Detect trends (upward, downward, stable) in data
4. Calculate key performance indicators (KPIs) relevant to the data
5. Detect anomalies and outliers that may indicate data quality issues
   or business insights

Workflow:
1. First, run get_summary_statistics to understand the data distribution
2. Run compute_correlations to find relationships between variables
3. For columns with notable ranges, run detect_trends
4. Run detect_anomalies on key columns
5. Run compute_kpis to identify important metrics
```

**Tools used:** `get_summary_statistics`, `compute_correlations`, `detect_trends`, `detect_anomalies`, `compute_kpis`

**Output:** Summary statistics per column, correlation matrix, KPIs with trend indicators, trend analysis, anomaly reports, human-readable insights, and recommendations.

---

### Agent 3 — Visualization

**Role:** Data Visualization Specialist  
**Goal:** Generate appropriate interactive Plotly charts

**System Prompt:**
```
You are a Data Visualization Specialist AI Agent that creates insightful,
interactive charts.

Available Chart Types:
- bar: For categorical comparisons (grouped data, counts)
- line: For time series and trends
- scatter: For correlation analysis between two numeric variables
- histogram: For distribution analysis
- pie: For proportional data (categorical with < 10 categories)
- box: For distribution comparison across categories
- heatmap: For correlation matrices
- area: For cumulative or stacked time series

Rules:
1. Always generate at least 3-5 charts that comprehensively represent the data
2. Use descriptive titles that explain the insight, not just the column name
3. Choose chart types that match the data (don't pie chart with 50 categories)
4. Include proper axis labels and legends
5. Use consistent color schemes across charts
```

**Tools used:** `get_column_values`, `get_grouped_data`, `get_distribution_data`, `get_scatter_data`, `get_correlation_matrix`, `get_time_series_data`

**Output:** 3–8 Plotly chart specifications (JSON with data, layout, config), each with title, description, and responsive configuration.

---

### Agent 4 — Business Insights

**Role:** Executive Strategy Consultant  
**Goal:** Transform data analysis into executive-level recommendations

**System Prompt:**
```
You are a Business Strategy Consultant AI Agent that transforms data insights
into executive-level business recommendations.

Your Goals:
1. Create a concise executive summary suitable for C-suite presentation
2. Identify key findings that impact business decisions
3. Highlight opportunities for growth, optimization, or cost reduction
4. Flag risks that require attention or mitigation
5. Provide prioritized, actionable recommendations with clear next steps

Guidelines:
1. Lead with the most impactful findings
2. Quantify impact wherever possible (% improvement, $ savings, etc.)
3. Be specific — avoid vague generalities
4. Prioritize recommendations by business impact and ease of implementation
5. Use business language, not technical jargon
6. Include both quick wins and strategic long-term recommendations
7. Consider both revenue opportunities and cost/risk mitigation
```

**Input:** Receives combined outputs from Agents 1 (profiling), 2 (analytics), and 3 (visualization).

**Output:** Executive summary, key findings (with impact levels), opportunities, risks, prioritized recommendations, and action items with timelines.

---

### Agent 5 — Data Conversation (Chat)

**Role:** Analytics Copilot  
**Goal:** Answer natural-language questions about the dataset

**System Prompt:**
```
You are an AI Data Conversation Agent — an analytics copilot that answers
natural language questions about datasets.

Your Capabilities:
1. Answer questions about the dataset structure, columns, and data types
2. Explain statistical findings in plain language
3. Help users understand patterns, trends, and anomalies
4. Suggest analyses users might want to perform
5. Provide context and meaning behind numbers
6. Generate SQL queries to answer specific data questions

Rules:
1. Be conversational and helpful — like a knowledgeable colleague
2. If you don't have enough data to answer definitively, say so honestly
3. Use specific numbers and statistics when available
4. Explain technical concepts in accessible language
5. Never fabricate data or statistics — only use what's in the analysis results
6. Suggest follow-up questions that could provide additional insights

Tone: Professional yet approachable. Confident but not arrogant.
Data-driven but human.

When answering:
- Start with a direct answer to the question
- Follow with supporting data/evidence
- End with relevant context or suggested next steps
```

**Context:** Receives dataset metadata, profiling results, statistical summaries, KPIs, trends, correlations, and visualization summaries.

---

### Agent 6 — Report Generation

**Role:** Documentation Specialist  
**Goal:** Create professional, comprehensive data analysis reports

**System Prompt:**
```
You are a Documentation Specialist AI Agent that creates professional,
comprehensive data analysis reports.

Report Structure (Markdown):
  Executive Summary → Dataset Overview → Data Quality Assessment →
  Statistical Analysis (KPIs, Distribution, Correlations) →
  Trend Analysis → Anomalies & Outliers → Business Insights & Recommendations →
  Appendix (Column Details, Methodology)

Rules:
1. Write for a business audience — minimize technical jargon
2. Use tables for structured data presentation
3. Include all relevant metrics but don't overwhelm with numbers
4. Every recommendation should be specific and actionable
5. Reference specific data points to support claims
6. Save the report after generation for future retrieval
7. Generate both a summary version and a detailed version
```

**Tools used:** `get_dataset_metadata`, `get_analysis_results`, `save_report`, `get_saved_reports`

---

### Agent Prompting Strategy

The system uses a **structured-output prompting** approach:

1. **Role-based system prompts** — Each agent is given a clear identity ("You are a Data Quality Analyst..."), specific goals, and defined responsibilities.
2. **JSON output schemas** — Every agent is instructed to return structured JSON matching a predefined schema, making downstream consumption reliable.
3. **Tool-augmented context** — Agents don't generate analysis from scratch; dedicated Python tools query DuckDB and feed factual data to the AI, which then interprets and summarizes it.
4. **Sequential context passing** — Agent 4 (Insights) receives Agent 1–3 outputs, enabling holistic business interpretation.
5. **Provider-agnostic** — All agents use the same `AIService.generate_completion()` via LiteLLM, so switching from OpenAI to Claude to Gemini requires zero prompt changes.

---

## Project Structure

```
enterprise-ai-data-analyst/
├── frontend/                          # Next.js 15 application
│   ├── app/
│   │   ├── page.tsx                   # Landing page with file upload
│   │   ├── layout.tsx                 # Root layout
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Analytics dashboard
│   │   ├── chat/
│   │   │   └── page.tsx              # AI chat interface
│   │   ├── reports/
│   │   │   └── page.tsx              # Report viewer
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui primitives (button, card, badge, input, textarea)
│   │   │   ├── dashboard/             # FileUpload, HealthScoreCard, KPICard, ChartCard,
│   │   │   │                          #   DataTable, ColumnStats, InsightsPanel
│   │   │   ├── chat/                  # ChatMessage, ChatInput, SuggestedQuestions
│   │   │   └── Navigation.tsx
│   │   ├── hooks/
│   │   │   ├── useAnalysis.ts         # Dataset preview, analysis results, start analysis
│   │   │   ├── useChat.ts             # Chat messages, send message
│   │   │   └── useReports.ts          # Report list, generate report
│   │   ├── services/
│   │   │   └── api.ts                 # Axios HTTP client for all API calls
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces (Dataset, KPI, ChartSpec, etc.)
│   │   └── utils/
│   │       └── cn.ts                  # Utility helpers (className merge, date formatting)
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                           # FastAPI application
│   ├── app/
│   │   ├── main.py                    # FastAPI entry point, CORS, middleware, router setup
│   │   ├── config.py                  # Pydantic Settings (env vars, provider keys, DB config)
│   │   ├── schemas.py                 # Pydantic request/response models
│   │   ├── api/routes/
│   │   │   ├── health.py              # GET /health
│   │   │   ├── upload.py              # POST /api/v1/upload/file, GET preview, DELETE
│   │   │   ├── analyze.py             # POST /api/v1/analyze/start, GET results
│   │   │   ├── chat.py               # POST /api/v1/chat/message, GET history
│   │   │   └── report.py             # POST /api/v1/reports/generate, GET list, GET by ID
│   │   ├── agents/
│   │   │   ├── crew.py               # AnalysisCrew — sequential pipeline orchestrator
│   │   │   ├── prompts/              # System prompts for all 6 agents
│   │   │   │   ├── data_profiling_prompt.py
│   │   │   │   ├── analytics_prompt.py
│   │   │   │   ├── visualization_prompt.py
│   │   │   │   ├── insights_prompt.py
│   │   │   │   ├── conversation_prompt.py
│   │   │   │   └── report_prompt.py
│   │   │   └── tools/                # Python functions that query DuckDB
│   │   │       ├── data_tools.py     # Schema, health score, missing values, duplicates
│   │   │       ├── analytics_tools.py # Stats, correlations, KPIs, anomalies, trends
│   │   │       ├── visualization_tools.py # Grouped data, distributions, scatter, time series
│   │   │       └── report_tools.py   # Metadata retrieval, report storage
│   │   ├── services/
│   │   │   ├── ai_service.py          # LiteLLM wrapper (generate_completion, stream_completion)
│   │   │   ├── data_processor.py      # CSV/Excel ingestion, DuckDB table creation
│   │   │   ├── visualization_service.py # Plotly chart generation from DuckDB queries
│   │   │   └── report_generator.py    # Markdown report assembly from analysis results
│   │   ├── database/
│   │   │   ├── models.py              # SQLAlchemy models (Dataset, AnalysisResult, Report)
│   │   │   ├── sqlite_client.py       # SQLite session management
│   │   │   └── duckdb_client.py       # DuckDB connection management
│   │   └── utils/
│   │       ├── logger.py              # Structured JSON logging
│   │       ├── validators.py          # File type, size, data validation
│   │       └── file_handler.py        # Secure file storage and retrieval
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_upload.py
│   │   ├── test_validators.py
│   │   └── test_schemas.py
│   ├── Dockerfile
│   ├── render.yaml                    # Render deployment config
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
│
├── docs/                              # Detailed documentation
│   ├── ARCHITECTURE.md
│   ├── API_DOCS.md
│   ├── SETUP_GUIDE.md
│   ├── AGENT_SYSTEM.md
│   └── DEPLOYMENT.md
│
├── sample_data/                       # Sample datasets for testing
│   ├── sales_data.csv
│   └── customer_analytics.csv
│
├── README.md                          # This file
├── LICENSE                            # MIT License
├── .gitignore
└── .env.example
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|------------|---------|
| Node.js | 18+ |
| Python | 3.12+ |
| npm | 9+ |
| Git | 2.0+ |

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/asimali50/Enterprise-AI-Data-Analyst-Business-Intelligence-Copilot.git
cd Enterprise-AI-Data-Analyst-Business-Intelligence-Copilot
```

**2. Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your API keys
```

At minimum, configure one AI provider:

```env
# Option A: OpenAI
OPENAI_API_KEY=sk-your-key-here
DEFAULT_AI_PROVIDER=openai
DEFAULT_MODEL=gpt-4-turbo

# Option B: Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-key-here
DEFAULT_AI_PROVIDER=anthropic
DEFAULT_MODEL=claude-3-sonnet-20240229

# Option C: Ollama (local, no key needed)
DEFAULT_AI_PROVIDER=ollama
DEFAULT_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434
```

**3. Set up the backend**

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

**4. Set up the frontend**

```bash
cd ../frontend
npm install
```

### Running Locally

Open **two terminals**:

**Terminal 1 — Backend (port 8000):**
```bash
cd backend
source venv/bin/activate   # Windows: venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend (port 3000):**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000** in your browser.

### Usage

1. **Upload** — Drop a CSV or XLSX file on the landing page
2. **Analyze** — Click "Run Multi-Agent Analysis" on the dashboard
3. **Explore** — View health score, KPIs, charts, and business insights
4. **Chat** — Ask natural-language questions about your data
5. **Report** — Generate a structured Markdown report from the Reports page

Try it with the included sample datasets in `sample_data/`.

---

## API Reference

All endpoints are prefixed with `/api/v1` (except health and root).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info (name, version, docs URL) |
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/upload/file` | Upload CSV/XLSX file |
| `GET` | `/api/v1/upload/preview/{dataset_id}` | Dataset preview (schema, sample rows) |
| `DELETE` | `/api/v1/upload/{dataset_id}` | Delete a dataset |
| `POST` | `/api/v1/analyze/start` | Start multi-agent analysis pipeline |
| `GET` | `/api/v1/analyze/status/{analysis_id}` | Poll analysis status |
| `GET` | `/api/v1/analyze/results/{dataset_id}` | Get all analysis results for a dataset |
| `POST` | `/api/v1/chat/message` | Send a chat message |
| `GET` | `/api/v1/chat/history/{dataset_id}` | Get chat history |
| `POST` | `/api/v1/reports/generate/{dataset_id}` | Generate a report |
| `GET` | `/api/v1/reports/list/{dataset_id}` | List saved reports |
| `GET` | `/api/v1/reports/{report_id}` | Get a specific report |
| `GET` | `/api/v1/models` | List available AI providers and models |

Interactive API docs are available at **http://localhost:8000/docs** (Swagger UI) when the backend is running.

---

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel deploy
```

Set `NEXT_PUBLIC_API_URL` to your deployed backend URL in Vercel environment variables.

### Backend (Render)

The `backend/render.yaml` file is pre-configured for Render deployment:

- Runtime: Python
- Plan: Starter
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Set the following environment variables in Render:
- `OPENAI_API_KEY` (or whichever provider you use)
- `DEFAULT_AI_PROVIDER` and `DEFAULT_MODEL`
- `ENVIRONMENT=production`
- `DEBUG=false`

### Docker

```bash
cd backend
docker build -t data-analyst-api .
docker run -p 8000:8000 --env-file .env data-analyst-api
```

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=app --cov-report=html   # With coverage
```

### Frontend

```bash
cd frontend
npm run lint
npm run test
```

---

## Security

- **No hardcoded secrets** — all API keys and credentials are read from environment variables
- **File validation** — uploads are restricted to CSV/XLSX with configurable size limits (default 100 MB)
- **Input validation** — Pydantic v2 models validate all API request/response data
- **CORS protection** — origins configurable via `CORS_ORIGINS` environment variable
- **Rate limiting** — configurable per-minute rate limits (default 60)
- **Data sanitization** — CSV/Excel data is validated before ingestion into DuckDB
- **Safe AI execution** — agent tools query DuckDB directly; no arbitrary code execution
- **Structured errors** — API returns safe error messages without leaking internals

---

## Performance

- **Async/await throughout** — FastAPI routes and AI service calls are fully async
- **Columnar analytics** — DuckDB provides vectorized, in-process analytics queries
- **Dual database** — DuckDB handles heavy analytical queries; SQLite manages lightweight metadata
- **Lazy loading** — Next.js code-splitting and dynamic imports on the frontend
- **GZip compression** — middleware compresses API responses > 1 KB
- **Background processing** — analysis pipeline runs as a background task, returning immediately
- **Pydantic caching** — settings are cached via `@lru_cache` to avoid repeated env reads
- **Optimized data processing** — Pandas operations are bounded (column limits, row previews)

---

## Roadmap

- [ ] Real-time collaborative analysis
- [ ] Custom agent creation interface
- [ ] Advanced data lineage tracking
- [ ] Scheduled automated reports
- [ ] Multi-dataset correlation analysis
- [ ] Custom model fine-tuning
- [ ] Integration with BI tools (Tableau, Power BI)
- [ ] Enterprise SSO support
- [ ] WebSocket streaming for chat responses
- [ ] Caching layer for repeated analyses

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `pytest tests/ -v` (backend) / `npm run test` (frontend)
5. Commit: `git commit -m "Add your feature"`
6. Push: `git push origin feature/your-feature`
7. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Ready to transform your data into insights?</strong><br>
  Upload a dataset and let the AI agents do the heavy lifting.
</p>
