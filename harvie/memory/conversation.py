"""Checkpoint-backed conversation writes, serialized per authenticated user."""

from contextlib import contextmanager
from psycopg import connect
from harvie.core.config import settings
from harvie.core.graph import compiled_graph
from harvie.core.turns import now_iso
from harvie.memory.persona import update_persona
from harvie.memory.tier2_session import get_thread_config


@contextmanager
def conversation_lock():
    """Serialize welcome initialization and turns across tabs and API workers."""
    # Keep lock waiters out of the application's connection pool: graph and
    # persona writes need that pool while the lock is held.
    with connect(settings.NORMALIZED_DATABASE_URL, autocommit=True) as conn, conn.transaction(), conn.cursor() as cur:
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
            (f"harvie:conversation:{settings.HARVIE_USER_ID}",),
        )
        yield


def read_state(session_id: str) -> dict:
    snapshot = compiled_graph.get_state(get_thread_config(session_id))
    return dict(snapshot.values) if snapshot and snapshot.values else {}


def write_state(session_id: str, values: dict, *, preserve_pending: bool = False) -> dict:
    update_node = "persist_memory"
    if preserve_pending:
        snapshot = compiled_graph.get_state(get_thread_config(session_id))
        next_node = snapshot.next[0] if snapshot and snapshot.next else None
        # Attribute a metadata write to a predecessor of the pending node, so
        # an OAuth confirmation doesn't terminate a suspended tool/answer loop.
        update_node = {
            "run_daily_checkup": "load_context",
            "generate_answer": "run_daily_checkup",
            "tool_executor": "generate_answer",
            "persist_memory": "generate_answer",
        }.get(next_node, update_node)
    compiled_graph.update_state(
        get_thread_config(session_id),
        {**values, "session_id": session_id, "session_updated_at": now_iso()},
        as_node=update_node,
    )
    return read_state(session_id)


def flush_profile_update(session_id: str, state: dict) -> dict:
    """Recover a profile write if the previous request stopped after checkpointing."""
    pending = state.get("pending_profile_update")
    if not pending:
        return state
    update_persona(
        pending.get("changes", {}),
        source="onboarding",
        status="confirmed",
        confidence=1.0,
        onboarding_step=pending.get("step"),
        onboarding_complete=pending.get("complete"),
    )
    return write_state(session_id, {"pending_profile_update": None}, preserve_pending=True)
