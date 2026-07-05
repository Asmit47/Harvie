from nexus.core.config import settings
from nexus.core.prompts import build_system_prompt
from nexus.core.state import NexusState, _matches_any


def load_context(state: NexusState) -> NexusState:
    """Build the system prompt and set routing flags for the current turn."""
    user_input = state["user_input"]

    history = list(state.get("conversation_history", []))
    history.append({"role": "user", "content": user_input})

    prompt = build_system_prompt(user_input, {**state, "conversation_history": history})

    return {
        **state,
        "system_prompt": prompt,
        "conversation_history": history,
        "messages": [],
        "daily_checkup_needed": _matches_any(user_input, settings.DAILY_CHECKUP_PHRASES),
    }

