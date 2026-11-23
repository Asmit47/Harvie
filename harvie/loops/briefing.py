"""The morning briefing: one rich daily digest per user, in the feed."""

import logging
from datetime import datetime, timezone

from harvie.core.config import settings
from harvie.core.identity import reset_request_user_id, set_request_user_id
from harvie.memory.feed import create_feed_item
from harvie.memory.operational import list_open_loops
from harvie.memory.persona import get_persona, preference_values
from harvie.tasks.store import list_tasks

logger = logging.getLogger(__name__)


def _collect_material(user_id: str, tz_name: str) -> str:
    """Gather schedule, loops, and task statuses for the digest."""
    from harvie.core.jev import select_sources
    from harvie.loops.heartbeat import OBSERVERS

    sections: list[str] = []

    persona = get_persona(user_id)
    job = persona["profile"].get("job", {}).get("value") or ""
    projects = persona["profile"].get("current_projects", {}).get("value") or ""
    if job or projects:
        sections.append(f"Context: job={job}; projects={projects}")

    connected_sources = [source for source in ("calendar", "gmail", "tasks", "stripe") if source in OBSERVERS]
    chosen = select_sources(user_id, connected_sources, f"job={job}; projects={projects}")
    for source in chosen:
        observer_fn = OBSERVERS.get(source)
        if not observer_fn:
            continue
        try:
            raw = observer_fn(user_id)
        except Exception:
            logger.info("briefing observe failed user=%s source=%s", user_id, source, exc_info=True)
            continue
        body = "\n".join(item["payload"] for item in raw[:10])
        if body.strip():
            sections.append(f"{source.title()}:\n{body[:1500]}")

    loops = list_open_loops(limit=10)
    if loops:
        lines = [
            f"- [{loop['priority']}] {loop['title']}" + (f" (due {loop['due_at']})" if loop.get("due_at") else "")
            for loop in loops
        ]
        sections.append("Open loops:\n" + "\n".join(lines))

    tasks = list_tasks(user_id, include_inactive=True, limit=10)
    if tasks:
        lines = [f"- {task['title']}: {task['status'].replace('_', ' ')}" for task in tasks]
        sections.append("Background tasks:\n" + "\n".join(lines))

    return "\n\n".join(sections) or "Nothing on the agenda."


def _digest(user_id: str, material: str) -> str:
    from harvie.core.llm import chat_llm
    from langchain_core.messages import HumanMessage, SystemMessage

    preferences = preference_values(user_id)
    try:
        response = chat_llm.invoke([
            SystemMessage(
                content=(
                    "You write the user's morning briefing for their assistant app. "
                    "2-5 short bullets: today's schedule first, then what needs attention, "
                    "then anything Harvie is tracking or working on. No greetings, no filler, "
                    "no markdown headers. Respect stated preferences: "
                    f"{preferences or 'none yet'}."
                )
            ),
            HumanMessage(content=material[:8000]),
        ])
        return str(response.content).strip()
    except Exception:
        logger.info("briefing digest failed user=%s", user_id, exc_info=True)
        lines = [line for line in material.splitlines() if line.strip()][:12]
        return "\n".join(lines)


def run_briefing_for_user(user_id: str) -> bool:
    persona = get_persona(user_id)
    preferences = preference_values(user_id)
    if str(preferences.get("briefing.enabled", "true")).lower() in ("false", "no", "off"):
        return False

    tz_name = persona["profile"].get("timezone", {}).get("value") or "UTC"
    try:
        from zoneinfo import ZoneInfo

        now = datetime.now(ZoneInfo(tz_name))
    except Exception:
        now = datetime.now(timezone.utc)
    material = _collect_material(user_id, tz_name)
    digest = _digest(user_id, material)
    created = create_feed_item(
        user_id, "briefing",
        f"Your morning briefing - {now.strftime('%A, %B %d')}",
        body=digest, priority="medium",
        dedup_key=f"briefing:{now.strftime('%Y-%m-%d')}",
    )
    return created is not None


def run_morning_briefing() -> int:
    """Brief every active user around the configured hour (per-user timezone
    refinement is a future preference; the sweep runs once daily)."""
    if not settings.LOOP_ENABLED:
        return 0
    from harvie.loops.heartbeat import _active_user_ids

    sent = 0
    for user_id in _active_user_ids():
        token = set_request_user_id(user_id)
        try:
            if run_briefing_for_user(user_id):
                sent += 1
        except Exception:
            logger.info("briefing failed for user %s", user_id, exc_info=True)
        finally:
            reset_request_user_id(token)
    logger.info("Morning briefing sent to %s user(s)", sent)
    return sent
