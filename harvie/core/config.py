import os
from pathlib import Path

from dotenv import load_dotenv

from harvie.core.identity import get_request_user_id

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")


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
    DEFAULT_HARVIE_USER_ID: str = _env("HARVIE_USER_ID", "default_user")
    HARVIE_API_PROXY_SECRET: str = _env("HARVIE_API_PROXY_SECRET", "")

    @property
    def HARVIE_USER_ID(self) -> str:
        return get_request_user_id() or self.DEFAULT_HARVIE_USER_ID

    PERSONA_JSON_PATH: Path = PROJECT_ROOT / "harvie" / "memory" / "persona.json"
    SESSION_DB_PATH: Path = PROJECT_ROOT / "data" / "sessions.sqlite"

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
    GOOGLE_LLM_MODEL: str = _env("GOOGLE_LLM_MODEL", "gemini-3.5-flash")
    NVIDIA_BASE_URL: str = (
        _env("NVIDIA_BASE_URL")
        or _env("NVIDIA_NIM_BASE_URL")
        or ""
    )


settings = Settings()
