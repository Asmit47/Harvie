import json
import logging

from nexus.core.config import settings


logger = logging.getLogger(__name__)


def load_persona_json() -> dict:
    """Read the ground-truth persona file. Returns empty dict if missing."""
    if not settings.PERSONA_JSON_PATH.exists():
        print("persona.json not found - using empty persona.")
        return {}
    with open(settings.PERSONA_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def format_persona(data: dict) -> str:
    """Turn the persona dict into a readable text block for the prompt."""
    if not data:
        return "No persona file configured."
    lines = []
    field_labels = {
        "name": "Name",
        "role": "Role",
        "current_projects": "Current projects",
        "long_term_goals": "Long-term goals",
        "motivations": "Motivation",
        "working_style": "Working style",
        "decision_making_style": "Decision_style",
        "communication_preferences": "Communication preferences",
        "tools": "Tools",
        "timezone": "Timezone",
        "custom_notes": "Notes",
    }
    for key, label in field_labels.items():
        value = data.get(key)
        if value is None:
            continue
        if isinstance(value, list):
            lines.append(f"{label}: {', '.join(value)}")
        else:
            lines.append(f"{label}: {value}")
    return "\n".join(lines)


class Mem0Patterns:
    """Thin wrapper around Mem0 for auto-learned behavioral patterns."""

    def __init__(self):
        self.client = None
        self._init_attempted = False
        if not settings.MEM0_API_KEY:
            self._init_attempted = True

    def _ensure_client(self) -> bool:
        if self.client is not None:
            return True
        if self._init_attempted:
            return False
        self._init_attempted = True
        try:
            from mem0 import MemoryClient

            self.client = MemoryClient(api_key=settings.MEM0_API_KEY)
            return True
        except Exception as exc:
            logger.warning("Tier 1B (Mem0): disabled - %s", exc)
            return False

    @property
    def enabled(self) -> bool:
        return self._ensure_client()

    def search(self, query: str = "", *, user_id: str | None = None, limit: int = 6) -> list[str]:
        """Fetch the top-k recent Mem0 memories for the user."""
        if not self.enabled:
            return []
        uid = user_id or settings.NEXUS_USER_ID
        try:
            raw = self.client.get_all(
                filters={"user_id": uid},
                page=1,
                page_size=limit,
            )
        except Exception as exc:
            logger.warning("Mem0 search failed: %s", exc)
            return []
        return self._extract_texts(raw)[:limit]

    def add(self, user_input: str, assistant_answer: str, *, user_id: str | None = None) -> None:
        """Persist a conversation turn so Mem0 can extract patterns."""
        if not self.enabled:
            return
        uid = user_id or settings.NEXUS_USER_ID
        try:
            self.client.add(
                [
                    {"role": "user", "content": user_input},
                    {"role": "assistant", "content": assistant_answer},
                ],
                user_id=uid,
            )
        except Exception as exc:
            logger.warning("Mem0 write failed: %s", exc)

    @staticmethod
    def _extract_texts(raw) -> list[str]:
        """Normalize Mem0's response across API versions."""
        if raw is None:
            return []
        if isinstance(raw, dict):
            raw = raw.get("results") or raw.get("memories") or raw.get("data") or []
        if not isinstance(raw, list):
            raw = [raw]
        texts = []
        for item in raw:
            text = (
                item.get("memory") or item.get("content") or item.get("text")
                if isinstance(item, dict)
                else str(item)
            )
            if text:
                texts.append(text)
        return texts


mem0 = Mem0Patterns()


def get_tier1_context(user_input: str) -> str:
    """Load persona.json and Mem0 patterns into a single formatted block."""
    persona_text = format_persona(load_persona_json())
    patterns = mem0.search(user_id=settings.NEXUS_USER_ID)
    patterns_text = (
        "\n".join(f"- {pattern}" for pattern in patterns)
        if patterns
        else "No learned patterns yet."
    )
    return f"{persona_text}\n\nLearned patterns:\n{patterns_text}"
