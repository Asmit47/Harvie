"""Per-user persona fields and their provenance, stored in PostgreSQL."""

import json
from datetime import datetime, timezone

from harvie.core.config import settings
from harvie.core.db import get_db_connection

PERSONA_FIELDS = {
    "name": "Name",
    "assistant_name": "Assistant name",
    "job": "Job or role",
    "goals": "Goals",
    "current_projects": "Current projects",
    "motivations": "Motivations",
    "working_style": "Working style",
    "decision_making_style": "Decision-making style",
    "communication_style": "Communication style",
    "timezone": "Time zone",
    "notes": "Other useful context",
}


def _unknown_field() -> dict:
    return {"value": None, "status": "unknown", "source": None, "confidence": 0.0, "updated_at": None}


def _normalize_profile(data: dict | None, updated_at: str | None = None) -> dict:
    raw = dict(data) if isinstance(data, dict) else {}
    for old, new in {
        "role": "job",
        "current_focus": "current_projects",
        "long_term_goals": "goals",
        "communication_preferences": "communication_style",
        "custom_notes": "notes",
    }.items():
        if new not in raw and old in raw:
            raw[new] = raw[old]
    profile = {}
    for key in PERSONA_FIELDS:
        saved = raw.get(key)
        if isinstance(saved, dict) and "value" in saved:
            field = _unknown_field()
            field.update({k: saved[k] for k in field if k in saved})
            profile[key] = field
        elif saved not in (None, "", []):
            profile[key] = {
                "value": saved,
                "status": "confirmed",
                "source": "legacy",
                "confidence": 0.95,
                "updated_at": updated_at,
            }
        else:
            profile[key] = _unknown_field()
    return profile


def persona_values(profile: dict | None = None) -> dict:
    """Return just known values for the assistant's context."""
    fields = _normalize_profile(profile)
    return {key: field["value"] for key, field in fields.items() if field["value"] is not None}


def get_persona(user_id: str | None = None) -> dict:
    uid = user_id or settings.HARVIE_USER_ID
    if not uid:
        return {"profile": _normalize_profile({}), "onboarding_complete": False, "onboarding_step": 0, "updated_at": None}
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT profile, onboarding_complete, onboarding_step, updated_at FROM persona_profiles WHERE user_id = %s",
                (uid,),
            )
            row = cur.fetchone()
    if not row:
        return {"profile": _normalize_profile({}), "onboarding_complete": False, "onboarding_step": 0, "updated_at": None}
    updated_at = row["updated_at"].isoformat()
    return {
        "profile": _normalize_profile(row["profile"], updated_at),
        "onboarding_complete": row["onboarding_complete"],
        "onboarding_step": row["onboarding_step"],
        "updated_at": updated_at,
    }


def update_persona(
    changes: dict,
    user_id: str | None = None,
    *,
    source: str = "manual",
    status: str = "confirmed",
    confidence: float = 1.0,
    field_metadata: dict[str, tuple[str, float]] | None = None,
    onboarding_complete: bool | None = None,
    onboarding_step: int | None = None,
) -> dict:
    uid = user_id or settings.HARVIE_USER_ID
    if not uid:
        raise ValueError("An authenticated user is required to update a persona.")

    current = get_persona(uid)
    profile = current["profile"]
    timestamp = datetime.now(timezone.utc).isoformat()
    for key, value in changes.items():
        if key not in PERSONA_FIELDS or value is None:
            continue
        field_status, field_confidence = (field_metadata or {}).get(key, (status, confidence))
        profile[key] = {
            "value": value,
            "status": field_status,
            "source": source,
            "confidence": max(0.0, min(float(field_confidence), 1.0)),
            "updated_at": timestamp,
        }

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO persona_profiles (user_id, profile, onboarding_complete, onboarding_step)
                VALUES (%s, %s::jsonb, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    profile = EXCLUDED.profile,
                    onboarding_complete = COALESCE(%s, persona_profiles.onboarding_complete),
                    onboarding_step = COALESCE(%s, persona_profiles.onboarding_step),
                    updated_at = NOW()
                """,
                (
                    uid,
                    json.dumps(profile),
                    onboarding_complete or False,
                    onboarding_step or 0,
                    onboarding_complete,
                    onboarding_step,
                ),
            )
    return get_persona(uid)
