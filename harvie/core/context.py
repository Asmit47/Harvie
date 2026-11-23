"""Intent-led context assembly; attention is intentionally kept separate.

A Jev gate decision (harvie.core.jev) selects what gets loaded: persona,
session memory, open loops, and long-term knowledge can each be skipped for
turns that don't need them. Without a decision the loader keeps its original
always-on behavior.
"""

import re
from datetime import datetime, timezone

from harvie.core.config import settings
from harvie.memory.operational import attention_open_loops, list_open_loops
from harvie.memory.tier1_persona import get_tier1_context
from harvie.memory.tier2_session import get_tier2_context
from harvie.memory.tier3_knowledge import knowledge_base


def detect_request_mode(text: str) -> str:
    value = text.lower()
    if any(word in value for word in ("research", "compare", "investigate", "why does", "analyze")):
        return "research"
    if any(word in value for word in ("status", "checkup", "what's due", "what is due", "open loop", "follow up", "follow-up")):
        return "status"
    if any(word in value for word in ("add", "create", "complete", "snooze", "schedule", "send", "draft")):
        return "action"
    if "?" in value or value.startswith(("what", "who", "when", "where", "how")):
        return "answer"
    return "chat"


def _needs_knowledge(text: str, mode: str) -> bool:
    return mode == "research" or bool(re.search(r"\b(remember|decided|previous|past|preference|project|history)\b", text, re.I))


def _relevant_loops(text: str, mode: str, needs_loops: str = "relevant") -> list[dict]:
    if needs_loops == "none":
        return []
    if mode == "status" or needs_loops == "all":
        return list_open_loops(limit=settings.OPEN_LOOP_CONTEXT_LIMIT)
    words = [word for word in re.findall(r"[\w-]{4,}", text.lower()) if word not in {"that", "this", "with", "from", "what", "when"}]
    if mode == "action" or not words:
        return []
    matches = list_open_loops(query=words[0], limit=settings.OPEN_LOOP_CONTEXT_LIMIT)
    return matches


def _attention_item(loop: dict) -> dict:
    due = loop["due_at"]
    overdue = due < datetime.now(timezone.utc).isoformat()
    return {"id": loop["id"], "type": loop["type"], "title": loop["title"], "priority": loop["priority"], "due_at": due,
            "reason": "Overdue open loop" if overdue else "Due soon", "source_id": loop.get("source_id")}


def build_context(user_input: str, state: dict, decision: dict | None = None) -> dict:
    decision = decision or {}
    mode = decision.get("mode") or detect_request_mode(user_input)

    response_context: dict = {}
    if decision.get("needs_persona", True):
        response_context["persona"] = get_tier1_context(user_input)
    response_context["active_session"] = get_tier2_context(state)

    needs_loops = decision.get("needs_loops", "relevant")
    loops = _relevant_loops(user_input, mode, needs_loops)
    if loops:
        response_context["relevant_open_loops"] = loops

    needs_knowledge = decision.get("needs_knowledge")
    if needs_knowledge is None:
        needs_knowledge = _needs_knowledge(user_input, mode)
    if needs_knowledge:
        memories = knowledge_base.search(user_input, limit=settings.SUPERMEMORY_CONTEXT_LIMIT)
        if memories:
            response_context["relevant_long_term_knowledge"] = memories

    return {"mode": mode, "response_context": response_context, "attention_items": [_attention_item(loop) for loop in attention_open_loops()]}
