from nexus.core.state import NexusState
from nexus.memory.tier1_persona import mem0


def persist_memory(state: NexusState) -> NexusState:
    """Persist the completed turn to Mem0 and session history."""
    final = state.get("final_answer") or state.get("answer", "")

    mem0.add(state["user_input"], final)

    history = list(state.get("conversation_history", []))
    history.append({"role": "assistant", "content": final})

    return {**state, "final_answer": final, "conversation_history": history}

