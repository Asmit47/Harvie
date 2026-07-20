from langsmith import traceable

from nexus.core.config import settings
from nexus.memory.tier1_persona import get_tier1_context
from nexus.memory.tier2_session import get_tier2_context


def _truncate(text: str, char_budget: int) -> str:
    """Hard-truncate text to a character budget with an ellipsis marker."""
    if len(text) <= char_budget:
        return text
    return text[: char_budget - 20] + "\n... [truncated]"


@traceable
def build_system_prompt(user_input: str, state: dict) -> str:
    """Assemble the final system prompt from the always-on memory tiers."""
    t1 = _truncate(get_tier1_context(user_input), settings.TOKEN_BUDGET["tier1"])
    t2 = _truncate(get_tier2_context(state), settings.TOKEN_BUDGET["tier2"])

    sections = [
        f"## Identity & Patterns (Tier 1)\n{t1}",
        f"## Current Session (Tier 2)\n{t2}",
    ]
    return "\n\n".join(sections)

