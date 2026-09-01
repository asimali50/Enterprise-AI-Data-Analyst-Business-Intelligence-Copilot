"""
Export Routes
Enterprise AI Data Analyst - Export API
"""
import io
import json
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from app.utils.logger import logger

router = APIRouter(prefix="/export", tags=["export"])

# Map the frontend Export Center option IDs to real, servable formats.
# Only csv / json / md are implemented; the rest are reported as unsupported
# rather than returning dead URLs.
FORMAT_ALIASES = {
    "csv_data": "csv",
    "json_export": "json",
    "markdown_report": "md",
    "pdf_report": "pdf",
    "html_report": "html",
    "excel_export": "xlsx",
    "charts_png": "png",
    "charts_svg": "svg",
}

SERVABLE_FORMATS = {"csv", "json", "md"}


class ExportRequest(BaseModel):
    formats: List[str]


def _get_dataset(dataset_id: str):
    """Fetch a dataset row or raise 404."""
    from app.database.sqlite_client import get_sqlite
    from app.database.models import Dataset as DatasetModel

    db = get_sqlite().get_session()
    try:
        dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )
        return dataset
    finally:
        db.close()


def _get_table_name(dataset_id: str) -> str:
    return f"dataset_{dataset_id.replace('-', '_')}"


def _get_analysis_results(dataset_id: str) -> Dict[str, Any]:
    """Return stored analysis results keyed by analysis type."""
    from app.database.sqlite_client import get_sqlite
    from app.database.models import AnalysisResult

    db = get_sqlite().get_session()
    try:
        results = db.query(AnalysisResult).filter(
            AnalysisResult.dataset_id == dataset_id,
            AnalysisResult.analysis_type != "pipeline",
        ).all()
        grouped: Dict[str, Any] = {}
        for r in results:
            grouped[r.analysis_type] = r.result_data
        return grouped
    finally:
        db.close()


@router.post("/{dataset_id}")
async def export_analysis(dataset_id: str, request: ExportRequest) -> dict:
    """
    Prepare export URLs for the requested formats.

    Returns real, downloadable URLs for implemented formats (CSV, JSON, Markdown)
    and lists any formats that are not yet available.
    """
    try:
        _get_dataset(dataset_id)

        files = []
        unsupported = []
        for fmt in request.formats:
            real_fmt = FORMAT_ALIASES.get(fmt, fmt)
            if real_fmt in SERVABLE_FORMATS:
                files.append({
                    "format": fmt,
                    "type": real_fmt,
                    "url": f"/api/v1/export/{dataset_id}/{real_fmt}",
                })
            else:
                unsupported.append(fmt)

        if unsupported:
            return {
                "success": False,
                "files": files,
                "unsupported_formats": unsupported,
                "message": (
                    "These formats are not available yet: "
                    f"{', '.join(unsupported)}. Supported: CSV, JSON, Markdown."
                ),
            }

        return {
            "success": True,
            "files": files,
            "message": "Export ready",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dataset_id}/csv")
async def export_csv(dataset_id: str):
    """Download the dataset rows as CSV."""
    try:
        dataset = _get_dataset(dataset_id)

        from app.database.duckdb_client import get_duckdb
        duckdb = get_duckdb()
        table_name = _get_table_name(dataset_id)

        try:
            df = duckdb.query(f'SELECT * FROM "{table_name}"')
        except Exception:
            df = None

        if df is None or df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data available to export"
            )

        csv_data = df.to_csv(index=False)
        safe_stem = Path(dataset.filename).stem or "dataset"
        return StreamingResponse(
            io.StringIO(csv_data),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{safe_stem}.csv"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSV export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dataset_id}/json")
async def export_json(dataset_id: str):
    """Download dataset metadata, preview, and analysis results as JSON."""
    try:
        dataset = _get_dataset(dataset_id)

        payload = {
            "dataset_id": dataset.id,
            "filename": dataset.filename,
            "metadata": {
                "num_rows": dataset.num_rows,
                "num_columns": dataset.num_columns,
                "health_score": dataset.health_score,
                "analysis_status": dataset.analysis_status,
                "upload_date": dataset.upload_date.isoformat() if dataset.upload_date else None,
            },
            "columns": dataset.columns_info,
            "preview": dataset.preview_data,
            "analysis_results": _get_analysis_results(dataset_id),
        }

        safe_stem = Path(dataset.filename).stem or "dataset"
        body = json.dumps(payload, default=str, indent=2)
        return Response(
            content=body,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{safe_stem}.json"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JSON export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dataset_id}/md")
async def export_markdown(dataset_id: str):
    """Download the generated analysis report as Markdown."""
    try:
        dataset = _get_dataset(dataset_id)

        from app.services.report_generator import report_generator_service
        report = report_generator_service.generate_markdown_report(dataset_id)

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not generate report for export"
            )

        safe_stem = Path(dataset.filename).stem or "dataset"
        return Response(
            content=report["content"],
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{safe_stem}_report.md"'},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Markdown export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
