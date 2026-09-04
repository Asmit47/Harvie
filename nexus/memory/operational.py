"""Small SQLite store for work that outlives an ephemeral chat session."""

import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

from nexus.core.config import settings


LOOP_TYPES = {"task", "commitment", "follow_up", "waiting", "unresolved"}
LOOP_STATUSES = {"open", "completed", "snoozed"}
PRIORITIES = {"low", "medium", "high"}


def _connection() -> sqlite3.Connection:
    settings.SESSION_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(settings.SESSION_DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute(
        """CREATE TABLE IF NOT EXISTS open_loops (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'medium',
        due_at TEXT, snoozed_until TEXT, source_type TEXT, source_id TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT)"""
    )
    conn.execute("CREATE INDEX IF NOT EXISTS open_loops_active ON open_loops(user_id, status, due_at)")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS task_refs (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, external_id TEXT NOT NULL,
        open_loop_id TEXT, url TEXT, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL,
        UNIQUE(user_id, provider, external_id))"""
    )
    conn.execute("CREATE TABLE IF NOT EXISTS agent_state (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)")
    conn.execute(
        """CREATE TABLE IF NOT EXISTS event_snapshots (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, external_id TEXT NOT NULL,
        payload TEXT NOT NULL, observed_at TEXT NOT NULL, expires_at TEXT, UNIQUE(user_id, provider, external_id))"""
    )
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row(row: sqlite3.Row) -> dict:
    return dict(row)


def _valid_time(value: str | None) -> str | None:
    if not value:
        return None
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("time must be ISO 8601") from exc
    return value


def create_open_loop(title: str, *, loop_type: str = "task", details: str = "", due_at: str | None = None,
                     priority: str = "medium", source_type: str | None = None, source_id: str | None = None) -> dict:
    if loop_type not in LOOP_TYPES:
        raise ValueError(f"type must be one of: {', '.join(sorted(LOOP_TYPES))}")
    if priority not in PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(sorted(PRIORITIES))}")
    due_at = _valid_time(due_at)
    now, loop_id = _now(), uuid.uuid4().hex
    with _connection() as conn:
        conn.execute("INSERT INTO open_loops VALUES (?, ?, ?, ?, ?, 'open', ?, ?, NULL, ?, ?, ?, ?, NULL)",
                     (loop_id, settings.NEXUS_USER_ID, loop_type, title.strip(), details.strip(), priority, due_at, source_type, source_id, now, now))
        return _row(conn.execute("SELECT * FROM open_loops WHERE id = ?", (loop_id,)).fetchone())


def list_open_loops(*, include_completed: bool = False, query: str = "", limit: int = 50) -> list[dict]:
    sql = "SELECT * FROM open_loops WHERE user_id = ?"
    values: list = [settings.NEXUS_USER_ID]
    if not include_completed:
        sql += " AND status != 'completed'"
    if query.strip():
        sql += " AND (title LIKE ? OR details LIKE ?)"
        values.extend([f"%{query.strip()}%", f"%{query.strip()}%"])
    sql += " ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, COALESCE(due_at, '9999') LIMIT ?"
    values.append(max(1, min(limit, 100)))
    with _connection() as conn:
        return [_row(row) for row in conn.execute(sql, values).fetchall()]


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
    columns = ", ".join(f"{key} = ?" for key in updates)
    with _connection() as conn:
        conn.execute(f"UPDATE open_loops SET {columns} WHERE id = ? AND user_id = ?", [*updates.values(), loop_id, settings.NEXUS_USER_ID])
        row = conn.execute("SELECT * FROM open_loops WHERE id = ? AND user_id = ?", (loop_id, settings.NEXUS_USER_ID)).fetchone()
        return _row(row) if row else None


def get_open_loop(loop_id: str) -> dict | None:
    with _connection() as conn:
        row = conn.execute("SELECT * FROM open_loops WHERE id = ? AND user_id = ?", (loop_id, settings.NEXUS_USER_ID)).fetchone()
        return _row(row) if row else None


def complete_open_loop(loop_id: str) -> dict | None:
    return update_open_loop(loop_id, status="completed", completed_at=_now(), snoozed_until="")


def snooze_open_loop(loop_id: str, until: str) -> dict | None:
    return update_open_loop(loop_id, status="snoozed", snoozed_until=_valid_time(until))


def attention_open_loops() -> list[dict]:
    now = datetime.now(timezone.utc)
    cutoff = (now + timedelta(hours=settings.ATTENTION_LOOKAHEAD_HOURS)).isoformat()
    with _connection() as conn:
        rows = conn.execute(
            """SELECT * FROM open_loops WHERE user_id = ? AND status != 'completed' AND due_at IS NOT NULL
            AND due_at <= ? AND (status != 'snoozed' OR snoozed_until IS NULL OR snoozed_until <= ?)
            ORDER BY due_at LIMIT ?""", (settings.NEXUS_USER_ID, cutoff, now.isoformat(), settings.OPEN_LOOP_CONTEXT_LIMIT)
        ).fetchall()
    return [_row(row) for row in rows]
