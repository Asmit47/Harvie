import sqlite3
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

from nexus.core.config import settings
from nexus.core.graph import compiled_graph
from nexus.entrypoints.cli import close_session
from nexus.memory.tier2_session import checkpointer, generate_session_id, get_thread_config

router = APIRouter()


class ConversationTurn(BaseModel):
    role: str
    content: str


class SessionSummary(BaseModel):
    id: str
    title: str
    created_at: str | None = None
    updated_at: str | None = None
    message_count: int = 0
    preview: str | None = None


class SessionDetail(SessionSummary):
    conversation_history: list[ConversationTurn] = Field(default_factory=list)
    current_task: str | None = None


class CreateSessionRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)


class RenameSessionRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class CloseSessionRequest(BaseModel):
    session_id: str


class CloseSessionResponse(BaseModel):
    status: str
    session_id: str
    summary: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _thread_id(session_id: str) -> str:
    return get_thread_config(session_id)["configurable"]["thread_id"]


def _session_id_from_thread_id(thread_id: str) -> str | None:
    prefix = f"{settings.NEXUS_USER_ID}:"
    if not thread_id.startswith(prefix):
        return None
    return thread_id.removeprefix(prefix)


def _get_state(session_id: str) -> dict[str, Any] | None:
    try:
        snapshot = compiled_graph.get_state(get_thread_config(session_id))
    except Exception:
        return None
    if not snapshot or not snapshot.values:
        return None
    return dict(snapshot.values)


def _latest_checkpoint_times() -> dict[str, tuple[str | None, str | None]]:
    prefix = f"{settings.NEXUS_USER_ID}:"
    times: dict[str, tuple[str | None, str | None]] = {}
    try:
        checkpoints = checkpointer.list(None)
        for checkpoint_tuple in checkpoints:
            thread_id = checkpoint_tuple.config["configurable"]["thread_id"]
            if not thread_id.startswith(prefix):
                continue

            checkpoint_ts = checkpoint_tuple.checkpoint.get("ts")
            created_at, updated_at = times.get(thread_id, (None, None))
            if checkpoint_ts and (created_at is None or checkpoint_ts < created_at):
                created_at = checkpoint_ts
            if checkpoint_ts and (updated_at is None or checkpoint_ts > updated_at):
                updated_at = checkpoint_ts
            times[thread_id] = (created_at, updated_at)
    except sqlite3.Error:
        return {}
    return times


def _first_user_message(history: list[dict[str, Any]]) -> str | None:
    for turn in history:
        if turn.get("role") == "user" and turn.get("content"):
            return str(turn["content"])
    return None


def _preview(history: list[dict[str, Any]]) -> str | None:
    if not history:
        return None
    content = str(history[-1].get("content") or "")
    return content[:157] + "..." if len(content) > 160 else content


def _title_for_session(session_id: str, state: dict[str, Any]) -> str:
    explicit_title = state.get("session_title")
    if explicit_title:
        return str(explicit_title)

    history = state.get("conversation_history") or []
    if isinstance(history, list):
        first_message = _first_user_message(history)
        if first_message:
            return first_message[:57] + "..." if len(first_message) > 60 else first_message

    return f"Session {session_id}"


def _to_summary(
    session_id: str,
    state: dict[str, Any],
    created_at: str | None = None,
    updated_at: str | None = None,
) -> SessionSummary:
    history = state.get("conversation_history") or []
    if not isinstance(history, list):
        history = []

    return SessionSummary(
        id=session_id,
        title=_title_for_session(session_id, state),
        created_at=state.get("session_created_at") or created_at,
        updated_at=state.get("session_updated_at") or updated_at,
        message_count=len(history),
        preview=_preview(history),
    )


def _require_session(session_id: str) -> tuple[dict[str, Any], str | None, str | None]:
    state = _get_state(session_id)
    times = _latest_checkpoint_times().get(_thread_id(session_id), (None, None))
    if state is None and times == (None, None):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return state or {}, times[0], times[1]


@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions() -> list[SessionSummary]:
    sessions: list[SessionSummary] = []
    for thread_id, (created_at, updated_at) in _latest_checkpoint_times().items():
        session_id = _session_id_from_thread_id(thread_id)
        if not session_id:
            continue
        state = _get_state(session_id) or {}
        sessions.append(_to_summary(session_id, state, created_at, updated_at))
    return sorted(sessions, key=lambda item: item.updated_at or "", reverse=True)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(session_id: str) -> SessionDetail:
    state, created_at, updated_at = _require_session(session_id)
    summary = _to_summary(session_id, state, created_at, updated_at)
    history = state.get("conversation_history") or []
    if not isinstance(history, list):
        history = []

    return SessionDetail(
        **summary.dict(),
        conversation_history=[
            ConversationTurn(role=str(turn.get("role", "")), content=str(turn.get("content", "")))
            for turn in history
            if isinstance(turn, dict)
        ],
        current_task=state.get("current_task"),
    )


@router.post("/sessions", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
def create_session(request: CreateSessionRequest | None = None) -> SessionDetail:
    session_id = generate_session_id()
    now = _now_iso()
    title = request.title.strip() if request and request.title else None
    values = {
        "session_id": session_id,
        "session_title": title or None,
        "session_created_at": now,
        "session_updated_at": now,
        "conversation_history": [],
    }
    compiled_graph.update_state(get_thread_config(session_id), values, as_node=STATE_UPDATE_NODE)
    return get_session(session_id)


@router.patch("/sessions/{session_id}", response_model=SessionDetail)
def rename_session(session_id: str, request: RenameSessionRequest) -> SessionDetail:
    state, _, _ = _require_session(session_id)
    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Title cannot be blank")
    compiled_graph.update_state(
        get_thread_config(session_id),
        {
            **state,
            "session_title": title,
            "session_updated_at": _now_iso(),
        },
        as_node=STATE_UPDATE_NODE,
    )
    return get_session(session_id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str) -> Response:
    _require_session(session_id)
    checkpointer.delete_thread(_thread_id(session_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/session/close", response_model=CloseSessionResponse)
def close_session_route(request: CloseSessionRequest) -> CloseSessionResponse:
    summary = close_session(request.session_id)
    status_value = "ok" if summary else "empty"
    return CloseSessionResponse(status=status_value, session_id=request.session_id, summary=summary)


STATE_UPDATE_NODE = "persist_memory"
