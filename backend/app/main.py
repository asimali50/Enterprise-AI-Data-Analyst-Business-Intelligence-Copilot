"""
FastAPI Main Application
Enterprise AI Data Analyst - Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.utils.logger import logger
from app.database.sqlite_client import get_sqlite
from app.database.duckdb_client import get_duckdb
from app.api.routes import upload, health, analyze, chat, report

# Application startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    logger.info("Starting Enterprise AI Data Analyst API")
    try:
        get_sqlite()  # Initialize SQLite
        get_duckdb()  # Initialize DuckDB
        logger.info("Databases initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down application")
    try:
        duckdb_instance = get_duckdb()
        if duckdb_instance:
            duckdb_instance.close()
        logger.info("Application shutdown complete")
    except Exception as e:
        logger.error(f"Shutdown error: {e}")


# Create FastAPI app
settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered analytics platform for data analysis and business intelligence",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(analyze.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(report.router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "api_docs": "/docs",
        "api_base": settings.API_V1_STR
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
