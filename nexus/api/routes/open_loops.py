from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from nexus.memory.operational import complete_open_loop, create_open_loop, get_open_loop, list_open_loops, snooze_open_loop, update_open_loop

router = APIRouter()


class OpenLoopInput(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    type: str = "task"
    details: str = ""
    due_at: str | None = None
    priority: str = "medium"
    source_type: str | None = None
    source_id: str | None = None


class OpenLoopUpdate(BaseModel):
    title: str | None = None
    details: str | None = None
    due_at: str | None = None
    priority: str | None = None
    status: str | None = None


class SnoozeInput(BaseModel):
    until: str = Field(min_length=1)


@router.get("/open-loops")
def get_open_loops(include_completed: bool = False) -> dict:
    return {"open_loops": list_open_loops(include_completed=include_completed)}


@router.post("/open-loops", status_code=201)
def add_open_loop(item: OpenLoopInput) -> dict:
    try:
        return create_open_loop(item.title, loop_type=item.type, details=item.details, due_at=item.due_at, priority=item.priority, source_type=item.source_type, source_id=item.source_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch("/open-loops/{loop_id}")
def patch_open_loop(loop_id: str, changes: OpenLoopUpdate) -> dict:
    try:
        item = update_open_loop(loop_id, **changes.model_dump(exclude_none=True))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Open loop not found")
    return item


@router.post("/open-loops/{loop_id}/complete")
def complete_loop(loop_id: str) -> dict:
    item = complete_open_loop(loop_id)
    if not item:
        raise HTTPException(status_code=404, detail="Open loop not found")
    return item


@router.post("/open-loops/{loop_id}/snooze")
def snooze_loop(loop_id: str, request: SnoozeInput) -> dict:
    item = snooze_open_loop(loop_id, request.until)
    if not item:
        raise HTTPException(status_code=404, detail="Open loop not found")
    return item
