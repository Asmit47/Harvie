import json
import logging

from nexus.core.config import settings


logger = logging.getLogger(__name__)


def load_persona_json() -> dict:
    """Read persona.json without allowing malformed user data to stop a turn."""
    if not settings.PERSONA_JSON_PATH.exists():
        logger.warning("persona.json not found - using empty persona")
        return {}
    try:
        with open(settings.PERSONA_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Invalid persona.json - using empty persona: %s", exc)
        return {}


def format_persona(data: dict) -> str:
    """Format only the small, always-on core persona."""
    if not data:
        return "No persona file configured."
    lines = []
    field_labels = {
        "name": "Name",
        "role": "Role",
        "current_projects": "Current projects",
        "goals": "Long-term goals",
        "long_term_goals": "Long-term goals",
        "motivations": "Motivation",
        "working_style": "Working style",
        "decision_making_style": "Decision-making style",
        "communication_preferences": "Communication preferences",
        "communication_style": "Communication preferences",
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
    text = "\n".join(lines) or "No persona details configured."
    if len(text) > settings.PERSONA_CONTEXT_MAX_CHARS:
        return text[: settings.PERSONA_CONTEXT_MAX_CHARS - 20] + "\n... [truncated]"
    return text


def get_tier1_context(user_input: str) -> str:
    """Return the deterministic, always-on persona context."""
    return format_persona(load_persona_json())
