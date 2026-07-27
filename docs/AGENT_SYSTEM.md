# Agent System

## Overview

The Enterprise AI Data Analyst uses a **multi-agent pipeline** where 6 specialized AI agents work sequentially to transform raw data into business intelligence.

## Agents

### 1. Data Profiling Agent
- **Role**: Data Quality Analyst
- **Goal**: Comprehensive dataset inspection
- **Tools**: `get_table_schema`, `get_column_statistics`, `detect_duplicates`, `get_missing_values_summary`, `compute_health_score`
- **Output**: Health score (0-100), quality metrics, column analysis, recommendations

### 2. Analytics Agent
- **Role**: Business Analyst
- **Goal**: Extract statistical insights and trends
- **Tools**: `get_summary_statistics`, `compute_correlations`, `detect_trends`, `detect_anomalies`, `compute_kpis`
- **Output**: KPIs, correlations, trend analysis, anomaly detection

### 3. Visualization Agent
- **Role**: Data Visualization Specialist
- **Goal**: Generate interactive Plotly charts
- **Tools**: `get_column_values`, `get_grouped_data`, `get_distribution_data`, `get_scatter_data`, `get_correlation_matrix`, `get_time_series_data`
- **Output**: Plotly JSON chart specifications (10+ chart types)

### 4. Business Insights Agent
- **Role**: Executive Strategy Consultant
- **Goal**: Transform insights into business decisions
- **Input**: Outputs from agents 1-3
- **Output**: Executive summary, findings, opportunities, risks, recommendations, action items

### 5. Data Conversation Agent
- **Role**: Analytics Copilot
- **Goal**: Answer natural language questions about data
- **Trigger**: On-demand via chat API
- **Output**: Context-aware insights and explanations

### 6. Report Generator Agent
- **Role**: Documentation Specialist
- **Goal**: Create professional reports
- **Tools**: `get_dataset_metadata`, `get_analysis_results`, `save_report`, `get_saved_reports`
- **Output**: Structured Markdown reports

## Pipeline Flow

```
Upload → Data Profiling → Analytics → Visualization → Business Insights
                                                         ↓
                                              Report Generation (on demand)
```

Each agent:
1. Uses custom tools to query DuckDB for real data
2. Sends structured data to the AI model with a specialized prompt
3. Returns parsed, actionable results

## Adding a New Agent

1. Create prompt in `app/agents/prompts/`
2. Create tools in `app/agents/tools/` if needed
3. Add agent method in `app/agents/crew.py`
4. Wire into `run_full_analysis()` pipeline
