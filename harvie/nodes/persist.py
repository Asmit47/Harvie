from harvie.core.state import HarvieState
from harvie.core.turns import assistant_turn, now_iso


def persist_memory(state: HarvieState) -> HarvieState:
    """Persist the completed turn to ephemeral session history only."""
    final = state.get("answer", "")

    history = list(state.get("conversation_history", []))
    request_id = state.get("chat_request_id")
    history.append(assistant_turn(
        final,
        source="llm",
        reply_to=f"user:{request_id}" if request_id else None,
    ))

    return {
        **state,
        "final_answer": final,
        "conversation_history": history,
        "session_updated_at": now_iso(),
        "chat_request_id": None,
    }
