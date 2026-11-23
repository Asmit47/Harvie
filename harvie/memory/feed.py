"""The proactive feed: how Harvie reaches the user without being asked.

Everything the background lanes produce - task completions, heartbeat nudges,
briefings, approval requests - becomes a feed item. Items carrying an action
link to a pending_action row the user can approve, reject, or edit.
"""

import json
import uuid
from datetime import datetime, timezone

from harvie.core.db import get_db_connection

FEED_KINDS = {"nudge", "briefing", "alert", "update", "task"}
FEED_PRIORITIES = {"low", "medium", "high"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_feed_item(
    user_id: str,
    kind: str,
    title: str,
    *,
    body: str = "",
    priority: str = "medium",
    data: dict | None = None,
    dedup_key: str | None = None,
    open_loop_id: str | None = None,
    task_id: str | None = None,
    pending_action_id: str | None = None,
) -> dict | None:
    """Insert a feed item; a duplicate dedup_key is silently skipped."""
    if kind not in FEED_KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(FEED_KINDS))}")
    if priority not in FEED_PRIORITIES:
        raise ValueError(f"priority must be one of: {', '.join(sorted(FEED_PRIORITIES))}")
    item_id = uuid.uuid4().hex[:16]
    payload = dict(data or {})
    if pending_action_id:
        payload["pending_action_id"] = pending_action_id
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO feed_items (
                    id, user_id, kind, title, body, priority, data, dedup_key,
                    open_loop_id, task_id, read_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, NULL, %s)
                ON CONFLICT DO NOTHING
                RETURNING *
                """,
                (
                    item_id, user_id, kind, title.strip()[:300], body[:4000], priority,
                    json.dumps(payload), dedup_key, open_loop_id, task_id, _now(),
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def list_feed(user_id: str, *, include_read: bool = False, limit: int = 30) -> list[dict]:
    query = "SELECT * FROM feed_items WHERE user_id = %s"
    if not include_read:
        query += " AND read_at IS NULL"
    query += " ORDER BY created_at DESC LIMIT %s"
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (user_id, max(1, min(limit, 100))))
            return [dict(row) for row in cur.fetchall()]


def unread_count(user_id: str) -> int:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS count FROM feed_items WHERE user_id = %s AND read_at IS NULL", (user_id,))
            row = cur.fetchone()
            return int(row["count"]) if row else 0


def mark_read(user_id: str, item_id: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE feed_items SET read_at = %s WHERE id = %s AND user_id = %s AND read_at IS NULL RETURNING *",
                (_now(), item_id, user_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None


def mark_all_read(user_id: str) -> int:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE feed_items SET read_at = %s WHERE user_id = %s AND read_at IS NULL",
                (_now(), user_id),
            )
            return cur.rowcount


def get_feed_item(user_id: str, item_id: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM feed_items WHERE id = %s AND user_id = %s", (item_id, user_id))
            row = cur.fetchone()
            return dict(row) if row else None


def attach_pending_action(item_id: str, pending_action_id: str) -> None:
    """Link an approval to its feed item so the UI can render action buttons."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE feed_items SET data = data || %s::jsonb WHERE id = %s",
                (json.dumps({"pending_action_id": pending_action_id}), item_id),
            )
