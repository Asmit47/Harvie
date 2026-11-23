"""Extract durable facts, preferences, and commitments from a user's turn.

Runs off the chat critical path (see harvie.memory.learning_worker), gated by
the Jev decision so most turns skip the LLM call entirely. Never saves chat
transcripts - only structured facts with provenance.
"""

import logging
from typing import Literal, Optional

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from harvie.core.llm import chat_llm
from harvie.memory.operational import create_open_loop
from harvie.memory.persona import (
    PERSONA_FIELDS,
    get_persona,
    update_persona,
    update_preferences,
)

logger = logging.getLogger(__name__)

CONFIDENCE_FLOOR = 0.78


class PersonaFact(BaseModel):
    value: str | list[str] | None = None
    status: Literal["confirmed", "inferred"] = "inferred"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class PreferenceFact(BaseModel):
    key: str = Field(description="Stable snake_case key, e.g. replies.concise or proactive.quiet_hours")
    value: str
    status: Literal["confirmed", "inferred"] = "inferred"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class CommitmentFact(BaseModel):
    title: str
    details: str = ""
    loop_type: Literal["task", "commitment", "follow_up", "waiting", "unresolved"] = "commitment"
    due_at: Optional[str] = Field(default=None, description="ISO 8601 datetime if a deadline is stated")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class TurnExtraction(BaseModel):
    name: PersonaFact | None = None
    assistant_name: PersonaFact | None = None
    job: PersonaFact | None = None
    goals: PersonaFact | None = None
    current_projects: PersonaFact | None = None
    motivations: PersonaFact | None = None
    working_style: PersonaFact | None = None
    decision_making_style: PersonaFact | None = None
    communication_style: PersonaFact | None = None
    timezone: PersonaFact | None = None
    notes: PersonaFact | None = None
    preferences: list[PreferenceFact] = Field(default_factory=list)
    commitments: list[CommitmentFact] = Field(default_factory=list)


_EXTRACTION_INSTRUCTIONS = (
    "Extract durable facts about the user from their latest message only. "
    "Use assistant_name only for an explicit name they give their assistant; "
    "never confuse the assistant's name with the user's name. "
    "Do not infer from the assistant, invent facts, or treat a hypothetical, "
    "request, or one-off task as a stable preference. Return a field only when "
    "the user states it or strongly implies it. Mark direct statements confirmed; "
    "mark strong implications inferred, with confidence below 1.0. Include "
    "communication style only when the user's message clearly shows a stable "
    "preference or they say it directly. A direct correction can replace an old "
    "value. Otherwise omit unknown fields.\n\n"
    "Preferences: capture stable working habits worth remembering with stable "
    "snake_case keys - how they want replies (e.g. replies.concise), proactive "
    "nudging taste (e.g. proactive.quiet_hours as HH:MM-HH:MM, proactive.enabled), "
    "scheduling habits, app priorities. Skip one-off instructions for the task at "
    "hand; only stable preferences.\n\n"
    "Commitments: capture promises, deadlines, follow-ups, or things the user is "
    "waiting on that should be tracked until done. Include due_at only when a "
    "concrete time is stated or unambiguous (resolve relative times like "
    "'tomorrow' to ISO 8601)."
)


def _extract(message: str) -> TurnExtraction | None:
    try:
        return chat_llm.with_structured_output(TurnExtraction).invoke(
            [
                SystemMessage(content=_EXTRACTION_INSTRUCTIONS),
                HumanMessage(content=message),
            ]
        )
    except Exception:
        logger.info("Could not extract learnable facts from this message")
        return None


def learn_from_turn(user_id: str, message: str) -> dict:
    """Learn persona fields, preferences, and commitments from one user turn.

    Returns a summary of what was learned, for logging/tests. Must run with the
    user's identity already resolved (explicit user_id for persona stores).
    """
    learned: dict = {"persona_fields": [], "preferences": [], "commitments": []}
    if not message.strip():
        return learned
    extracted = _extract(message)
    if extracted is None:
        return learned

    current = get_persona(user_id)["profile"]
    changes = {}
    statuses = {}
    for key in PERSONA_FIELDS:
        fact = getattr(extracted, key, None)
        if not fact or fact.value in (None, "", []):
            continue
        if fact.confidence < CONFIDENCE_FLOOR:
            continue
        old = current[key]
        if old["status"] == "confirmed" and fact.status == "inferred":
            continue
        changes[key] = fact.value
        statuses[key] = (fact.status, fact.confidence)

    if changes:
        update_persona(changes, user_id=user_id, source="conversation", field_metadata=statuses)
        learned["persona_fields"] = sorted(changes)

    preference_entries = {
        fact.key: {"value": fact.value, "status": fact.status, "confidence": fact.confidence}
        for fact in extracted.preferences
        if fact.key and fact.value and fact.confidence >= CONFIDENCE_FLOOR
    }
    if preference_entries:
        update_preferences(preference_entries, user_id=user_id)
        learned["preferences"] = sorted(preference_entries)

    for fact in extracted.commitments:
        if fact.confidence < CONFIDENCE_FLOOR or not fact.title.strip():
            continue
        try:
            loop = create_open_loop(
                fact.title.strip()[:200],
                loop_type=fact.loop_type,
                details=(fact.details or "").strip()[:2000],
                due_at=fact.due_at,
                source_type="conversation",
            )
            learned["commitments"].append(loop.get("id") or fact.title)
        except ValueError:
            logger.info("Skipping invalid commitment extracted from conversation: %s", fact.title)
    return learned


def learn_persona_from_message(message: str) -> None:
    """Backward-compatible wrapper: persona fields only."""
    extracted = _extract(message)
    if extracted is None:
        return
    current = get_persona()["profile"]
    changes = {}
    statuses = {}
    for key in PERSONA_FIELDS:
        fact = getattr(extracted, key, None)
        if not fact or fact.value in (None, "", []):
            continue
        if fact.confidence < CONFIDENCE_FLOOR:
            continue
        old = current[key]
        if old["status"] == "confirmed" and fact.status == "inferred":
            continue
        changes[key] = fact.value
        statuses[key] = (fact.status, fact.confidence)

    if changes:
        update_persona(changes, source="conversation", field_metadata=statuses)
