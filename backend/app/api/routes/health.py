"""
Health and Configuration Routes
Enterprise AI Data Analyst - System Endpoints
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from app.utils.logger import logger
from app.services.ai_service import ai_service
from app.config import get_settings

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint - verify API is running"""
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "Enterprise AI Data Analyst",
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service unhealthy"
        )


@router.get("/models")
async def get_available_models() -> dict:
    """Get available AI providers and models"""
    try:
        providers = ai_service.get_available_providers()
        logger.info("Available providers retrieved")
        return providers
    except Exception as e:
        logger.error(f"Error getting models: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/config")
async def get_config() -> dict:
    """Get application configuration (non-sensitive)"""
    try:
        settings = get_settings()
        return {
            "app_name": settings.APP_NAME,
            "app_version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB,
            "allowed_extensions": settings.ALLOWED_EXTENSIONS,
            "api_base": settings.API_V1_STR,
            "default_ai_provider": settings.DEFAULT_AI_PROVIDER,
            "default_model": settings.DEFAULT_MODEL
        }
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
