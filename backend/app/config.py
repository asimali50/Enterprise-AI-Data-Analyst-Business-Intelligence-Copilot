"""
Backend Configuration
Enterprise AI Data Analyst - Config Management
"""
import json
import os
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings from environment variables"""

    # Application
    APP_NAME: str = "Enterprise AI Data Analyst"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

    # Server
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    API_V1_STR: str = "/api/v1"

    # AI Provider Settings
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    GROQ_API_KEY: Optional[str] = os.getenv("GROQ_API_KEY")
    OLLAMA_BASE_URL: Optional[str] = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    # AI Model Configuration
    DEFAULT_AI_PROVIDER: str = os.getenv("DEFAULT_AI_PROVIDER", "openai")
    DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gpt-4-turbo")
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.7"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "4000"))

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")
    DUCKDB_PATH: str = os.getenv("DUCKDB_PATH", "./data/analytics.duckdb")

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "100"))
    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    ALLOWED_EXTENSIONS: list = ["csv", "xlsx", "xls"]
    UPLOAD_DIR: str = "./uploads"

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    @property
    def cors_origins_list(self) -> list:
        """Parse CORS_ORIGINS into a list.

        Accepts both a comma-separated string ("http://a,http://b") and a
        JSON array string ('["http://a","http://b"]'). Whitespace around each
        origin is stripped, and empty entries are dropped so a trailing comma
        doesn't silently add an empty origin.
        """
        raw = self.CORS_ORIGINS.strip()
        if raw.startswith("["):
            try:
                loaded = json.loads(raw)
                if isinstance(loaded, list):
                    return [str(o).strip() for o in loaded if str(o).strip()]
            except json.JSONDecodeError:
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

    # Session
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    SESSION_EXPIRE_HOURS: int = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    def validate_production(self) -> None:
        """Refuse to run in production with insecure settings.

        Called at startup when ENVIRONMENT=production. Prevents accidental
        deploys that ship the default dev secret, leave debug on, or expose a
        wildcard CORS origin.
        """
        if not self.is_production:
            return

        errors: list = []
        if self.SECRET_KEY == "dev-secret-key-change-in-production":
            errors.append("SECRET_KEY is still set to the insecure development default")
        if self.DEBUG:
            errors.append("DEBUG is True — must be False in production")
        if "*" in self.cors_origins_list:
            errors.append("CORS_ORIGINS includes '*' — must be restricted in production")

        if errors:
            raise RuntimeError(
                "Refusing to start in production with insecure configuration:\n- "
                + "\n- ".join(errors)
            )

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT in ("production", "prod")

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
