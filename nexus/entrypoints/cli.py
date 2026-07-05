from datetime import datetime, timezone

from langchain_core.messages import HumanMessage, SystemMessage

from nexus.core.graph import compiled_graph
from nexus.core.llm import llm
from nexus.memory.tier2_session import generate_session_id, get_thread_config
from nexus.memory.tier3_knowledge import knowledge_base

SESSION_ID = generate_session_id()


def ask_nexus(user_input: str, session_id: str | None = None) -> str:
    """Send a question to Nexus and get the final answer."""
    sid = session_id or SESSION_ID
    config = get_thread_config(sid)
    result = compiled_graph.invoke({"user_input": user_input}, config=config)
    return result["final_answer"]


def close_session(session_id: str | None = None) -> str | None:
    """Summarize the session and write facts worth remembering to Tier 3."""
    sid = session_id or SESSION_ID
    config = get_thread_config(sid)

    try:
        snapshot = compiled_graph.get_state(config)
        state = snapshot.values if snapshot else {}
    except Exception:
        state = {}

    history = state.get("conversation_history", [])
    if not history:
        print("No conversation to summarize.")
        return None

    conversation_text = "\n".join(f"{turn['role'].upper()}: {turn['content']}" for turn in history)
    messages = [
        SystemMessage(
            content=(
                "Summarize this conversation into key decisions, new knowledge, "
                "and action items. Be concise. Use bullet points. "
                "Focus on facts worth remembering long-term."
            )
        ),
        HumanMessage(content=conversation_text),
    ]
    summary = llm.invoke(messages).content

    knowledge_base.add(
        content=summary,
        metadata={
            "type": "session_summary",
            "session_id": sid,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    print(f"Session {sid} summarized and written to Tier 3.")
    print(f"Summary:\n{summary}")
    return summary


def main():
    print("Nexus - type 'exit' to quit.\n")
    session_id = generate_session_id()

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("exit", "quit"):
            close_session(session_id)
            break
        answer = ask_nexus(user_input, session_id=session_id)
        print(f"Nexus: {answer}\n")


if __name__ == "__main__":
    main()

