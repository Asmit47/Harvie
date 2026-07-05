from typing import Any, List, TypedDict


class NexusState(TypedDict, total=False):
    # Core
    user_input: str
    session_id: str

    # Tier 1
    system_prompt: str

    # Tier 2, persisted by checkpointer
    conversation_history: List[dict]
    current_task: str

    # Tool-call loop
    messages: List[Any]

    # Routing flags
    daily_checkup_needed: bool
    tool_results: List[str]

    # Answer pipeline
    answer: str
    relevance_passed: bool
    relevance_reason: str
    final_answer: str


def _matches_any(text: str, phrases: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in phrases)


def _format_list(items: List[str], fallback: str = "None.") -> str:
    if not items:
        return fallback
    return "\n".join(f"- {item}" for item in items)

