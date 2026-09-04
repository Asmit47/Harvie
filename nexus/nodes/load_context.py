from nexus.core.context import build_context
from nexus.core.prompts import build_system_prompt
from nexus.core.state import NexusState, _matches_any
from nexus.core.config import settings


def load_context(state: NexusState) -> NexusState:
    """Build the system prompt and set routing flags for the current turn."""
    user_input = state["user_input"]

    history = list(state.get("conversation_history", [])) + [{"role": "user", "content": user_input}]
    context = build_context(user_input, {**state, "conversation_history": history})
    prompt = build_system_prompt({**state, "conversation_history": history}, context)

    return {
        **state,
        "system_prompt": prompt,
        "conversation_history": history,
        "request_mode": context["mode"],
        "response_context": context["response_context"],
        "attention_items": context["attention_items"],
        "messages": [],
        "daily_checkup_needed": _matches_any(user_input, settings.DAILY_CHECKUP_PHRASES),
    }
