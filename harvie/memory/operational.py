"""PostgreSQL store for work that outlives an ephemeral chat session."""

import uuid
from datetime import datetime, timedelta, timezone

from harvie.core.config import settings
from harvie.core.db import get_db_connection

LOOP_TYPES = {"task", "commitment", "follow_up", "waiting", "unresolved"}
LOOP_STATUSES = {"open", "completed", "snoozed"}
PRIORITIES = {"low", "medium", "high"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _valid_time(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("time must be ISO 8601") from exc
    return value


def create_open_loop(
    title: str,
    *,
    loop_type: str = "task",
    details: str = "",
    due_at: str | None = None,
    priority: str = "medium",
    source_type: str | None = None,
    source_id: str | None = None,
) -> dict:
    if loop_type not in LOOP_TYPES:
        raise ValueError(f"type must be one of: {', '.join(sorted(LOOP_TYPES))}")
    if priority not in PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(sorted(PRIORITIES))}")
    due_at = _valid_time(due_at)
    now, loop_id = _now(), uuid.uuid4().hex
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO open_loops (
                    id, user_id, type, title, details, status, priority,
                    due_at, snoozed_until, source_type, source_id, created_at, updated_at, completed_at
                ) VALUES (%s, %s, %s, %s, %s, 'open', %s, %s, NULL, %s, %s, %s, %s, NULL)
                """,
                (
                    loop_id,
                    settings.HARVIE_USER_ID,
                    loop_type,
                    title.strip(),
                    details.strip(),
                    priority,
                    due_at,
                    source_type,
                    source_id,
                    now,
                    now,
                ),
            )
            cur.execute("SELECT * FROM open_loops WHERE id = %s", (loop_id,))
            row = cur.fetchone()
            return dict(row) if row else {}


def list_open_loops(*, include_completed: bool = False, query: str = "", limit: int = 50) -> list[dict]:
    sql = "SELECT * FROM open_loops WHERE user_id = %s"
    values: list = [settings.HARVIE_USER_ID]
    if not include_completed:
        sql += " AND status != 'completed'"
    if query.strip():
        sql += " AND (title ILIKE %s OR details ILIKE %s)"
        values.extend([f"%{query.strip()}%", f"%{query.strip()}%"])
    sql += " ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, COALESCE(due_at, '9999') LIMIT %s"
    values.append(max(1, min(limit, 100)))
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, values)
            rows = cur.fetchall()
            return [dict(row) for row in rows]


def update_open_loop(loop_id: str, **changes: str | None) -> dict | None:
    allowed = {"title", "details", "priority", "due_at", "source_type", "source_id", "status", "snoozed_until", "completed_at"}
    updates = {key: value for key, value in changes.items() if key in allowed and value is not None}
    if not updates:
        return get_open_loop(loop_id)
    if "status" in updates and updates["status"] not in LOOP_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(LOOP_STATUSES))}")
    if "priority" in updates and updates["priority"] not in PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(sorted(PRIORITIES))}")
    if "due_at" in updates:
        updates["due_at"] = _valid_time(updates["due_at"])
    if "snoozed_until" in updates:
        updates["snoozed_until"] = _valid_time(updates["snoozed_until"])
    updates["updated_at"] = _now()
    columns = ", ".join(f"{key} = %s" for key in updates)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE open_loops SET {columns} WHERE id = %s AND user_id = %s",
                [*updates.values(), loop_id, settings.HARVIE_USER_ID],
            )
            cur.execute("SELECT * FROM open_loops WHERE id = %s AND user_id = %s", (loop_id, settings.HARVIE_USER_ID))
            row = cur.fetchone()
            return dict(row) if row else None


def get_open_loop(loop_id: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM open_loops WHERE id = %s AND user_id = %s", (loop_id, settings.HARVIE_USER_ID))
            row = cur.fetchone()
            return dict(row) if row else None


def complete_open_loop(loop_id: str) -> dict | None:
    return update_open_loop(loop_id, status="completed", completed_at=_now(), snoozed_until="")


def snooze_open_loop(loop_id: str, until: str) -> dict | None:
    return update_open_loop(loop_id, status="snoozed", snoozed_until=_valid_time(until))


def attention_open_loops() -> list[dict]:
    now = datetime.now(timezone.utc)
    cutoff = (now + timedelta(hours=settings.ATTENTION_LOOKAHEAD_HOURS)).isoformat()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT * FROM open_loops WHERE user_id = %s AND status != 'completed' AND due_at IS NOT NULL
                AND due_at <= %s AND (status != 'snoozed' OR snoozed_until IS NULL OR snoozed_until <= %s)
                ORDER BY due_at LIMIT %s""",
                (settings.HARVIE_USER_ID, cutoff, now.isoformat(), settings.OPEN_LOOP_CONTEXT_LIMIT),
            )
            rows = cur.fetchall()
            return [dict(row) for row in rows]
