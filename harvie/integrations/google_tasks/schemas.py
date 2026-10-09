"""Pydantic input schemas for Google Tasks tools."""

from typing import Literal

from pydantic import BaseModel, Field


class ListGoogleTasksInput(BaseModel):
    """Input for listing tasks across the user's lists."""

    include_completed: bool = Field(default=False, description="Include completed tasks. Defaults to open tasks only.")
    max_tasks: int = Field(default=30, description="Maximum tasks to return, from 1 to 100.")


class ListTaskListsInput(BaseModel):
    """Input for listing Google Task lists."""

    max_results: int = Field(default=20, description="Maximum task lists to return.")


class InsertGoogleTaskInput(BaseModel):
    """Input for creating a Google Task."""

    title: str = Field(description="Task title, 1024 characters or fewer.")
    notes: str | None = Field(default=None, description="Plain-text details. No markdown.")
    due: str | None = Field(default=None, description="Due date. Google Tasks keeps the date only, for example 2026-10-12.")
    tasklist_id: str = Field(default="@default", description="Task list ID, or @default for the primary list.")


class UpdateGoogleTaskInput(BaseModel):
    """Input for updating a Google Task."""

    task_id: str = Field(description="Task ID returned by a previous list or create call.")
    tasklist_id: str = Field(description="Task list ID that contains the task. Use @default for the primary list.")
    title: str | None = Field(default=None, description="Replacement title.")
    notes: str | None = Field(default=None, description="Replacement notes.")
    due: str | None = Field(default=None, description="Replacement due date.")
    status: Literal["needsAction", "completed"] | None = Field(
        default=None, description="Set completed to finish the task, or needsAction to reopen it."
    )
