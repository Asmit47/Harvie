"""Post-turn learning, off the chat critical path.

The Jev gate decides whether a turn carries anything learnable; when it does,
a daemon thread runs the extraction after the response has already gone back
to the user. Deduplicated per (user, request) via the agent_state KV store.
"""

import logging
import threading
from datetime import datetime, timezone

from harvie.core.identity import reset_request_user_id, set_request_user_id
from harvie.core.tracing import lane_traceable, lane_tracing_context
from harvie.core.turns import now_iso
from harvie.memory.persona_learning import learn_from_turn

logger = logging.getLogger(__name__)


def _claim_learning(user_id: str, request_id: str) -> bool:
    """Return True exactly once per (user, request_id), across workers."""
    from harvie.core.db import get_db_connection

    key = f"learning:{user_id}:{request_id}"
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO agent_state (key, value, updated_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (key) DO NOTHING
                    RETURNING key
                    """,
                    (key, datetime.now(timezone.utc).isoformat(), now_iso()),
                )
                return cur.fetchone() is not None
    except Exception:
        # The KV store is an optimization, not a gate: better to re-learn once
        # than to drop learning entirely.
        logger.info("Could not claim learning dedup key", exc_info=True)
        return True


@lane_traceable("learning")
def _run(user_id: str, request_id: str, message: str) -> None:
    token = set_request_user_id(user_id)
    try:
        if not _claim_learning(user_id, request_id):
            return
        learned = learn_from_turn(user_id, message)
        if any(learned.values()):
            logger.info(
                "lane=learning user_id=%s request_id=%s fields=%s preferences=%s commitments=%s",
                user_id, request_id, learned["persona_fields"], learned["preferences"], learned["commitments"],
            )
    except Exception:
        logger.info("lane=learning failed user_id=%s request_id=%s", user_id, request_id, exc_info=True)
    finally:
        reset_request_user_id(token)


def spawn_learning(user_id: str, request_id: str, message: str, decision: dict | None) -> None:
    """Fire post-turn learning in the background when the gate says to."""
    if not user_id or not request_id or not message:
        return
    decision = decision or {}
    if not (decision.get("has_preference_signal") or decision.get("has_commitment")):
        return

    def _entry() -> None:
        with lane_tracing_context("learning", user_id=user_id, request_id=request_id):
            _run(user_id, request_id, message)

    thread = threading.Thread(
        target=_entry,
        name=f"harvie-learning-{request_id}",
        daemon=True,
    )
    thread.start()
