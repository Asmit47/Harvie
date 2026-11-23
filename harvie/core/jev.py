"""Jev gatekeeper: fast typed decisions about what a turn needs.

Jev is a System One model from TypeSafe AI. Instead of generating text it
answers typed questions (choices, rubric scores, and nouls) in one batched
call, so Harvie can decide in ~0.1s what context, tools, and model tier a
turn actually needs - and what to skip.

Every call here is best-effort: if Jev is disabled, unconfigured, slow, or
erroring, callers fall back to the deterministic keyword behavior.
"""

import logging
from dataclasses import dataclass, field

from langsmith import traceable
from typesafe_sdk import RetryPolicy, TypeSafeClient

from harvie.core.config import settings

logger = logging.getLogger(__name__)

# Tool groups Jev can switch on. Keys align with harvie.tools.APP_GROUPS.
GATED_APPS = (
    "gmail",
    "calendar",
    "docs",
    "drive",
    "tasks",
    "slack",
    "stripe",
    "connected_apps",
    "knowledge",
    "open_loops",
    "websearch",
)

_APP_HINTS = {
    "gmail": ("email", "mail", "inbox", "gmail", "message from"),
    "calendar": ("calendar", "meeting", "schedule", "event", "appointment", "call"),
    "docs": ("doc", "document", "docs"),
    "drive": ("drive", "file", "folder"),
    "tasks": ("task list", "google task", "to-do list", "todo list"),
    "slack": ("slack", "channel"),
    "stripe": ("stripe", "invoice", "payment"),
    "connected_apps": ("notion", "github", "hubspot", "asana", "trello", "jira", "linear", "app"),
    "knowledge": ("remember", "decided", "previous", "past", "preference", "project", "history"),
    "open_loops": ("loop", "follow up", "follow-up", "commitment", "waiting"),
    "websearch": ("search the web", "web search", "google", "latest", "news", "research", "look up"),
}

_URGENCY_RUBRIC = [
    "Routine, no time pressure",
    "Should be handled today",
    "Time-sensitive",
    "Urgent, act now",
]


@dataclass
class JevTurnDecision:
    """One gate decision for a chat turn. `source` records where it came from."""

    turn_kind: str = "chat"  # chat | work | status_check
    mode: str = "chat"  # research | status | action | answer | chat
    relevant_apps: set[str] = field(default_factory=set)
    checkup: bool = False
    needs_knowledge: bool = False
    needs_loops: str = "relevant"  # none | relevant | all
    needs_persona: bool = True
    model_tier: str = "deep"  # quick | deep
    has_preference_signal: bool = True
    has_commitment: bool = False
    urgency: int = 1
    source: str = "fallback"

    def to_state(self) -> dict:
        return {
            "turn_kind": self.turn_kind,
            "mode": self.mode,
            "relevant_apps": sorted(self.relevant_apps),
            "checkup": self.checkup,
            "needs_knowledge": self.needs_knowledge,
            "needs_loops": self.needs_loops,
            "needs_persona": self.needs_persona,
            "model_tier": self.model_tier,
            "has_preference_signal": self.has_preference_signal,
            "has_commitment": self.has_commitment,
            "urgency": self.urgency,
            "source": self.source,
        }


def jev_enabled() -> bool:
    return bool(settings.JEV_ENABLED and settings.TYPESAFE_API_KEY)


def _redact_secret_inputs(inputs: dict) -> dict:
    """Drop credentials so the TypeSafe API key never lands in LangSmith."""
    return {
        key: value
        for key, value in inputs.items()
        if "api_key" not in key.lower() and "secret" not in key.lower()
    }


