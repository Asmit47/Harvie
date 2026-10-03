"""Stable, serializable transcript turns shared by scripted and generated replies."""

from datetime import datetime, timezone
from uuid import uuid4


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def assistant_turn(content: str, *, source: str = "onboarding", **metadata) -> dict:
    return {
        "id": uuid4().hex,
        "role": "assistant",
        "content": content,
        "source": source,
        "created_at": now_iso(),
        **metadata,
    }


def user_turn(content: str, request_id: str) -> dict:
    return {
        "id": f"user:{request_id}",
        "role": "user",
        "content": content,
        "source": "user",
        "created_at": now_iso(),
    }
