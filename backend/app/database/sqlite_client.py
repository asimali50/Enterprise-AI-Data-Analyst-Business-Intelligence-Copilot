"""
SQLite Database Client
Enterprise AI Data Analyst - Metadata Database Layer
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from app.config import get_settings
from app.database.models import Base
from app.utils.logger import logger


class SQLiteClient:
    """SQLite wrapper for metadata storage"""

    def __init__(self):
        self.settings = get_settings()
        self.engine = self._create_engine()
        self.SessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )
        self._init_db()

    def _create_engine(self):
        """Create SQLAlchemy engine"""
        db_url = self.settings.DATABASE_URL

        # Use StaticPool for in-memory SQLite in testing
        if "sqlite:///:memory:" in db_url:
            return create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )

        # Regular SQLite
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False},
        )

    def _init_db(self) -> None:
        """Initialize database tables"""
        try:
            Base.metadata.create_all(bind=self.engine)
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            raise

    def get_session(self) -> Session:
        """Get database session"""
        return self.SessionLocal()

    def close(self) -> None:
        """Close database connection"""
        self.engine.dispose()
        logger.info("Database connection closed")


# Global instance
_sqlite_client: SQLiteClient = None


def get_sqlite() -> SQLiteClient:
    """Get or create SQLite client"""
    global _sqlite_client
    if _sqlite_client is None:
        _sqlite_client = SQLiteClient()
    return _sqlite_client


def get_db() -> Session:
    """Dependency for FastAPI - get database session"""
    db = get_sqlite().get_session()
    try:
        yield db
    finally:
        db.close()
