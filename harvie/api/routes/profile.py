from typing import Any

from pydantic import BaseModel

from harvie.memory.persona import get_persona


class PersonaField(BaseModel):
    value: Any = None
    status: str = "unknown"
    source: str | None = None
    confidence: float = 0.0
    updated_at: str | None = None


class ProfileResponse(BaseModel):
    name: str = ""
    assistant_name: str = "Harvie"
    fields: dict[str, PersonaField]
    onboarding_complete: bool = False
    onboarding_step: int = 0
    updated_at: str | None = None


def profile_response(record: dict | None = None) -> ProfileResponse:
    record = record or get_persona()
    fields = record["profile"]
    return ProfileResponse(
        name=(fields.get("name") or {}).get("value") or "",
        assistant_name=(fields.get("assistant_name") or {}).get("value") or "Harvie",
        fields=fields,
        onboarding_complete=record["onboarding_complete"],
        onboarding_step=record["onboarding_step"],
        updated_at=record["updated_at"],
    )
