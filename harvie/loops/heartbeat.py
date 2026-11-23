"""The heartbeat: Harvie checks in on the user's work on its own.

Each sweep visits every active user, observes only the sources Jev picks,
diffs against the last observation (event_snapshots), and decides with Jev
whether anything is worth surfacing. Harvie's own records (open loops) update
automatically; anything that touches the outside world becomes a pending
action awaiting approval in the feed. Quiet hours and learned preferences
are respected: no pings for the sake of pinging.
"""

import hashlib
import json
import logging
from datetime import datetime, timezone

from harvie.core.config import settings
from harvie.core.db import get_db_connection
from harvie.core.identity import reset_request_user_id, set_request_user_id
from harvie.core.jev import select_sources
from harvie.core.turns import now_iso
from harvie.memory.feed import create_feed_item
from harvie.memory.operational import attention_open_loops, create_open_loop
from harvie.memory.pending_actions import create_pending_action
from harvie.memory.persona import get_persona, preference_values

logger = logging.getLogger(__name__)

OBSERVERS = {}


def observer(source: str):
    def register(fn):
        OBSERVERS[source] = fn
        return fn
    return register


@observer("calendar")
def _observe_calendar(user_id: str) -> list[dict]:
    from harvie.integrations.google_calendar.provider import google_calendar_provider

    raw = google_calendar_provider.list_todays_events(max_results=10)
    items = _json_items(raw, ("id", "summary", "start", "end"))
    return items or [{"external_id": "calendar-unparsed", "payload": _clip(raw)}]


@observer("gmail")
def _observe_gmail(user_id: str) -> list[dict]:
    from harvie.integrations.gmail.provider import gmail_provider

    raw = gmail_provider.search_emails("is:unread newer_than:1d", max_results=5)
    items = _json_items(raw, ("id", "subject", "from"))
    return items or [{"external_id": "gmail-unparsed", "payload": _clip(raw)}]


@observer("tasks")
def _observe_tasks(user_id: str) -> list[dict]:
    from harvie.integrations.google_tasks.provider import google_tasks_provider

    raw = google_tasks_provider.list_tasks(max_tasks=20)
    items = _json_items(raw, ("id", "title", "due"))
    return items or [{"external_id": "tasks-unparsed", "payload": _clip(raw)}]


@observer("stripe")
def _observe_stripe(user_id: str) -> list[dict]:
    from harvie.integrations.stripe.provider import stripe_provider

    raw = stripe_provider.list_invoices(status="open", limit=10)
    items = _json_items(raw, ("id", "customer", "amount_due", "due_date"))
    return items or [{"external_id": "stripe-unparsed", "payload": _clip(raw)}]


def _clip(raw: str, limit: int = 800) -> str:
    return (raw or "")[:limit]


def _json_items(raw: str, fields: tuple[str, ...]) -> list[dict]:
    """Pull item lists out of Composio JSON results; tolerate any shape."""
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return []
    if isinstance(data, dict):
        for key in ("data", "items", "results", "events", "messages", "invoices", "tasks"):
            value = data.get(key)
            if isinstance(value, list):
                data = value
                break
        else:
            return []
    if not isinstance(data, list):
        return []
    items = []
    for index, entry in enumerate(data[:30]):
        if not isinstance(entry, dict):
            continue
        external_id = str(entry.get("id") or entry.get("message_id") or f"item-{index}")
        payload = {field: entry.get(field) for field in fields if entry.get(field) is not None}
        if not payload:
            payload = {"summary": json.dumps(entry)[:400]}
        items.append({"external_id": external_id[:250], "payload": json.dumps(payload)[:1000]})
    return items


