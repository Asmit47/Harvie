from datetime import datetime, timezone
import sys

from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable

from nexus.core.graph import compiled_graph
from nexus.core.llm import fallback_llm
from nexus.integrations.composio.session import IntegrationError, session_manager
from nexus.memory.tier2_session import generate_session_id, get_thread_config
from nexus.memory.tier3_knowledge import knowledge_base

SESSION_ID = generate_session_id()


def ask_nexus(user_input: str, session_id: str | None = None) -> str:
    """Send a question to Nexus and get the final answer."""
    sid = session_id or SESSION_ID
    config = get_thread_config(sid)
    result = compiled_graph.invoke({"user_input": user_input}, config=config)
    return result["final_answer"]


@traceable
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
    summary = fallback_llm.invoke(messages).content

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


AUTH_TOOLKITS = {
    "gmail": "gmail",
    "calendar": "googlecalendar",
    "google_calendar": "googlecalendar",
    "googlecalendar": "googlecalendar",
}


def auth_toolkit(name: str) -> int:
    """Print an authorization URL for a Google Workspace toolkit."""
    toolkit = AUTH_TOOLKITS.get(name)
    if not toolkit:
        valid = ", ".join(sorted(AUTH_TOOLKITS))
        print(f"Unknown auth target: {name}. Use one of: {valid}.")
        return 2

    try:
        flow = session_manager.start_authentication(toolkit)
        if flow.connected:
            print(f"{name} is already connected.")
            return 0
    except IntegrationError as exc:
        print(session_manager.structured_error(exc, toolkit))
        return 1

    print(f"Open this URL to connect {name}:")
    print(flow.authorization_url)
    input("Press Enter after authorization completes...")

    # Use the SDK's built-in polling for a robust post-auth check.
    if session_manager.wait_for_connection(flow.connection_request, timeout=30.0):
        print(f"{name} connected successfully.")
        return 0

    # Fallback: single check in case the connection raced ahead.
    try:
        if session_manager.is_connected(toolkit):
            print(f"{name} connected successfully.")
            return 0
    except IntegrationError as exc:
        print(session_manager.structured_error(exc, toolkit))
        return 1

    print(f"{name} is still not connected. Complete authorization and retry.")
    return 1


def main(argv: list[str] | None = None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if argv[:1] == ["auth"]:
        if len(argv) != 2:
            print("Usage: python -m nexus auth gmail|calendar")
            raise SystemExit(2)
        raise SystemExit(auth_toolkit(argv[1]))

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
