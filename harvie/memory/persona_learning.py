"""Extract durable persona facts from a user's message, without saving chat text."""

import logging
from typing import Literal

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field

from harvie.core.llm import chat_llm
from harvie.memory.persona import PERSONA_FIELDS, get_persona, update_persona

logger = logging.getLogger(__name__)


class PersonaFact(BaseModel):
    value: str | list[str] | None = None
    status: Literal["confirmed", "inferred"] = "inferred"
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class PersonaExtraction(BaseModel):
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


def learn_persona_from_message(message: str) -> None:
    """Save only high-confidence facts the user shared; never save the transcript."""
    if not message.strip():
        return
    try:
        extracted = chat_llm.with_structured_output(PersonaExtraction).invoke(
            [
                SystemMessage(
                    content=(
                        "Extract durable facts about the user from their latest message only. "
                        "Use assistant_name only for an explicit name they give their assistant; "
                        "never confuse the assistant's name with the user's name. "
                        "Do not infer from the assistant, invent facts, or treat a hypothetical, "
                        "request, or one-off task as a stable preference. Return a field only when "
                        "the user states it or strongly implies it. Mark direct statements confirmed; "
                        "mark strong implications inferred, with confidence below 1.0. Include "
                        "communication style only when the user's message clearly shows a stable "
                        "preference or they say it directly. A direct correction can replace an old "
                        "value. Otherwise omit unknown fields."
                    )
                ),
                HumanMessage(content=message),
            ]
        )
    except Exception:
        logger.info("Could not extract persona facts from this message")
        return

    current = get_persona()["profile"]
    changes = {}
    statuses = {}
    for key in PERSONA_FIELDS:
        fact = getattr(extracted, key, None)
        if not fact or fact.value in (None, "", []):
            continue
        if fact.confidence < 0.78:
            continue
        old = current[key]
        if old["status"] == "confirmed" and fact.status == "inferred":
            continue
        changes[key] = fact.value
        statuses[key] = (fact.status, fact.confidence)

    if changes:
        update_persona(changes, source="conversation", field_metadata=statuses)
