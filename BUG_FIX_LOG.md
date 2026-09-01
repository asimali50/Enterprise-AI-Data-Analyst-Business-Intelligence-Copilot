# BUG_FIX_LOG.md

**Date:** 2026-07-31
**Scope:** Runtime bugs found during production validation. No new features were added.

---

## Critical Fixes

### BUG-01: Uploaded data lost on every server restart (CRITICAL — production blocker)

| | |
|---|---|
| **Severity** | 🔴 Critical |
| **File** | `backend/app/database/duckdb_client.py` |
| **Symptom** | After any backend restart, all uploaded datasets show in the UI but return empty data. CSV export → `No data available to export`; visualizations → empty; cleaning → no recommendations. |
| **Root cause** | `conn.register(table_name, df)` only creates a **connection-scoped in-memory view**. DuckDB's file connection doesn't persist registered views to disk. Every restart wiped the analytics layer while SQLite metadata survived, leaving the app in an inconsistent state. |
| **Fix** | Replaced `conn.register()` with `CREATE OR REPLACE TABLE "{table_name}" AS SELECT * FROM df`, which materializes the DataFrame into the on-disk DuckDB file. |
| **Verification** | Upload → restart backend → CSV export, visualizations, and cleaning all still work. ✅ |

---

### BUG-02: Export feature returned dead links — nothing was downloadable (HIGH)

| | |
|---|---|
| **Severity** | 🟠 High |
| **File** | `backend/app/api/routes/export.py` (rewritten), `frontend/app/services/api.ts`, `frontend/app/hooks/useExport.ts`, `frontend/app/export/page.tsx` |
| **Symptom** | The Export page showed "Export complete" but no files could be downloaded. The POST returned URLs like `/api/v1/export/{id}/csv` that 404'd (no GET route existed). Formats were never validated — arbitrary strings accepted. |
| **Root cause** | The export route was a stub: it only built a list of URL strings and returned them. No download endpoint existed, and the frontend never actually fetched the files. |
| **Fix** | Implemented real download routes: `GET /export/{id}/csv`, `GET /export/{id}/json`, `GET /export/{id}/md`. Frontend now calls `downloadExportFile()` per format to trigger actual browser downloads. Unsupported formats (PDF, HTML, XLSX, PNG, SVG) are reported honestly via `unsupported_formats` instead of silent dead links. |
| **Verification** | Prepare → download CSV/JSON/MD all return 200 with correct content; unsupported formats return an honest message. ✅ |

---

### BUG-03: Analysis status endpoint always 404'd (HIGH)

| | |
|---|---|
| **Severity** | 🟠 High |
| **File** | `backend/app/api/routes/analyze.py` |
| **Symptom** | `GET /analyze/status/{analysis_id}` always returned 404 "Analysis not found", even for valid analysis IDs returned by `/analyze/start`. |
| **Root cause** | The `analysis_id` returned by `/analyze/start` was never persisted. The background pipeline generated fresh UUIDs for each stored result, so the status endpoint could never find the queued ID. |
| **Fix** | `/analyze/start` now persists a `pipeline` record with the returned `analysis_id`. The background task updates its `result_data.status` through `queued → processing → completed/failed`. The status endpoint reads this record. |
| **Verification** | Start → status shows `queued` → polls → `completed` with `completed_types`. ✅ |

---

### BUG-04: SQLAlchemy JSON in-place mutation silently ignored (HIGH)

| | |
|---|---|
| **Severity** | 🟠 High |
| **File** | `backend/app/api/routes/analyze.py` |
| **Symptom** | After implementing BUG-03, status updates appeared to commit but never persisted. |
| **Root cause** | SQLAlchemy does not detect in-place mutation of a plain `JSON` column. `info["status"] = ...` mutated the dict, then assigning the same object back triggered no diff → no UPDATE emitted. This is a classic SQLAlchemy pitfall. |
| **Fix** | Build a **new** dict (`dict(record.result_data or {})`), mutate the copy, assign it. Documented with a comment. |
| **Verification** | Direct DB read confirms status transitions persist. ✅ |

---

### BUG-05: "Statistical Analysis" page ran nothing (HIGH)

