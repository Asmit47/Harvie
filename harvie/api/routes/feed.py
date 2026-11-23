"""Feed and pending-action routes: Harvie's proactive surface."""

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from harvie.core.identity import get_request_user_id
from harvie.memory.feed import list_feed, mark_all_read, mark_read, unread_count
from harvie.memory.pending_actions import (
    decide_pending_action,
    execute_approved,
    get_pending_action,
    list_pending_actions,
    update_pending_action,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _require_user_id() -> str:
    user_id = get_request_user_id()
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing authenticated user identity.")
    return user_id


class FeedItemDTO(BaseModel):
    id: str
    kind: str
    title: str
    body: str = ""
    priority: str = "medium"
    data: dict = {}
    open_loop_id: str | None = None
    task_id: str | None = None
    read: bool = False
    created_at: str = ""

    @classmethod
    def from_row(cls, row: dict) -> "FeedItemDTO":
        return cls(
            id=row["id"],
            kind=row["kind"],
            title=row["title"],
            body=row.get("body") or "",
            priority=row.get("priority") or "medium",
            data=row.get("data") or {},
            open_loop_id=row.get("open_loop_id"),
            task_id=row.get("task_id"),
            read=bool(row.get("read_at")),
            created_at=row.get("created_at") or "",
        )


class FeedResponse(BaseModel):
    items: list[FeedItemDTO]
    unread_count: int


class PendingActionDTO(BaseModel):
    id: str
    kind: str
    app: str
    tool: str
    arguments: dict = {}
    status: str
    source: str
    task_id: str | None = None
    result: str | None = None
    created_at: str = ""

    @classmethod
    def from_row(cls, row: dict) -> "PendingActionDTO":
        return cls(
            id=row["id"],
            kind=row["kind"],
            app=row["app"],
            tool=row["tool"],
            arguments=row.get("arguments") or {},
            status=row["status"],
            source=row.get("source") or "task",
            task_id=row.get("task_id"),
            result=row.get("result"),
            created_at=row.get("created_at") or "",
        )


class DecisionRequest(BaseModel):
    pass


class EditActionRequest(BaseModel):
    arguments: dict = Field(default_factory=dict)


@router.get("/feed", response_model=FeedResponse)
def get_feed(include_read: bool = False, limit: int = 30) -> FeedResponse:
    user_id = _require_user_id()
    rows = list_feed(user_id, include_read=include_read, limit=limit)
    return FeedResponse(
        items=[FeedItemDTO.from_row(row) for row in rows],
        unread_count=unread_count(user_id),
    )


@router.post("/feed/{item_id}/read", response_model=FeedItemDTO)
def read_feed_item(item_id: str) -> FeedItemDTO:
    user_id = _require_user_id()
    row = mark_read(user_id, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Feed item not found.")
    return FeedItemDTO.from_row(row)


@router.post("/feed/read-all")
def read_all_feed() -> dict:
    user_id = _require_user_id()
    return {"marked_read": mark_all_read(user_id)}


@router.get("/pending-actions", response_model=list[PendingActionDTO])
def get_pending_actions(status: str = "pending", limit: int = 20) -> list[PendingActionDTO]:
    user_id = _require_user_id()
    rows = list_pending_actions(user_id, status=status or None, limit=limit)
    return [PendingActionDTO.from_row(row) for row in rows]


@router.post("/pending-actions/{action_id}/approve", response_model=PendingActionDTO)
def approve_pending_action(action_id: str) -> PendingActionDTO:
    """Approve and immediately execute a proposed action."""
    user_id = _require_user_id()
    action = get_pending_action(user_id, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    if action["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"This action is already {action['status']}.")
    try:
        result = execute_approved(action)
    except Exception as exc:
        logger.exception("Approved action %s failed", action_id)
        raise HTTPException(status_code=502, detail="The action ran but the service reported an error.") from exc
    updated = decide_pending_action(user_id, action_id, "approved")
    updated = update_pending_action(user_id, action_id, result=str(result)[:8000]) or updated
    return PendingActionDTO.from_row(updated)


@router.post("/pending-actions/{action_id}/reject", response_model=PendingActionDTO)
def reject_pending_action(action_id: str) -> PendingActionDTO:
    user_id = _require_user_id()
    updated = decide_pending_action(user_id, action_id, "rejected")
    if not updated:
        raise HTTPException(status_code=404, detail="Action not found.")
    return PendingActionDTO.from_row(updated)


@router.patch("/pending-actions/{action_id}", response_model=PendingActionDTO)
def edit_pending_action(action_id: str, request: EditActionRequest) -> PendingActionDTO:
    """Edit a proposed action's arguments before approving it."""
    user_id = _require_user_id()
    action = get_pending_action(user_id, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    if action["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"This action is already {action['status']}.")
    updated = update_pending_action(user_id, action_id, arguments=request.arguments)
    return PendingActionDTO.from_row(updated or action)
