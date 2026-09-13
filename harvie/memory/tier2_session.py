import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from langgraph.checkpoint.sqlite import SqliteSaver

from harvie.core.config import settings

settings.SESSION_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(str(settings.SESSION_DB_PATH), check_same_thread=False)
checkpointer = SqliteSaver(conn)


def generate_session_id() -> str:
    """Create a new session UUID."""
    return uuid.uuid4().hex[:12]


def get_thread_config(session_id: str) -> dict:
    """Build the LangGraph config dict that routes to this session checkpoint."""
    return {"configurable": {"thread_id": f"{settings.HARVIE_USER_ID}:{session_id}"}}


def cleanup_expired_sessions():
    """Delete checkpoint threads older than SESSION_TTL_HOURS."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.SESSION_TTL_HOURS)
        latest_by_thread: dict[str, datetime] = {}
        for checkpoint_tuple in checkpointer.list(None):
            timestamp = checkpoint_tuple.checkpoint.get("ts")
            if not timestamp:
                continue
            observed_at = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            thread_id = checkpoint_tuple.config["configurable"]["thread_id"]
            latest_by_thread[thread_id] = max(latest_by_thread.get(thread_id, observed_at), observed_at)

        expired = [thread_id for thread_id, updated_at in latest_by_thread.items() if updated_at < cutoff]
        if not expired:
            return
        cleanup_conn = sqlite3.connect(str(settings.SESSION_DB_PATH))
        cursor = cleanup_conn.cursor()
        placeholders = ", ".join("?" for _ in expired)
        cursor.execute(f"DELETE FROM writes WHERE thread_id IN ({placeholders})", expired)
        cursor.execute(f"DELETE FROM checkpoints WHERE thread_id IN ({placeholders})", expired)
        deleted = cursor.rowcount
        cleanup_conn.commit()
        cleanup_conn.close()
        if deleted > 0:
            print(f"Cleaned up {deleted} expired checkpoint rows.")
    except Exception as exc:
        print(f"Session cleanup skipped: {exc}")


def get_tier2_context(state: dict) -> str:
    """Format bounded session context, including any durable session summary."""
    history = state.get("conversation_history", [])
    current_task = state.get("current_task", "")
    summary = state.get("session_summary", "")

    parts = []
    if current_task:
        parts.append(f"Current task: {current_task}")
    if summary:
        parts.append(f"Session summary:\n{summary}")

    if history:
        parts.append("Recent conversation:")
        for turn in history:
            role = turn.get("role", "unknown")
            content = turn.get("content", "")
            label = "You" if role == "user" else "Harvie"
            parts.append(f"  [{label}]: {content}")
    else:
        parts.append("No conversation history yet (new session).")

    context = "\n".join(parts)
    if len(context) > settings.SESSION_CONTEXT_MAX_CHARS:
        return context[: settings.SESSION_CONTEXT_MAX_CHARS - 20] + "\n... [truncated]"
    return context


cleanup_expired_sessions()