| | |
|---|---|
| **Severity** | 🟠 High |
| **File** | `backend/app/api/routes/analyze.py`, `frontend/app/analysis/page.tsx` |
| **Symptom** | Clicking "Run Analysis" on the Analysis page showed a spinner forever and never completed. The page sent `analysis_types` like `["descriptive_statistics", "correlation"]` which the backend pipeline didn't recognize — it only runs `profiling`/`analytics`/`visualization`/`insights`. So the pipeline ran zero stages and marked the dataset "completed" with nothing stored. |
| **Root cause** | Frontend/backend contract mismatch: the page's analysis option IDs didn't map to any pipeline stage. |
| **Fix** | Added `TYPE_ALIASES` in the backend mapping page-facing names (`descriptive_statistics`, `correlation`, `regression`, `classification`, `clustering`, `forecasting`, `feature_importance`) onto implemented stages. Frontend now reflects real stage completion and renders the actual stored results (health score, KPI count, chart count) instead of empty placeholders. |
| **Verification** | Start with page-type names → backend resolves to `["analytics"]` → completes → results returned. ✅ |

---

### BUG-06: Dataset delete on the list page never called the API (MEDIUM)

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | `frontend/app/datasets/page.tsx` |
| **Symptom** | Deleting a dataset from the Datasets grid removed it from the UI but it reappeared on refresh — nothing was deleted on the server. |
| **Root cause** | `handleDelete` only filtered local React state; it never invoked the API's DELETE endpoint. |
| **Fix** | Wired `useDeleteDataset()` into the delete flow; calls the API, removes from state on success, disables the button while pending. |
| **Verification** | Delete via UI → API DELETE returns 200 → dataset gone from list and server. ✅ |

---

### BUG-07: Visualization Studio rendered static placeholders, not real charts (MEDIUM)

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | `frontend/app/visualizations/page.tsx` |
| **Symptom** | After generating a chart in the Visualization Studio, the gallery showed a generic "Chart generated successfully" placeholder instead of the actual Plotly chart returned by the API. |
| **Root cause** | The page discarded the API's `data`/`layout` response and rendered a static gradient box. |
| **Fix** | Store the returned chart spec (`data`, `layout`) in `SavedChart` and render it with `react-plotly.js` (matching the dashboard's `ChartCard` pattern). |
| **Verification** | Generated bar/pie/histogram charts render real Plotly figures in the gallery. ✅ |

---

### BUG-08: Visualization Studio blocked single-axis charts (MEDIUM)

| | |
|---|---|
| **Severity** | 🟡 Medium |
| **File** | `frontend/app/visualizations/page.tsx` |
| **Symptom** | The Generate button was disabled unless BOTH X and Y axes were chosen. Pie, histogram, and heatmap — which only need one axis (or none) — could never be generated. |
| **Root cause** | `canGenerate` unconditionally required `config.xAxis && config.yAxis`. |
| **Fix** | Single-axis chart types (`pie`, `histogram`, `heatmap`) only require X (heatmap requires neither); others require both. |
| **Verification** | Pie with X only → 200. Histogram with X only → 200. Heatmap with no axes → 200. ✅ |

---

### BUG-09: Cleaning falsely flagged ID columns as dates (LOW)

| | |
|---|---|
| **Severity** | 🟢 Low |
| **File** | `backend/app/api/routes/cleaning.py` |
| **Symptom** | `customer_id` (values like `C-1001`) was recommended for date conversion because the heuristic flagged any text containing `-` or `/`. |
| **Root cause** | The date-detection heuristic checked only the first value for a `-`/`/` character. |
| **Fix** | Sample up to 100 values; only recommend conversion when ≥90% match a real date pattern (`\d{4}-\d{1,2}-\d{1,2}` or `/`-separated). |
| **Verification** | `customer_id` no longer flagged; `join_date` correctly flagged. ✅ |

---

### BUG-10: Frontend Dockerfile expected missing standalone output (MEDIUM — deploy blocker)

| | |
|---|---|
| **Severity** | 🟡 Medium (Docker deploy only) |
| **File** | `frontend/next.config.ts` |
| **Symptom** | The frontend `Dockerfile` copies `.next/standalone` and runs `server.js`, but `next.config.ts` never set `output: "standalone"`, so the directory was never generated and the Docker build would fail. |
| **Fix** | Added `output: "standalone"` to `next.config.ts`. |
| **Verification** | `next build` now produces `.next/standalone/frontend/server.js`. ✅ |

---

### Minor fixes

| Bug | File | Fix |
|-----|------|-----|
| Export page defaulted to unsupported PDF | `frontend/app/export/page.tsx` | Default now `csv_data` + `markdown_report` (both supported) |

---

## Not Fixed (by design / pre-existing)

| Item | Reason |
|------|--------|
| `test_column_info_invalid` failing | Stale test — asserts a constraint the schema intentionally doesn't enforce |
| `test_sanitize_filename` failing | Stale test — filename is safely sanitized but output format changed |
| Chat 500 without AI key | Environmental — requires provider key or Ollama |
| Auth is a UI mockup | No backend auth implemented in scope |