@traceable(name="jev.jev_evaluate", run_type="chain", process_inputs=_redact_secret_inputs)
def jev_evaluate(state: str, questions: dict) -> dict | None:
    """Run one batched Jev evaluation. Returns answers keyed by question name.

    Returns None on any problem (missing key, timeout, bad response) so callers
    can degrade deterministically.
    """
    if not jev_enabled():
        return None
    models = [settings.JEV_MODEL]
    if settings.JEV_FALLBACK_MODEL and settings.JEV_FALLBACK_MODEL != settings.JEV_MODEL:
        models.append(settings.JEV_FALLBACK_MODEL)
    for model in models:
        try:
            with TypeSafeClient(
                api_key=settings.TYPESAFE_API_KEY,
                base_url=settings.TYPESAFE_BASE_URL,
                model=model,
                timeout=settings.JEV_TIMEOUT_SECONDS,
                retry=RetryPolicy(max_retries=0),
            ) as client:
                response = client.system_one(state=state, questions=questions)
            answers = response.raw_http_response.json().get("answers")
            if isinstance(answers, dict):
                return answers
        except Exception:
            logger.info("Jev model %s unavailable", model, exc_info=True)
    logger.info("Jev evaluation unavailable; falling back to keyword gating")
    return None


def _noul(instructions: str) -> dict:
    return {"type": "noul", "instructions": instructions}


def _choice(instructions: str, criteria: dict[str, str]) -> dict:
    return {"type": "choice", "instructions": instructions, "criteria": criteria}


def _score(instructions: str, criteria: list[str]) -> dict:
    return {"type": "score", "instructions": instructions, "criteria": criteria}


def _fallback_decision(user_input: str) -> JevTurnDecision:
    """Deterministic keyword gating, matching Harvie's pre-Jev behavior."""
    from harvie.core.context import detect_request_mode
    from harvie.core.state import _matches_any

    lowered = user_input.lower()
    decision = JevTurnDecision()
    decision.mode = detect_request_mode(user_input)
    decision.relevant_apps = {
        app for app, hints in _APP_HINTS.items() if any(h in lowered for h in hints)
    }
    decision.checkup = _matches_any(user_input, settings.DAILY_CHECKUP_PHRASES)
    decision.needs_knowledge = "knowledge" in decision.relevant_apps or decision.mode == "research"
    decision.needs_loops = "all" if decision.mode == "status" else "relevant"
    # The work/status lanes only activate on a real Jev decision; the fallback
    # keeps pre-Jev behavior where every turn flows through the graph.
    decision.turn_kind = "chat"
    decision.model_tier = "quick" if len(user_input) < 80 and decision.mode in ("chat", "answer") else "deep"
    decision.has_preference_signal = True
    decision.has_commitment = any(
        phrase in lowered
        for phrase in ("remind me", "i'll ", "i will ", "follow up", "by tomorrow", "by friday", "before the")
    )
    return decision


