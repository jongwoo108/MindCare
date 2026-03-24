from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "MindCare AI"
    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    debug: bool = True

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-2024-08-06"
    openai_model_dev: str = "gpt-4o-mini"

    # Database
    database_url: str = "postgresql+asyncpg://mindcare:mindcare_dev_password@postgres:5432/mindcare"
    redis_url: str = "redis://redis:6379/0"

    # Security
    jwt_secret_key: str = "change-me-jwt-secret"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # Safety thresholds (SAFETY_PROTOCOL.md 기준)
    crisis_risk_threshold: int = 7
    expert_review_threshold: int = 6

    # ChromaDB (Long-term Memory)
    chroma_host: str = "chromadb"
    chroma_port: int = 8000

    # Monitoring
    log_level: str = "INFO"

    @property
    def active_model(self) -> str:
        """개발 환경에서는 비용 절감을 위해 mini 모델 사용."""
        if self.app_env == "development":
            return self.openai_model_dev
        return self.openai_model


@lru_cache
def get_settings() -> Settings:
    return Settings()
