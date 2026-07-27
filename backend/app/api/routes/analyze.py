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
        finally:
            db.close()

        analysis_id = str(uuid.uuid4())

        # Queue the full multi-agent pipeline as a background task
        background_tasks.add_task(
            _run_analysis_pipeline,
            analysis_id=analysis_id,
            dataset_id=request.dataset_id,
            analysis_types=request.analysis_types,
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
            "analysis_types": request.analysis_types,
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
                # Check if dataset is still processing
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Analysis not found. It may still be queued."
                )

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
                AnalysisResult.dataset_id == dataset_id
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

        results = await analysis_crew.run_full_analysis(
            dataset_id=dataset_id,
            analysis_types=analysis_types,
            provider=provider,
            model=model,
        )

        logger.info(f"Analysis pipeline completed: {analysis_id} in {results.get('processing_time_seconds', 0):.2f}s")

    except Exception as e:
        logger.error(f"Analysis pipeline failed: {analysis_id} - {e}")
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
