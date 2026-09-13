from harvie.core.state import HarvieState


def _route_after_context(state: HarvieState) -> str:
    if state.get("daily_checkup_needed"):
        return "run_daily_checkup"
    return "generate_answer"


def _route_after_answer(state: HarvieState) -> str:
    messages = state.get("messages") or []
    if messages and getattr(messages[-1], "tool_calls", None):
        return "tool_executor"
    return "persist_memory"