@traceable(name="jev.gate_turn", run_type="chain", process_inputs=_redact_secret_inputs)
def gate_turn(
    user_input: str,
    *,
    session_summary: str = "",
    loop_titles: list[str] | None = None,
) -> JevTurnDecision:
    """Decide everything about a turn in one Jev call: kind, mode, apps to
    load, context sources, model tier, and whether post-turn learning runs."""
    if not user_input.strip():
        return _fallback_decision(user_input)

    state = f"User message: {user_input.strip()[:4000]}"
    if session_summary:
        state += f"\nRecent conversation: {session_summary.strip()[:1000]}"
    if loop_titles:
        state += f"\nTracked open items: {'; '.join(loop_titles[:8])}"

    questions: dict = {
        "turn_kind": _choice(
            "What kind of turn is this",
            {
                "chat": "Conversational reply, question, or quick lookup Harvie answers right now",
                "work": "A delegated multi-step job that should run in the background while the user keeps chatting (research a topic, prepare for a meeting, draft a deliverable, coordinate across apps)",
                "status_check": "The user asks for the status or progress of background work or tracked items",
            },
        ),
        "mode": _choice(
            "The primary intent of the message",
            {
                "research": "Investigate, compare, or analyze something",
                "status": "Check status of work, schedule, or tracked items",
                "action": "Create, update, send, or schedule something concrete",
                "answer": "A question that needs a direct answer",
                "chat": "Conversation, acknowledgement, or small talk",
            },
        ),
        "checkup": _noul("The user is asking for a check-in, briefing, or summary of their day right now"),
        "needs_knowledge": _noul("Recalling long-term saved knowledge from past sessions is needed to handle this well"),
        "needs_loops": _choice(
            "How much of the user's tracked open loops (follow-ups, commitments) to load",
            {
                "none": "Tracked loops are irrelevant here",
                "relevant": "Load loops that plausibly match this message",
                "all": "The message is about the tracked work itself; load all active loops",
            },
        ),
        "needs_persona": _noul("The saved personal profile meaningfully improves this reply (skip for trivial small talk)"),
        "model_tier": _choice(
            "Which model tier this turn deserves",
            {
                "quick": "Short factual or conversational reply a lighter, faster model handles just as well",
                "deep": "Complex reasoning, planning, tool orchestration, or long structured output",
            },
        ),
        "has_preference_signal": _noul("The message reveals a stable preference, working habit, or correction worth remembering about the user"),
        "has_commitment": _noul("The message states a commitment, deadline, promise, or follow-up that should be tracked"),
        "urgency": _score("How time-sensitive this message is", _URGENCY_RUBRIC),
    }
    for app in GATED_APPS:
        questions[f"app_{app}"] = _noul(f"Using {app.replace('_', ' ')} actions is relevant to handle this message")

    answers = jev_evaluate(state, questions)
    if answers is None:
        return _fallback_decision(user_input)

    decision = JevTurnDecision(source="jev")

    kind = answers.get("turn_kind") or {}
    decision.turn_kind = kind.get("choice") if kind.get("choice") in ("chat", "work", "status_check") else "chat"

    mode = answers.get("mode") or {}
    decision.mode = mode.get("choice") if mode.get("choice") in ("research", "status", "action", "answer", "chat") else "chat"

    decision.checkup = bool((answers.get("checkup") or {}).get("noul", 0) >= 0.5)
    decision.needs_knowledge = bool((answers.get("needs_knowledge") or {}).get("noul", 0) >= 0.5)
    loops = answers.get("needs_loops") or {}
    decision.needs_loops = loops.get("choice") if loops.get("choice") in ("none", "relevant", "all") else "relevant"
    decision.needs_persona = bool((answers.get("needs_persona") or {}).get("noul", 1) >= 0.5)
    tier = answers.get("model_tier") or {}
    decision.model_tier = tier.get("choice") if tier.get("choice") in ("quick", "deep") else "deep"
    decision.has_preference_signal = bool((answers.get("has_preference_signal") or {}).get("noul", 1) >= 0.5)
    decision.has_commitment = bool((answers.get("has_commitment") or {}).get("noul", 0) >= 0.5)

    try:
        decision.urgency = int(round(float((answers.get("urgency") or {}).get("score", 1))))
    except (TypeError, ValueError):
        decision.urgency = 1
    decision.urgency = max(0, min(decision.urgency, 3))

    relevant = set()
    for app in GATED_APPS:
        answer = answers.get(f"app_{app}") or {}
        try:
            if float(answer.get("noul", 0)) >= 0.5:
                relevant.add(app)
        except (TypeError, ValueError):
            continue
    decision.relevant_apps = relevant
    return decision


@traceable(name="jev.select_sources", run_type="chain", process_inputs=_redact_secret_inputs)
def select_sources(
    user_id: str,
    candidate_sources: list[str],
    context: str,
) -> set[str]:
    """Pick which data sources a background checkup should actually query.

    Returns every candidate on any Jev failure so the caller stays functional;
    pass only sources worth the API calls when Jev answers.
    """
    source_descriptions = {
        "calendar": "today's calendar events and changes",
        "gmail": "recent unread email",
        "tasks": "open Google Tasks",
        "stripe": "unpaid Stripe invoices",
    }
    questions = {
        source: _noul(f"Worth checking {source_descriptions.get(source, source)} for this user right now, given the context")
        for source in candidate_sources
    }
    answers = jev_evaluate(
        f"User context: {context[:2000]}\nCurrent time applies. Decide which sources to observe now.",
        questions,
    )
    if answers is None:
        return set(candidate_sources)
    chosen = set()
    for source in candidate_sources:
        answer = answers.get(source) or {}
        try:
            if float(answer.get("noul", 0)) >= 0.5:
                chosen.add(source)
        except (TypeError, ValueError):
            chosen.add(source)
    return chosen or {"calendar", "gmail"}
