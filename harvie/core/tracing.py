"""LangSmith run labels so every Harvie lane is filterable the same way."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

from langchain_core.runnables import RunnableConfig
from langsmith import traceable, tracing_context


def build_run_config(
    thread_id: str,
    *,
    lane: str,
    user_id: str,
    session_id: str | None = None,
    request_id: str | None = None,
    jev_decision: dict | None = None,
    task_id: str | None = None,
) -> RunnableConfig:
    """RunnableConfig with a stable run name, lane tags, and Jev metadata."""
    decision = dict(jev_decision) if jev_decision else {}
    turn_kind = decision.get("turn_kind")
    model_tier = decision.get("model_tier")
    tags = [lane]
    if turn_kind:
        tags.append(str(turn_kind))
    if model_tier:
        tags.append(str(model_tier))
    return {
        "configurable": {"thread_id": thread_id},
        "run_name": f"harvie:{lane}",
        "tags": tags,
        "metadata": {
            "user_id": user_id,
            "session_id": session_id,
            "request_id": request_id,
            "task_id": task_id,
            "jev_source": decision.get("source"),
            "jev_decision": decision,
        },
    }


@contextmanager
def lane_tracing_context(
    lane: str,
    *,
    user_id: str | None = None,
    **metadata: Any,
) -> Iterator[None]:
    """Start a new LangSmith root so background threads don't inherit a dead parent."""
    md: dict[str, Any] = {"lane": lane}
    if user_id:
        md["user_id"] = user_id
    md.update({key: value for key, value in metadata.items() if value is not None})
    with tracing_context(parent=False, tags=[lane], metadata=md):
        yield


def _without_self(inputs: dict) -> dict:
    """Keep method traces from serializing the worker/scheduler instance."""
    return {key: value for key, value in inputs.items() if key != "self"}


def lane_traceable(lane: str):
    """Named root run `harvie:<lane>` with the lane tag."""
    return traceable(
        name=f"harvie:{lane}",
        run_type="chain",
        tags=[lane],
        process_inputs=_without_self,
    )
