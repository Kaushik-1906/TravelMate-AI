from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SUPPORTED_AI_PROVIDERS = {"demo", "gemini", "openai", "groq"}


class Settings(BaseSettings):
    APP_ENV: str = "development"
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Supabase Settings
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # AI Provider Settings
    # Options: "demo", "gemini", "openai", "groq"
    AI_PROVIDER: str = "demo"
    AI_API_KEY: Optional[str] = None
    AI_MODEL: Optional[str] = None
    # Optional override for OpenAI-compatible endpoints (e.g. Groq, OpenRouter, local LLMs)
    AI_BASE_URL: Optional[str] = None
    AI_TIMEOUT_SECONDS: float = 60.0
    # When live AI fails, return a clearly labelled demo itinerary instead of an error.
    # Disabled by default so failures are visible and never silently presented as live AI output.
    AI_DEMO_FALLBACK: bool = False
    # Maximum number of provider calls per itinerary request (initial + repair retry).
    AI_MAX_ATTEMPTS: int = 2

    # Basic abuse protection for expensive AI endpoints (per client IP).
    RATE_LIMIT_REQUESTS: int = 10
    RATE_LIMIT_WINDOW_SECONDS: int = 600

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("AI_PROVIDER")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        provider = (value or "demo").strip().lower()
        return provider if provider in SUPPORTED_AI_PROVIDERS else "demo"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() == "production"

    @property
    def is_supabase_configured(self) -> bool:
        url = (self.SUPABASE_URL or "").strip()
        key = (self.SUPABASE_ANON_KEY or "").strip()
        return bool(
            url.startswith("https://")
            and key
            and "your-project" not in url
        )

    @property
    def is_live_ai_configured(self) -> bool:
        return bool(
            self.AI_PROVIDER != "demo"
            and self.AI_API_KEY
            and len(self.AI_API_KEY.strip()) > 5
        )

    @property
    def cors_origins(self) -> List[str]:
        """Explicit CORS origins. Wildcards are not combined with credentials."""
        raw = [origin.strip() for origin in (self.FRONTEND_ORIGIN or "").split(",") if origin.strip()]
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        # Preserve order while removing duplicates.
        return list(dict.fromkeys(raw + defaults))


settings = Settings()
