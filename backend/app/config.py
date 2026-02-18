"""
JudiScribe — Configuración central con pydantic-settings.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://judiscribe:judiscribe_secret@localhost:5432/judiscribe"

    # ── Redis ────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Deepgram ─────────────────────────────────────────
    DEEPGRAM_API_KEY: str = ""
    DEEPGRAM_MODEL: str = "nova-3"  # Mejor modelo disponible

    # ── Anthropic ────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"  # Sonnet 4 para mejoramiento en tiempo real

    # ── HuggingFace ──────────────────────────────────────
    HF_TOKEN: str = ""

    # ── JWT ──────────────────────────────────────────────
    JWT_SECRET_KEY: str = "change_me_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Audio ────────────────────────────────────────────
    AUDIO_STORAGE_PATH: str = "/app/audio_files"
    AUDIO_ENCRYPTION_KEY: str = ""
    AUDIO_RETENTION_DAYS: int = 30

    # ── General ──────────────────────────────────────────
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
        "extra": "ignore",
    }

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()
