from langchain_core.tools import tool

from nexus.memory.operational import complete_open_loop, create_open_loop, list_open_loops, snooze_open_loop, update_open_loop


@tool
def list_open_loops_tool() -> str:
    """List the user's unresolved tasks, commitments, follow-ups, waiting items, and questions."""
    loops = list_open_loops()
    return "No open loops." if not loops else "\n".join(f"- {item['id']}: [{item['type']}] {item['title']} (due {item['due_at'] or 'none'})" for item in loops)


@tool
def create_open_loop_tool(title: str, loop_type: str = "task", due_at: str = "", details: str = "", priority: str = "medium", source_type: str = "", source_id: str = "") -> str:
    """Create an unresolved task, commitment, follow_up, waiting item, or unresolved question. due_at must be ISO 8601 when provided."""
    try:
        item = create_open_loop(title, loop_type=loop_type, due_at=due_at or None, details=details, priority=priority, source_type=source_type or None, source_id=source_id or None)
        return f"Created open loop {item['id']}: {item['title']}"
    except ValueError as exc:
        return str(exc)


@tool
def update_open_loop_tool(loop_id: str, title: str = "", due_at: str = "", details: str = "", priority: str = "") -> str:
    """Update an existing open loop. Pass only values that should change."""
    item = update_open_loop(loop_id, title=title or None, due_at=due_at or None, details=details or None, priority=priority or None)
    return f"Updated open loop {loop_id}." if item else f"Open loop {loop_id} was not found."


@tool
def complete_open_loop_tool(loop_id: str) -> str:
    """Mark an open loop complete."""
    return f"Completed open loop {loop_id}." if complete_open_loop(loop_id) else f"Open loop {loop_id} was not found."


@tool
def snooze_open_loop_tool(loop_id: str, until: str) -> str:
    """Snooze an open loop until an ISO 8601 time."""
    return f"Snoozed open loop {loop_id} until {until}." if snooze_open_loop(loop_id, until) else f"Open loop {loop_id} was not found."


open_loop_tools = [list_open_loops_tool, create_open_loop_tool, update_open_loop_tool, complete_open_loop_tool, snooze_open_loop_tool]
