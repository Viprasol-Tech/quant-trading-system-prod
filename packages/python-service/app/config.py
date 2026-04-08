import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application configuration from environment variables."""

    # Application
    app_name: str = "Trading Computation Service"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # Server
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8000))

    # Features
    enable_backtest: bool = True
    enable_signals: bool = True
    enable_ml: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    return Settings()

# Export settings instance
settings = get_settings()
