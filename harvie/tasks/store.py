"""Durable task_runs store. The queue lives in PostgreSQL so tasks survive
restarts; claiming uses FOR UPDATE SKIP LOCKED so multiple workers never pick
the same task."""

import json
import uuid
from datetime import datetime, timezone

from harvie.core.db import get_db_connection

TASK_STATUSES = {"queued", "running", "waiting_approval", "completed", "failed", "cancelled"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_task(
    user_id: str,
    title: str,
    objective: str,
    *,
    origin_session_id: str | None = None,
    request_id: str | None = None,
    jev_decision: dict | None = None,
) -> dict:
    task_id = uuid.uuid4().hex[:16]
    now = _now()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO task_runs (
                    id, user_id, title, objective, status, thread_id, progress,
                    result_summary, origin_session_id, request_id, jev_decision,
                    created_at, updated_at, completed_at
                ) VALUES (%s, %s, %s, %s, 'queued', '', '[]'::jsonb, NULL, %s, %s, %s::jsonb, %s, %s, NULL)
                RETURNING *
                """,
                (
                    task_id, user_id, title.strip()[:200], objective.strip(),
                    origin_session_id, request_id,
                    json.dumps(jev_decision) if jev_decision else None,
                    now, now,
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def claim_next_task() -> dict | None:
    """Atomically move the oldest queued task to running and return it."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE task_runs SET status = 'running', updated_at = %s
                WHERE id = (
                    SELECT id FROM task_runs
                    WHERE status = 'queued'
                    ORDER BY created_at
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1
                )
                RETURNING *
                """,
                (_now(),),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def get_task(task_id: str, user_id: str | None = None) -> dict | None:
    query = "SELECT * FROM task_runs WHERE id = %s"
    values: list = [task_id]
    if user_id:
        query += " AND user_id = %s"
        values.append(user_id)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query + " LIMIT 1", values)
            row = cur.fetchone()
            return dict(row) if row else None


def list_tasks(user_id: str, *, include_inactive: bool = False, limit: int = 20) -> list[dict]:
    query = "SELECT * FROM task_runs WHERE user_id = %s"
    if not include_inactive:
        query += " AND status IN ('queued', 'running', 'waiting_approval')"
    query += " ORDER BY created_at DESC LIMIT %s"
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id, max(1, min(limit, 100))))
            return [dict(row) for row in cur.fetchall()]


def update_task(task_id: str, **changes) -> dict | None:
    allowed = {"status", "thread_id", "result_summary", "completed_at"}
    updates = {key: value for key, value in changes.items() if key in allowed and value is not None}
    if not updates:
        return get_task(task_id)
    if "status" in updates and updates["status"] not in TASK_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(TASK_STATUSES))}")
    updates["updated_at"] = _now()
    columns = ", ".join(f"{key} = %s" for key in updates)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE task_runs SET {columns} WHERE id = %s",
                [*updates.values(), task_id],
            )
            cur.execute("SELECT * FROM task_runs WHERE id = %s", (task_id,))
            row = cur.fetchone()
            return dict(row) if row else None


def append_progress(task_id: str, step: dict) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE task_runs
                SET progress = progress || %s::jsonb, updated_at = %s
                WHERE id = %s
                RETURNING *
                """,
                (json.dumps([step]), _now(), task_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def requeue_stale_running() -> int:
    """Reclaim tasks left 'running' by a dead worker on startup."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE task_runs SET status = 'queued', updated_at = %s WHERE status = 'running'",
                (_now(),),
            )
            return cur.rowcount


def cancel_task(task_id: str, user_id: str) -> dict | None:
    task = get_task(task_id, user_id)
    if not task:
        return None
    if task["status"] in ("completed", "failed", "cancelled"):
        return task
    return update_task(task_id, status="cancelled", completed_at=_now())
