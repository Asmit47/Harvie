"""Task routes: visibility into the background work lane."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from harvie.core.identity import get_request_user_id
from harvie.tasks.store import cancel_task, get_task, list_tasks

router = APIRouter()


def _require_user_id() -> str:
    user_id = get_request_user_id()
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing authenticated user identity.")
    return user_id


class TaskDTO(BaseModel):
    id: str
    title: str
    objective: str
    status: str
    progress: list[dict] = []
    result_summary: str | None = None
    created_at: str = ""
    updated_at: str = ""
    completed_at: str | None = None

    @classmethod
    def from_row(cls, row: dict) -> "TaskDTO":
        return cls(
            id=row["id"],
            title=row["title"],
            objective=row["objective"],
            status=row["status"],
            progress=row.get("progress") or [],
            result_summary=row.get("result_summary"),
            created_at=row.get("created_at") or "",
            updated_at=row.get("updated_at") or "",
            completed_at=row.get("completed_at"),
        )


@router.get("/tasks", response_model=list[TaskDTO])
def get_tasks(include_all: bool = False, limit: int = 20) -> list[TaskDTO]:
    user_id = _require_user_id()
    return [TaskDTO.from_row(row) for row in list_tasks(user_id, include_inactive=include_all, limit=limit)]


@router.get("/tasks/{task_id}", response_model=TaskDTO)
def get_task_detail(task_id: str) -> TaskDTO:
    user_id = _require_user_id()
    task = get_task(task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskDTO.from_row(task)


@router.post("/tasks/{task_id}/cancel", response_model=TaskDTO)
def cancel_running_task(task_id: str) -> TaskDTO:
    user_id = _require_user_id()
    task = cancel_task(task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return TaskDTO.from_row(task)
