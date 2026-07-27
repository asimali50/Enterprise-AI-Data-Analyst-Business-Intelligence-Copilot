# API Documentation

Base URL: `http://localhost:8000/api/v1`

## Upload

### POST /upload/file
Upload a CSV or Excel file.
- **Body**: `multipart/form-data` with `file` field
- **Returns**: `{ success, dataset_id, filename, file_id }`

### GET /upload/preview/{dataset_id}
Get dataset preview with schema and first 5 rows.
- **Returns**: `DatasetPreview` object

### DELETE /upload/{dataset_id}
Delete a dataset and associated files.

## Analysis

### POST /analyze/start
Start multi-agent analysis pipeline.
- **Body**: `{ dataset_id, analysis_types?, ai_provider?, ai_model? }`
- **Returns**: `{ success, analysis_id, status: "queued" }`
- **analysis_types**: `["profiling", "analytics", "visualization", "insights"]`

### GET /analyze/status/{analysis_id}
Check analysis progress.

### GET /analyze/result/{analysis_id}
Get specific analysis result.

### GET /analyze/results/{dataset_id}
Get all results for a dataset. Polls `status` field to check completion.

## Chat

### POST /chat/message
Send a question about a dataset.
- **Body**: `{ dataset_id, message, conversation_history? }`
- **Returns**: `{ dataset_id, message, streaming }`

### GET /chat/history/{dataset_id}
Get chat history. Query param: `limit` (default 50).

## Reports

### POST /reports/generate/{dataset_id}
Generate a Markdown report from all available analysis results.
- **Returns**: `{ success, report_id, title, content }`

### GET /reports/list/{dataset_id}
List saved reports.

### GET /reports/{report_id}
Get full report content.

## System

### GET /health
Health check. Returns `{ status, timestamp, version }`.

### GET /models
List available AI providers and models.

### GET /config
Get non-sensitive application configuration.

## Typical Workflow

```
1. POST /upload/file           → get dataset_id
2. POST /analyze/start         → get analysis_id
3. GET  /analyze/results/{id}  → poll until status=completed
4. GET  /chat/message          → ask questions
5. POST /reports/generate/{id} → get report
```
