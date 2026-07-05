import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=PROJECT_ROOT / ".env")


class Settings:
    NEXUS_USER_ID: str = os.getenv("NEXUS_USER_ID", "default_user")

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

    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    MEM0_API_KEY: str = os.getenv("MEM0_API_KEY", "")
    SUPERMEMORY_API_KEY: str = os.getenv("SUPERMEMORY_API_KEY", "")
    NEXUS_LLM_MODEL: str = os.getenv("NEXUS_LLM_MODEL", "z-ai/glm-5.2")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "")


settings = Settings()
