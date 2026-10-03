from harvie.core.config import settings
from harvie.memory.persona import get_persona, persona_values


def load_persona() -> dict:
    """Load the authenticated user's persona from PostgreSQL."""
    return persona_values(get_persona()["profile"])


def format_persona(data: dict) -> str:
    """Format only the small, always-on core persona."""
    if not data:
        return "No saved persona yet."
    lines = []
    field_labels = {
        "name": "Name",
        "assistant_name": "Your assistant name (use this instead of Harvie)",
        "job": "Job or role",
        "role": "Role",
        "current_projects": "Current projects",
        "current_focus": "Current focus",
        "goals": "Long-term goals",
        "long_term_goals": "Long-term goals",
        "motivations": "Motivation",
        "working_style": "Working style",
        "decision_making_style": "Decision-making style",
        "communication_preferences": "Communication preferences",
        "communication_style": "Communication style",
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
    return format_persona(load_persona())