def _active_user_ids() -> list[str]:
    """Users with a persona profile - the canonical active set."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM persona_profiles LIMIT 500")
            return [row["user_id"] for row in cur.fetchall()]


def _try_user_lock(user_id: str):
    """Take the conversation advisory lock without waiting.

    Returns an open connection holding the lock, or None when a chat turn or
    task is already working with this user.
    """
    try:
        from psycopg import connect

        conn = connect(settings.NORMALIZED_DATABASE_URL, autocommit=True)
        with conn.cursor() as cur:
            cur.execute("SELECT pg_try_advisory_lock(hashtextextended(%s, 0))", (f"harvie:conversation:{user_id}",))
            locked = bool(cur.fetchone()[0])
        if locked:
            return conn
        conn.close()
        return None
    except Exception:
        logger.info("Could not take heartbeat lock for %s", user_id, exc_info=True)
        return None


def _in_quiet_hours(preferences: dict) -> bool:
    window = str(preferences.get("proactive.quiet_hours", "") or "").strip()
    if "-" not in window:
        return False
    try:
        start_h, start_m = (int(part) for part in window.split("-")[0].split(":")[:2])
        end_h, end_m = (int(part) for part in window.split("-")[1].split(":")[:2])
    except ValueError:
        return False
    now = datetime.now(timezone.utc)
    minutes = now.hour * 60 + now.minute
    start, end = start_h * 60 + start_m, end_h * 60 + end_m
    if start <= end:
        return start <= minutes < end
    return minutes >= start or minutes < end


def _last_observation(user_id: str, source: str) -> dict[str, str]:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT external_id, payload FROM event_snapshots WHERE user_id = %s AND provider = %s",
                (user_id, source),
            )
            return {row["external_id"]: row["payload"] for row in cur.fetchall()}


def _save_observations(user_id: str, source: str, items: list[dict]) -> None:
    now = now_iso()
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for item in items:
                cur.execute(
                    """
                    INSERT INTO event_snapshots (id, user_id, provider, external_id, payload, observed_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, provider, external_id) DO UPDATE
                        SET payload = EXCLUDED.payload, observed_at = EXCLUDED.observed_at
                    """,
                    (
                        hashlib.sha1(f"{user_id}:{source}:{item['external_id']}".encode()).hexdigest()[:32],
                        user_id, source, item["external_id"], item["payload"], now,
                    ),
                )


def _diff(user_id: str, source: str, items: list[dict]) -> tuple[list[dict], list[dict]]:
    """Return (new_items, changed_items) versus the last observation."""
    previous = _last_observation(user_id, source)
    fresh, changed = [], []
    for item in items:
        old = previous.get(item["external_id"])
        if old is None:
            fresh.append(item)
        elif old != item["payload"]:
            changed.append(item)
    return fresh, changed


_TRIAGE_QUESTIONS = {
    "surface": {"type": "noul", "instructions": "This change is worth telling the user about right now, given it affects their work; routine noise is not"},
    "action": {
        "type": "choice",
        "instructions": "What should Harvie do about it",
        "criteria": {
            "ignore": "Nothing needed",
            "nudge": "Tell the user in the feed",
            "track": "Create or update an open loop so it isn't forgotten",
            "draft": "Prepare a concrete outbound action for approval",
        },
    },
    "priority": {
        "type": "score",
        "instructions": "How much it matters to the user",
        "criteria": ["Minor", "Worth knowing", "Important", "Cannot be missed"],
    },
}


def _triage(user_id: str, findings: list[dict], preferences: dict) -> list[dict]:
    """Jev decides what's worth surfacing. Returns per-finding decisions."""
    from harvie.core.jev import jev_evaluate

    state = (
        f"User preference hints: {json.dumps(preferences)[:300]}. "
        "For each numbered finding decide whether Harvie should surface it now."
    )
    numbered = "\n".join(
        f"{index + 1}. [{item['source']}] {item['summary'][:300]}"
        for index, item in enumerate(findings[:12])
    )
    questions = {str(index + 1): _TRIAGE_QUESTIONS for index in range(min(len(findings), 12))}
    answers = jev_evaluate(f"{state}\nFindings:\n{numbered}", questions)
    decisions = []
    for index, item in enumerate(findings):
        answer = (answers or {}).get(str(index + 1)) or {}
        action = answer.get("action", {}).get("choice") if isinstance(answer.get("action"), dict) else None
        try:
            priority = int(round(float(answer.get("priority", {}).get("score", 1))))
        except (TypeError, ValueError, AttributeError):
            priority = 1
        try:
            surface = float(answer.get("surface", {}).get("noul", 0)) >= 0.5
        except (TypeError, ValueError, AttributeError):
            surface = False
        decisions.append({
            "surface": surface,
            "action": action if action in ("ignore", "nudge", "track", "draft") else ("nudge" if surface else "ignore"),
            "priority": max(0, min(priority, 3)),
        })
    return decisions


_PRIORITY_LABELS = {0: "low", 1: "low", 2: "medium", 3: "high"}


