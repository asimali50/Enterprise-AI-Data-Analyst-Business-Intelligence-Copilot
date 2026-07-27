# Architecture

## System Overview

```
┌─────────────────────────────────────────┐
│        Next.js 15 Frontend (TS)          │
│  Dashboard · Charts · Chat · Reports     │
│  Tailwind · shadcn/ui · Plotly.js        │
└────────────────┬────────────────────────┘
                 │  HTTP / REST API
                 ▼
┌─────────────────────────────────────────┐
│        FastAPI Backend (Python 3.12)     │
│  Routes · Services · Agent Orchestration │
└──────┬──────────────────┬───────────────┘
       │                  │
  ┌────▼─────┐    ┌──────▼──────┐
  │  DuckDB  │    │   SQLite    │
  │(Analytics)│   │(Metadata)   │
  └──────────┘    └─────────────┘
       │
  ┌────▼──────────────────────┐
  │   Multi-Agent Pipeline    │
  │  ┌──────────────────────┐ │
  │  │ 6 Specialized Agents │ │
  │  │ with Custom Tools    │ │
  │  └──────────────────────┘ │
  └──────────┬────────────────┘
             │
     ┌───────▼────────┐
     │   LiteLLM      │
     │  Multi-Provider │
     └────────────────┘
```

## Backend Architecture

### Layered Design

| Layer | Responsibility | Key Files |
|-------|---------------|-----------|
| **API Routes** | HTTP endpoints, request validation | `app/api/routes/*.py` |
| **Services** | Business logic, AI orchestration | `app/services/*.py` |
| **Agents** | AI agent prompts, tools, orchestration | `app/agents/*.py` |
| **Database** | Data access, persistence | `app/database/*.py` |
| **Utils** | Logging, validation, file handling | `app/utils/*.py` |
| **Config** | Environment-based settings | `app/config.py` |

### Database Strategy

- **DuckDB**: High-performance analytics engine. DataFrames are registered as in-memory tables for SQL queries. Used for all data analysis, statistics, and aggregation operations.
- **SQLite**: Metadata persistence. Stores dataset info, analysis results, chat history, reports, and AI provider configs via SQLAlchemy ORM.

### Multi-Agent Pipeline

The analysis pipeline runs 4 agents sequentially, each building on the previous agent's output:

1. **Data Profiling Agent** → Health scores, quality metrics, schema analysis
2. **Analytics Agent** → KPIs, correlations, trends, anomalies
3. **Visualization Agent** → Auto-generated Plotly chart specs
4. **Business Insights Agent** → Executive summary, recommendations, action items

Each agent uses custom tools to query DuckDB, then sends results to the AI model for interpretation.

## Frontend Architecture

### Page Structure

| Route | Purpose |
|-------|---------|
| `/` | Landing page with file upload |
| `/dashboard` | Dataset analysis dashboard with charts |
| `/chat` | Natural language Q&A with data |
| `/reports` | Report generation and viewer |

### Data Flow

1. User uploads file → Backend processes and stores in DuckDB
2. Frontend triggers analysis → Background agent pipeline runs
3. Results polled via API → Dashboard renders charts, KPIs, insights
4. User chats → API queries data context and returns AI answers

## Key Design Decisions

- **DuckDB over Pandas for queries**: DuckDB handles larger-than-memory datasets and supports SQL-based analytics with better performance
- **Sequential agents over parallel**: Each agent's output feeds the next (profiling → analytics → viz → insights), making sequential execution correct and simpler
- **LiteLLM for multi-provider**: Single abstraction layer supporting OpenAI, Anthropic, Google, Groq, and Ollama without code changes
- **Background task analysis**: Analysis runs as FastAPI BackgroundTasks to avoid timeout and allow progress polling
