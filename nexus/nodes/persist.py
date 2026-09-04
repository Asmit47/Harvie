from nexus.core.state import NexusState


def persist_memory(state: NexusState) -> NexusState:
    """Persist the completed turn to ephemeral session history only."""
    final = state.get("answer", "")

    history = list(state.get("conversation_history", []))
    history.append({"role": "assistant", "content": final})

    return {**state, "final_answer": final, "conversation_history": history}