def _act(user_id: str, item: dict, decision: dict, preferences: dict) -> bool:
    """Apply one triage decision. Returns True when a feed item was created."""
    if decision["action"] == "ignore":
        return False
    priority = _PRIORITY_LABELS[decision["priority"]]
    summary = item["summary"][:400]
    dedup = f"{decision['action']}:{item['source']}:{item['external_id']}"
    if decision["action"] == "track":
        try:
            loop = create_open_loop(
                item["title"][:200],
                loop_type="follow_up",
                details=summary,
                source_type="heartbeat",
                source_id=f"{item['source']}:{item['external_id']}",
            )
        except Exception:
            logger.info("Could not create loop from heartbeat finding", exc_info=True)
            return False
        created = create_feed_item(
            user_id, "update",
            f"Tracking: {item['title'][:120]}",
            body=summary, priority=priority,
            open_loop_id=loop.get("id"),
            dedup_key=dedup,
        )
        return created is not None
    if decision["action"] == "draft":
        try:
            action = create_pending_action(
                user_id,
                kind=f"Review this from {item['source']}: {item['title'][:120]}",
                app="", tool="", arguments={},
                source="heartbeat",
            )
        except Exception:
            logger.info("Could not create pending action from heartbeat", exc_info=True)
            return False
        created = create_feed_item(
            user_id, "nudge",
            item["title"][:200],
            body=summary, priority=priority,
            pending_action_id=action["id"],
            dedup_key=dedup,
        )
        return created is not None
    created = create_feed_item(
        user_id, "nudge",
        item["title"][:200],
        body=summary, priority=priority,
        dedup_key=dedup,
    )
    return created is not None


def run_heartbeat_for_user(user_id: str) -> int:
    """One user's checkup. Returns how many feed items were created."""
    persona = get_persona(user_id)
    preferences = preference_values(user_id)
    if str(preferences.get("proactive.enabled", "true")).lower() in ("false", "no", "off"):
        return 0
    if _in_quiet_hours(preferences):
        return 0

    connected_sources = [source for source in ("calendar", "gmail", "tasks", "stripe") if source in OBSERVERS]
    chosen = select_sources(
        user_id,
        connected_sources,
        f"job={persona['profile'].get('job', {}).get('value', '')}; projects={persona['profile'].get('current_projects', {}).get('value', '')}",
    )

    findings: list[dict] = []
    for source in chosen:
        observer_fn = OBSERVERS.get(source)
        if not observer_fn:
            continue
        try:
            items = observer_fn(user_id)
        except Exception:
            logger.info("heartbeat observe failed user=%s source=%s", user_id, source, exc_info=True)
            continue
        if not items:
            continue
        fresh, changed = _diff(user_id, source, items)
        _save_observations(user_id, source, items)
        for item in fresh:
            findings.append({"source": source, "external_id": item["external_id"], "title": f"New in {source}: {item['external_id']}", "summary": item["payload"]})
        for item in changed:
            findings.append({"source": source, "external_id": item["external_id"], "title": f"Changed in {source}: {item['external_id']}", "summary": item["payload"]})

    due = attention_open_loops()
    for loop in due[:3]:
        findings.append({"source": "open_loops", "external_id": f"loop-{loop['id']}", "title": f"Due: {loop['title']}", "summary": loop.get("details") or loop["title"]})

    if not findings:
        return 0

    created = 0
    for item, decision in zip(findings[:12], _triage(user_id, findings, preferences)):
        if _act(user_id, item, decision, preferences):
            created += 1
    return created


def run_heartbeat_sweep() -> int:
    """Heartbeat across every active user."""
    if not settings.LOOP_ENABLED:
        return 0
    cutoff = datetime.now(timezone.utc).isoformat()
    total = 0
    for user_id in _active_user_ids():
        conn = _try_user_lock(user_id)
        if conn is None:
            continue  # a chat turn or task holds the conversation; skip silently
        token = set_request_user_id(user_id)
        try:
            total += run_heartbeat_for_user(user_id)
        except Exception:
            logger.info("heartbeat failed for user %s", user_id, exc_info=True)
        finally:
            reset_request_user_id(token)
            try:
                conn.close()
            except Exception:
                pass
    logger.info("Heartbeat sweep finished at %s, %s items", cutoff, total)
    return total
