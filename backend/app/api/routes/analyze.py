"""
Analysis Routes
Enterprise AI Data Analyst - Analysis API
"""
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from typing import Optional, List
import time
import uuid
from app.agents.crew import analysis_crew
from app.database.sqlite_client import get_sqlite
from app.database.models import AnalysisResult, Dataset
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.utils.logger import logger

router = APIRouter(prefix="/analyze", tags=["analysis"])

# The Statistical Analysis page lets users pick analyses by name. Those names
# map onto the pipeline stages the backend actually implements. Any unknown
# type is dropped rather than silently running nothing.
TYPE_ALIASES = {
    "descriptive_statistics": "analytics",
    "correlation": "analytics",
    "regression": "analytics",
    "classification": "analytics",
    "clustering": "analytics",
    "forecasting": "analytics",
    "feature_importance": "profiling",
}


def normalize_analysis_types(analysis_types) -> list:
    """Resolve user-facing analysis names to pipeline stage names."""
    if not analysis_types:
        return ["profiling", "analytics", "visualization", "insights"]
    normalized = []
    for t in analysis_types:
        resolved = TYPE_ALIASES.get(t, t)
        if resolved not in normalized:
            normalized.append(resolved)
    return normalized


@router.post("/start")
async def start_analysis(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Start multi-agent analysis of a dataset.

    Queues the full agent pipeline (profiling, analytics, visualization, insights)
    and returns immediately with an analysis_id to poll for status.

    - **dataset_id**: Dataset to analyze
    - **analysis_types**: Types of analysis to perform
    - **ai_provider**: AI provider override (optional)
    - **ai_model**: AI model override (optional)
    """
    try:
        # Validate dataset exists
        db = get_sqlite().get_session()
        try:
            dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
            if not dataset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dataset not found"
                )

            analysis_types = normalize_analysis_types(request.analysis_types)
            analysis_id = str(uuid.uuid4())

            # Persist the analysis_id so /analyze/status/{id} can track it.
            # The background pipeline updates this row as it progresses.
            pipeline_record = AnalysisResult(
                id=analysis_id,
                dataset_id=request.dataset_id,
                analysis_type="pipeline",
                result_data={
                    "status": "queued",
                    "analysis_types": analysis_types,
                    "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                processing_time_seconds=0.0,
            )
            db.add(pipeline_record)
            db.commit()
        finally:
            db.close()

        # Queue the full multi-agent pipeline as a background task
        background_tasks.add_task(
            _run_analysis_pipeline,
            analysis_id=analysis_id,
            dataset_id=request.dataset_id,
            analysis_types=analysis_types,
            provider=request.ai_provider,
            model=request.ai_model,
        )

        logger.info(f"Analysis queued: {analysis_id} for dataset {request.dataset_id}")

        return {
            "success": True,
            "analysis_id": analysis_id,
            "dataset_id": request.dataset_id,
            "status": "queued",
            "message": "Multi-agent analysis pipeline queued successfully",
            "analysis_types": analysis_types,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/status/{analysis_id}")
async def get_analysis_status(analysis_id: str) -> dict:
    """Get analysis status and progress"""
    try:
        db = get_sqlite().get_session()
        try:
            result = db.query(AnalysisResult).filter(
                AnalysisResult.id == analysis_id
            ).first()

            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Analysis not found"
                )

            # The pipeline record's result_data carries the live status.
            if result.analysis_type == "pipeline":
                info = result.result_data or {}
                return {
                    "analysis_id": analysis_id,
                    "dataset_id": result.dataset_id,
                    "analysis_type": "pipeline",
                    "status": info.get("status", "queued"),
                    "analysis_types": info.get("analysis_types", []),
                    "completed_types": info.get("completed_types", []),
                    "error": info.get("error"),
                    "processing_time_seconds": result.processing_time_seconds,
                    "created_at": result.created_at.isoformat() if result.created_at else None,
                }

            return {
                "analysis_id": analysis_id,
                "dataset_id": result.dataset_id,
                "analysis_type": result.analysis_type,
                "status": "completed",
                "processing_time_seconds": result.processing_time_seconds,
                "created_at": result.created_at.isoformat() if result.created_at else None,
            }
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/result/{analysis_id}")
async def get_analysis_result(analysis_id: str) -> dict:
    """Get full analysis results"""
    try:
        db = get_sqlite().get_session()
        try:
            result = db.query(AnalysisResult).filter(
                AnalysisResult.id == analysis_id
            ).first()

            if not result:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Analysis result not found"
                )

            return {
                "analysis_id": analysis_id,
                "dataset_id": result.dataset_id,
                "analysis_type": result.analysis_type,
                "result_data": result.result_data,
                "processing_time_seconds": result.processing_time_seconds,
            }
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting analysis result: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/results/{dataset_id}")
async def get_all_results(dataset_id: str) -> dict:
    """Get all analysis results for a dataset"""
    try:
        db = get_sqlite().get_session()
        try:
            results = db.query(AnalysisResult).filter(
                AnalysisResult.dataset_id == dataset_id,
                AnalysisResult.analysis_type != "pipeline",
            ).all()

            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
            if not dataset:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Dataset not found"
                )

            return {
                "dataset_id": dataset_id,
                "status": dataset.analysis_status,
                "health_score": dataset.health_score,
                "results": [
                    {
                        "analysis_id": r.id,
                        "analysis_type": r.analysis_type,
                        "result_data": r.result_data,
                        "processing_time_seconds": r.processing_time_seconds,
                        "created_at": r.created_at.isoformat() if r.created_at else None,
                    }
                    for r in results
                ],
            }
        finally:
            db.close()

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all results: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


def _update_pipeline_status(
    analysis_id: str,
    dataset_id: str,
    status: str,
    completed_types: Optional[List[str]] = None,
    error: Optional[str] = None,
    processing_time: Optional[float] = None,
) -> None:
    """Update the persisted pipeline record for /analyze/status polling"""
    try:
        db = get_sqlite().get_session()
        try:
            record = db.query(AnalysisResult).filter(
                AnalysisResult.id == analysis_id
            ).first()
            if record:
                # NOTE: build a NEW dict — SQLAlchemy does not detect in-place
                # mutation of a plain JSON column, so assigning the same object
                # back would silently skip the UPDATE.
                info = dict(record.result_data or {})
                info["status"] = status
                if completed_types is not None:
                    info["completed_types"] = completed_types
                if error is not None:
                    info["error"] = error
                record.result_data = info
                if processing_time is not None:
                    record.processing_time_seconds = processing_time
                db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to update pipeline status: {e}")


async def _run_analysis_pipeline(
    analysis_id: str,
    dataset_id: str,
    analysis_types: List[str],
    provider: str = None,
    model: str = None,
) -> None:
    """Background task to run the full multi-agent analysis pipeline"""
    try:
        logger.info(f"Running analysis pipeline: {analysis_id}")

        _update_pipeline_status(analysis_id, dataset_id, "processing", completed_types=[])

        results = await analysis_crew.run_full_analysis(
            dataset_id=dataset_id,
            analysis_types=analysis_types,
            provider=provider,
            model=model,
        )

        processing_time = results.get("processing_time_seconds", 0)
        _update_pipeline_status(
            analysis_id,
            dataset_id,
            "completed",
            completed_types=analysis_types,
            processing_time=processing_time,
        )

        logger.info(f"Analysis pipeline completed: {analysis_id} in {processing_time:.2f}s")

    except Exception as e:
        logger.error(f"Analysis pipeline failed: {analysis_id} - {e}")
        _update_pipeline_status(
            analysis_id,
            dataset_id,
            "failed",
            error=str(e),
        )
        # Update dataset status to failed
        try:
            db = get_sqlite().get_session()
            try:
                dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if dataset:
                    dataset.analysis_status = "failed"
                    dataset.error_message = str(e)
                    db.commit()
            finally:
                db.close()
        except Exception:
            pass
