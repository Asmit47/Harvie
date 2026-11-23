import os
from pathlib import Path

from dotenv import load_dotenv

from harvie.core.identity import get_request_user_id

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
# Local config lives in .env. Render sets the same names on the service, and
# override keeps a stale shell or previously loaded value from winning.
load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=True)


def _env(key: str, default: str = "") -> str:
    """Like os.getenv but treats empty string as not-set."""
    val = os.getenv(key)
    return val if val else default


def _env_int(key: str, default: int) -> int:
    try:
        return int(_env(key, str(default)))
    except ValueError:
        return default


class Settings:
    DATABASE_URL: str = _env("DATABASE_URL", "")
    DEFAULT_HARVIE_USER_ID: str = _env("HARVIE_USER_ID")
    HARVIE_API_PROXY_SECRET: str = _env("HARVIE_API_PROXY_SECRET", "")
    HARVIE_ALLOWED_ORIGINS: str = _env("HARVIE_ALLOWED_ORIGINS", "")

    @property
    def NORMALIZED_DATABASE_URL(self) -> str:
        """Render supplies postgres://, whereas psycopg prefers postgresql://."""
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            return "postgresql://" + url[len("postgres://"):]
        return url

    @property
    def HARVIE_USER_ID(self) -> str:
        return get_request_user_id() or self.DEFAULT_HARVIE_USER_ID

    SESSION_TTL_HOURS: int = _env_int("SESSION_TTL_HOURS", 48)
    SESSION_CONTEXT_MAX_CHARS: int = _env_int("SESSION_CONTEXT_MAX_CHARS", 12000)
    PERSONA_CONTEXT_MAX_CHARS: int = _env_int("PERSONA_CONTEXT_MAX_CHARS", 3000)
    KNOWLEDGE_THRESHOLD: float = 0.78
    SUPERMEMORY_CONTEXT_LIMIT: int = _env_int("SUPERMEMORY_CONTEXT_LIMIT", 5)
    OPEN_LOOP_CONTEXT_LIMIT: int = _env_int("OPEN_LOOP_CONTEXT_LIMIT", 5)
    ATTENTION_LOOKAHEAD_HOURS: int = _env_int("ATTENTION_LOOKAHEAD_HOURS", 48)

    DAILY_CHECKUP_PHRASES: tuple[str, ...] = (
        "daily checkup",
        "daily check-in",
        "daily briefing",
        "morning briefing",
        "what is on my schedule",
        "check my day",
    )

    GROQ_API_KEY: str = _env("GROQ_API_KEY", "")
    GOOGLE_API_KEY: str = _env("GOOGLE_API_KEY", "")
    SUPERMEMORY_API_KEY: str = _env("SUPERMEMORY_API_KEY", "")
    COMPOSIO_API_KEY: str = _env("COMPOSIO_API_KEY", "")
    COMPOSIO_USER_ID: str = _env("COMPOSIO_USER_ID", "")
    COMPOSIO_CACHE_DIR: str = (
        _env("COMPOSIO_CACHE_DIR", "") or str(PROJECT_ROOT / "data" / "composio-cache")
    )
    GROQ_LLM_MODEL: str = _env("GROQ_LLM_MODEL", "openai/gpt-oss-120b")
    GROQ_QUICK_LLM_MODEL: str = _env("GROQ_QUICK_LLM_MODEL", "openai/gpt-oss-20b")
    GOOGLE_LLM_MODEL: str = _env("GOOGLE_LLM_MODEL", "gemini-3.5-flash")
    NVIDIA_BASE_URL: str = (
        _env("NVIDIA_BASE_URL")
        or _env("NVIDIA_NIM_BASE_URL")
        or ""
    )

    # Jev gatekeeper (TypeSafe AI System One model) for fast typed routing decisions.
    TYPESAFE_API_KEY: str = _env("TYPESAFE_API_KEY", "")
    TYPESAFE_BASE_URL: str = _env("TYPESAFE_BASE_URL", "https://api.codiv.ai").rstrip("/")
    JEV_MODEL: str = _env("JEV_MODEL", "openjev-latest")
    JEV_FALLBACK_MODEL: str = _env("JEV_FALLBACK_MODEL", "laya-1.0")
    JEV_ENABLED: bool = _env("JEV_ENABLED", "true").lower() != "false"
    JEV_TIMEOUT_SECONDS: float = float(_env("JEV_TIMEOUT_SECONDS", "2") or 2)

    # Background work tasks (the work lane).
    TASK_WORKER_ENABLED: bool = _env("TASK_WORKER_ENABLED", "true").lower() != "false"
    TASK_WORKER_POLL_SECONDS: int = _env_int("TASK_WORKER_POLL_SECONDS", 5)
    TASK_MAX_CONCURRENT: int = _env_int("TASK_MAX_CONCURRENT", 2)

    # Proactive loops.
    LOOP_ENABLED: bool = _env("LOOP_ENABLED", "true").lower() != "false"
    LOOP_HEARTBEAT_MINUTES: int = _env_int("LOOP_HEARTBEAT_MINUTES", 30)
    LOOP_BRIEFING_HOUR: int = _env_int("LOOP_BRIEFING_HOUR", 7)
    LOOP_ACTIVE_USER_DAYS: int = _env_int("LOOP_ACTIVE_USER_DAYS", 14)

    # Web search and page extraction (Tavily).
    TAVILY_API_KEY: str = _env("TAVILY_API_KEY", "")


settings = Settings()
