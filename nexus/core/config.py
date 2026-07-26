import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")


def _env(key: str, default: str = "") -> str:
    """Like os.getenv but treats empty string as not-set."""
    val = os.getenv(key)
    return val if val else default


class Settings:
    NEXUS_USER_ID: str = _env("NEXUS_USER_ID", "default_user")

    PERSONA_JSON_PATH: Path = PROJECT_ROOT / "nexus" / "memory" / "persona.json"
    SESSION_DB_PATH: Path = PROJECT_ROOT / "data" / "sessions.sqlite"

    SESSION_TTL_HOURS: int = 48
    KNOWLEDGE_THRESHOLD: float = 0.78
    TOKEN_BUDGET: dict[str, int] = {"tier1": 3200, "tier2": 2400, "tier3": 2400}

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
    MEM0_API_KEY: str = _env("MEM0_API_KEY", "")
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