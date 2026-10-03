import uuid
from datetime import datetime, timedelta, timezone

from langgraph.checkpoint.postgres import PostgresSaver

from harvie.core.config import settings
from harvie.core.db import pool

checkpointer = PostgresSaver(pool)


def generate_session_id() -> str:
    """Create a new session UUID."""
    return uuid.uuid4().hex[:12]


def get_thread_config(session_id: str) -> dict:
    """Build the LangGraph config dict that routes to this session checkpoint."""
    return {"configurable": {"thread_id": f"{settings.HARVIE_USER_ID}:{session_id}"}}


def cleanup_expired_sessions() -> None:
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

        # The welcome transcript is also the resumable onboarding state. Keep it
        # until the user explicitly deletes it, including after completion.
        expired = [
            thread_id for thread_id, updated_at in latest_by_thread.items()
            if updated_at < cutoff and not thread_id.endswith(":welcome")
        ]
        if not expired:
            return
        for thread_id in expired:
            checkpointer.delete_thread(thread_id)
        print(f"Cleaned up {len(expired)} expired session threads.")
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

    limit = settings.SESSION_CONTEXT_MAX_CHARS
    if not history:
        return "\n".join(parts + ["No conversation history yet (new session)."])[:limit]

    # The welcome thread can live indefinitely. Bound model context using its
    # newest turns, while keeping the complete transcript in the checkpoint.
    prefix = "\n".join(parts)[: limit // 2]
    heading = "Recent conversation:"
    omitted = "... [older turns omitted]"
    budget = max(0, limit - len(prefix) - len(heading) - len(omitted) - 3)
    recent = []
    for turn in reversed(history):
        label = "You" if turn.get("role") == "user" else "Harvie"
        line = f"  [{label}]: {turn.get('content', '')}"
        if len(line) + 1 > budget:
            if not recent and budget > 20:
                recent.append(line[: budget - 16] + "... [truncated]")
            break
        recent.append(line)
        budget -= len(line) + 1
    recent.reverse()
    lines = ([prefix] if prefix else []) + [heading]
    if len(recent) < len(history):
        lines.append(omitted)
    return "\n".join(lines + recent)[:limit]
