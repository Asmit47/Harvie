"""Google Tasks operations backed by the shared Composio session."""

from harvie.integrations.composio.session import run_action


class GoogleTasksProvider:
    """Read and update Google Tasks. Harvie open loops stay in a separate store."""

    def list_tasks(self, include_completed: bool = False, max_tasks: int = 30) -> str:
        return run_action(
            "googletasks",
            "GOOGLETASKS_LIST_ALL_TASKS",
            {
                "showCompleted": include_completed,
                "max_tasks_total": max(1, min(max_tasks, 100)),
            },
        )

    def list_task_lists(self, max_results: int = 20) -> str:
        return run_action(
            "googletasks",
            "GOOGLETASKS_LIST_TASK_LISTS",
            {"maxResults": max(1, min(max_results, 100))},
        )

    def insert_task(
        self,
        title: str,
        notes: str | None = None,
        due: str | None = None,
        tasklist_id: str = "@default",
    ) -> str:
        return run_action(
            "googletasks",
            "GOOGLETASKS_INSERT_TASK",
            {"title": title, "notes": notes, "due": due, "tasklist_id": tasklist_id or "@default"},
        )

    def update_task(
        self,
        task_id: str,
        tasklist_id: str,
        title: str | None = None,
        notes: str | None = None,
        due: str | None = None,
        status: str | None = None,
    ) -> str:
        return run_action(
            "googletasks",
            "GOOGLETASKS_PATCH_TASK",
            {
                "task_id": task_id,
                "tasklist_id": tasklist_id,
                "title": title,
                "notes": notes,
                "due": due,
                "status": status,
            },
        )


google_tasks_provider = GoogleTasksProvider()
