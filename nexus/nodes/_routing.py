from nexus.core.state import NexusState


def _route_after_context(state: NexusState) -> str:
    if state.get("daily_checkup_needed"):
        return "run_daily_checkup"
    return "generate_answer"


def _route_after_answer(state: NexusState) -> str:
    messages = state.get("messages") or []
    if messages and getattr(messages[-1], "tool_calls", None):
        return "tool_executor"
    return "check_relevance"


def _route_after_relevance(state: NexusState) -> str:
    return "persist_memory" if state.get("relevance_passed") else "repair_answer"

