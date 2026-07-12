import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from langgraph.checkpoint.sqlite import SqliteSaver

from nexus.core.config import settings

settings.SESSION_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(str(settings.SESSION_DB_PATH), check_same_thread=False)
checkpointer = SqliteSaver(conn)


def generate_session_id() -> str:
    """Create a new session UUID."""
    return uuid.uuid4().hex[:12]


def get_thread_config(session_id: str) -> dict:
    """Build the LangGraph config dict that routes to this session checkpoint."""
    return {"configurable": {"thread_id": f"{settings.NEXUS_USER_ID}:{session_id}"}}


def cleanup_expired_sessions():
    """Delete checkpoint threads older than SESSION_TTL_HOURS."""
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.SESSION_TTL_HOURS)
        cleanup_conn = sqlite3.connect(str(settings.SESSION_DB_PATH))
        cursor = cleanup_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='checkpoints'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(checkpoints)")
            columns = {row[1] for row in cursor.fetchall()}
            if "thread_ts" not in columns:
                cleanup_conn.close()
                return
            cursor.execute(
                "DELETE FROM checkpoints WHERE thread_id IN "
                "(SELECT DISTINCT thread_id FROM checkpoints "
                " WHERE thread_ts < ?)",
                (cutoff.isoformat(),),
            )
            deleted = cursor.rowcount
            cleanup_conn.commit()
            if deleted > 0:
                print(f"Cleaned up {deleted} expired checkpoint rows.")
        cleanup_conn.close()
    except Exception as exc:
        print(f"Session cleanup skipped: {exc}")


def get_tier2_context(state: dict) -> str:
    """Format the session conversation history for prompt injection."""
    history = state.get("conversation_history", [])
    current_task = state.get("current_task", "")

    parts = []
    if current_task:
        parts.append(f"Current task: {current_task}")

    if history:
        parts.append("Recent conversation:")
        for turn in history[-8:]:
            role = turn.get("role", "unknown")
            content = turn.get("content", "")
            label = "You" if role == "user" else "Nexus"
            parts.append(f"  [{label}]: {content}")
    else:
        parts.append("No conversation history yet (new session).")

    return "\n".join(parts)


cleanup_expired_sessions()
