"""Pending actions: outbound work that waits for explicit user approval.

The work lane and the heartbeat propose; the user approves from the feed.
Approval executes through the same rails as live tool calls: curated apps only
run allowlisted actions, directory apps only run their own prefixed slugs.
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone

from harvie.core.db import get_db_connection

logger = logging.getLogger(__name__)

ACTION_STATUSES = {"pending", "approved", "rejected", "expired"}
SLUG = re.compile(r"^[A-Z0-9_]{1,255}$")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_pending_action(
    user_id: str,
    *,
    kind: str,
    app: str,
    tool: str,
    arguments: dict,
    source: str = "task",
    task_id: str | None = None,
) -> dict:
    action_id = uuid.uuid4().hex[:16]
    app = app.strip().lower()
    tool = tool.strip().upper()
    if not app or not SLUG.match(tool):
        raise ValueError("A pending action needs a valid app and tool slug.")
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pending_actions (
                    id, user_id, kind, app, tool, arguments, status, source,
                    task_id, feed_item_id, result, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s::jsonb, 'pending', %s, %s, NULL, NULL, %s, %s)
                RETURNING *
                """,
                (
                    action_id, user_id, kind.strip()[:200], app, tool,
                    json.dumps(arguments or {}), source, task_id, _now(), _now(),
                ),
            )
            row = cur.fetchone()
            return dict(row) if row else {}


def get_pending_action(user_id: str, action_id: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM pending_actions WHERE id = %s AND user_id = %s", (action_id, user_id))
            row = cur.fetchone()
            return dict(row) if row else None


def list_pending_actions(user_id: str, *, status: str = "pending", limit: int = 20) -> list[dict]:
    query = "SELECT * FROM pending_actions WHERE user_id = %s"
    values: list = [user_id]
    if status:
        query += " AND status = %s"
        values.append(status)
    query += " ORDER BY created_at DESC LIMIT %s"
    values.append(max(1, min(limit, 100)))
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, values)
            return [dict(row) for row in cur.fetchall()]


def update_pending_action(user_id: str, action_id: str, **changes) -> dict | None:
    allowed = {"kind", "arguments", "status", "result", "decided_at"}
    updates = {key: value for key, value in changes.items() if key in allowed and value is not None}
    if not updates:
        return get_pending_action(user_id, action_id)
    if "status" in updates and updates["status"] not in ACTION_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(ACTION_STATUSES))}")
    if "arguments" in updates:
        updates["arguments"] = json.dumps(updates["arguments"])
    updates["updated_at"] = _now()
    columns = ", ".join(f"{key} = %s" for key in updates)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE pending_actions SET {columns} WHERE id = %s AND user_id = %s",
                [*updates.values(), action_id, user_id],
            )
            cur.execute("SELECT * FROM pending_actions WHERE id = %s AND user_id = %s", (action_id, user_id))
            row = cur.fetchone()
            return dict(row) if row else None


def decide_pending_action(user_id: str, action_id: str, decision: str) -> dict | None:
    """Set a terminal decision on a still-pending action."""
    action = get_pending_action(user_id, action_id)
    if not action or action["status"] != "pending":
        return action
    if decision not in ("approved", "rejected"):
        raise ValueError("decision must be approved or rejected")
    return update_pending_action(
        user_id, action_id, status=decision, decided_at=_now()
    )


def execute_approved(action: dict) -> str:
    """Run an approved action under the same rails as live tool calls."""
    from harvie.integrations.catalog import CONNECTORS
    from harvie.integrations.composio.directory import known_toolkit
    from harvie.integrations.composio.session import run_action

    app = action["app"]
    tool = action["tool"]
    arguments = action.get("arguments") or {}
    if app in CONNECTORS:
        if tool not in CONNECTORS[app]["tools"]:
            return f"Rejected: {tool} is not an allowlisted {app} action."
    else:
        if not known_toolkit(app):
            return f"Rejected: {app} is not an app Harvie can connect."
        if not tool.startswith(f"{app.upper()}_"):
            return f"Rejected: {tool} does not belong to {app}."
    return run_action(app, tool, arguments)
