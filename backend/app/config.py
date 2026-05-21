"""Application configuration settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/rehab_companion"
    GEMINI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    SECRET_KEY: str = "your-jwt-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Redis (for Celery)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Gmail SMTP (email alerts — free, no API key needed)
    GMAIL_SENDER_EMAIL: str = "your-gmail@gmail.com"
    GMAIL_APP_PASSWORD: str = "your-gmail-app-password-here"  # Google App Password (not your real password)

    # Playwright WhatsApp automation
    PLAYWRIGHT_USER_DATA_DIR: str = "./playwright_session"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
