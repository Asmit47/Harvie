"""The work lane: a durable background worker that executes delegated tasks.

A dispatcher thread claims queued task_runs rows (SKIP LOCKED) and runs them
on a small thread pool. Each task executes the standard Harvie graph on its
own checkpointer thread, so the chat lane is never blocked. Outbound actions
are never executed here: the task proposes them, they become pending_actions,
and the user approves them from the feed.
"""

import json
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor

from harvie.core.config import settings
from harvie.core.db import is_pool_open
from harvie.core.graph import compiled_graph
from harvie.core.identity import reset_request_user_id, set_request_user_id
from harvie.memory.feed import create_feed_item
from harvie.tasks import store

logger = logging.getLogger(__name__)

PROPOSED_BLOCK = re.compile(r"```json\s*(\{.*?\})\s*```", re.S)

WORK_DIRECTIVE = """{objective}

---

You are running as a BACKGROUND WORK TASK, not an interactive chat. Work
autonomously until the objective is done:

- Use read-only tools (search, read, list, look up) freely to gather what you need.
- Never send, create, edit, or delete anything external on your own. Instead,
  prepare the exact action and propose it for approval.
- Finish with a concise summary of what you found and did.
- If there are actions awaiting the user's approval, end your reply with ONE
  fenced json block exactly in this shape (omit the block entirely if there
  are none):

```json
{{"proposed_actions": [{{"app": "gmail", "tool": "GMAIL_SEND_EMAIL", "arguments": {{...}}, "note": "one line why"}}]}}
```"""


class TaskWorker:
    """Polls the durable queue and executes tasks on a bounded pool."""

    def __init__(self) -> None:
        self._stop = threading.Event()
        self._dispatcher: threading.Thread | None = None
        self._pool: ThreadPoolExecutor | None = None

    @property
    def running(self) -> bool:
        return bool(self._dispatcher and self._dispatcher.is_alive())

    def start(self) -> None:
        if self.running:
            return
        reclaimed = store.requeue_stale_running()
        if reclaimed:
            logger.info("Requeued %s interrupted task(s) after restart", reclaimed)
        self._stop.clear()
        self._pool = ThreadPoolExecutor(
            max_workers=max(1, settings.TASK_MAX_CONCURRENT),
            thread_name_prefix="harvie-task",
        )
        self._dispatcher = threading.Thread(
            target=self._dispatch_loop, name="harvie-task-dispatcher", daemon=True
        )
        self._dispatcher.start()
        logger.info("Task worker started (max %s concurrent)", settings.TASK_MAX_CONCURRENT)

    def stop(self, timeout: float = 5.0) -> None:
        self._stop.set()
        if self._dispatcher:
            self._dispatcher.join(timeout=timeout)
        if self._pool:
            self._pool.shutdown(wait=False, cancel_futures=True)
            self._pool = None

    def _dispatch_loop(self) -> None:
        while not self._stop.is_set():
            try:
                if not is_pool_open():
                    self._stop.wait(settings.TASK_WORKER_POLL_SECONDS)
                    continue
                task = store.claim_next_task()
                if task:
                    self._pool.submit(self._safe_execute, task)
                    continue  # immediately look for more work
            except Exception:
                logger.exception("Task dispatch failed")
            self._stop.wait(settings.TASK_WORKER_POLL_SECONDS)

    def _safe_execute(self, task: dict) -> None:
        try:
            self.execute(task)
        except Exception:
            logger.exception("Task %s crashed", task.get("id"))
            try:
                store.update_task(task["id"], status="failed", completed_at=_iso_now())
                create_feed_item(
                    task["user_id"], "task",
                    f"Task stopped early: {task['title']}",
                    body="Something went wrong while working on it. Try asking Harvie again.",
                    priority="low", task_id=task["id"],
                )
            except Exception:
                logger.exception("Could not record failure for task %s", task.get("id"))

    def execute(self, task: dict) -> dict:
        task_id = task["id"]
        user_id = task["user_id"]
        session_id = f"task-{task_id}"
        token = set_request_user_id(user_id)
        try:
            store.update_task(task_id, thread_id=f"{user_id}:{session_id}")
            store.append_progress(task_id, {"step": "started", "at": _iso_now()})

            result = compiled_graph.invoke(
                {
                    "user_input": WORK_DIRECTIVE.format(objective=task["objective"]),
                    "chat_request_id": f"task:{task_id}",
                    "session_id": session_id,
                },
                config={"configurable": {"thread_id": f"{user_id}:{session_id}"}},
            )

            answer = (result.get("final_answer") or result.get("answer") or "").strip()
            summary, proposals = _split_proposals(answer)
            steps = _progress_from_messages(result.get("messages") or [])
            for step in steps:
                store.append_progress(task_id, step)

            waiting = False
            for proposal in proposals:
                created = _create_pending_action(user_id, task_id, proposal)
                if created:
                    waiting = True

            store.update_task(
                task_id,
                status="waiting_approval" if waiting else "completed",
                result_summary=summary[:4000],
                completed_at=_iso_now(),
            )
            create_feed_item(
                user_id, "task",
                ("Needs your approval: " if waiting else "Done: ") + task["title"],
                body=summary[:2000],
                priority="medium" if waiting else "low",
                task_id=task_id,
                data={"status": "waiting_approval" if waiting else "completed"},
            )
            return store.get_task(task_id) or {}
        finally:
            reset_request_user_id(token)


def _iso_now() -> str:
    from harvie.core.turns import now_iso

    return now_iso()


def _split_proposals(answer: str) -> tuple[str, list[dict]]:
    """Pull the trailing proposed-actions JSON block out of a task answer."""
    proposals: list[dict] = []
    summary = answer
    for match in PROPOSED_BLOCK.finditer(answer):
        try:
            payload = json.loads(match.group(1))
        except ValueError:
            continue
        if isinstance(payload, dict) and isinstance(payload.get("proposed_actions"), list):
            proposals = [
                item for item in payload["proposed_actions"]
                if isinstance(item, dict) and item.get("app") and item.get("tool")
            ]
            summary = (answer[: match.start()] + answer[match.end():]).strip()
            break
    return summary or "(no summary)", proposals


def _progress_from_messages(messages: list) -> list[dict]:
    steps = []
    for message in messages:
        calls = getattr(message, "tool_calls", None) or []
        for call in calls:
            steps.append({
                "step": f"used {call.get('name', 'tool')}",
                "at": _iso_now(),
            })
    return steps[:20]


def _create_pending_action(user_id: str, task_id: str, proposal: dict) -> dict | None:
    from harvie.memory.pending_actions import create_pending_action

    try:
        return create_pending_action(
            user_id,
            kind=proposal.get("note", "Proposed by task")[:200],
            app=str(proposal.get("app", ""))[:64],
            tool=str(proposal.get("tool", ""))[:255],
            arguments=proposal.get("arguments") or {},
            source="task",
            task_id=task_id,
        )
    except Exception:
        logger.exception("Could not record proposed action for task %s", task_id)
        return None


task_worker = TaskWorker()
