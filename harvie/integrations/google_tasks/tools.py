"""LangChain tool wrappers for Google Tasks."""

from langchain_core.tools import tool

from harvie.integrations.google_tasks.provider import google_tasks_provider
from harvie.integrations.google_tasks.schemas import (
    InsertGoogleTaskInput,
    ListGoogleTasksInput,
    ListTaskListsInput,
    UpdateGoogleTaskInput,
)


@tool(args_schema=ListGoogleTasksInput)
def google_tasks_list_tasks(include_completed: bool = False, max_tasks: int = 30) -> str:
    """List Google Tasks across every list. Use this for the user's Google task list, not Harvie open loops."""
    return google_tasks_provider.list_tasks(include_completed, max_tasks)


@tool(args_schema=ListTaskListsInput)
def google_tasks_list_task_lists(max_results: int = 20) -> str:
    """List the user's Google Task lists and their IDs."""
    return google_tasks_provider.list_task_lists(max_results)


@tool(args_schema=InsertGoogleTaskInput)
def google_tasks_create_task(
    title: str,
    notes: str | None = None,
    due: str | None = None,
    tasklist_id: str = "@default",
) -> str:
    """Create a Google Task. Use @default unless the user named another list."""
    return google_tasks_provider.insert_task(title, notes, due, tasklist_id)


@tool(args_schema=UpdateGoogleTaskInput)
def google_tasks_update_task(
    task_id: str,
    tasklist_id: str,
    title: str | None = None,
    notes: str | None = None,
    due: str | None = None,
    status: str | None = None,
) -> str:
    """Update a Google Task. Set status to completed to finish it."""
    return google_tasks_provider.update_task(task_id, tasklist_id, title, notes, due, status)


google_tasks_tools = [
    google_tasks_list_tasks,
    google_tasks_list_task_lists,
    google_tasks_create_task,
    google_tasks_update_task,
]
