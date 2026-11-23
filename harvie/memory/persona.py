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
    # Free-form learned preferences live alongside the fixed fields, with the
    # same provenance shape: {key: {value, status, source, confidence, updated_at}}.
    preferences = raw.get("preferences")
    profile["preferences"] = {
        key: entry for key, entry in (preferences or {}).items()
        if isinstance(entry, dict) and entry.get("value") is not None
    }
    return profile


def persona_values(profile: dict | None = None) -> dict:
    """Return just known values for the assistant's context."""
    fields = _normalize_profile(profile)
    return {key: field["value"] for key, field in fields.items() if key != "preferences" and field["value"] is not None}


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


def _save_profile(uid: str, profile: dict) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO persona_profiles (user_id, profile, onboarding_complete, onboarding_step)
                VALUES (%s, %s::jsonb, FALSE, 0)
                ON CONFLICT (user_id) DO UPDATE SET
                    profile = EXCLUDED.profile,
                    updated_at = NOW()
                """,
                (uid, json.dumps(profile)),
            )


def get_preferences(user_id: str | None = None) -> dict[str, dict]:
    """Free-form learned preferences: {key: {value, status, source, confidence, updated_at}}."""
    return get_persona(user_id)["profile"].get("preferences", {})


def preference_values(user_id: str | None = None) -> dict[str, str]:
    """Flattened preference values, e.g. {'proactive.quiet_hours': '22:00-08:00'}."""
    return {key: entry.get("value") for key, entry in get_preferences(user_id).items() if entry.get("value") is not None}


def update_preferences(entries: dict[str, dict], user_id: str | None = None, *, source: str = "conversation") -> dict:
    """Merge learned preference entries under the same provenance rules as
    persona fields: inferred never overwrites confirmed, confidence is kept."""
    uid = user_id or settings.HARVIE_USER_ID
    if not uid:
        raise ValueError("An authenticated user is required to update preferences.")
    timestamp = datetime.now(timezone.utc).isoformat()
    current = get_persona(uid)["profile"]
    preferences = dict(current.get("preferences", {}))
    for key, entry in entries.items():
        if not isinstance(entry, dict) or entry.get("value") in (None, ""):
            continue
        clean_key = key.strip().lower().replace(" ", "_")[:64]
        if not clean_key:
            continue
        old = preferences.get(clean_key)
        status = entry.get("status") if entry.get("status") in ("confirmed", "inferred") else "inferred"
        try:
            confidence = max(0.0, min(float(entry.get("confidence", 0.8)), 1.0))
        except (TypeError, ValueError):
            confidence = 0.8
        if old and old.get("status") == "confirmed" and status == "inferred":
            continue
        preferences[clean_key] = {
            "value": entry["value"],
            "status": status,
            "source": source,
            "confidence": confidence,
            "updated_at": timestamp,
        }
    _save_profile(uid, {**current, "preferences": preferences})
    return preferences
