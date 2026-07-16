from langgraph.prebuilt import ToolNode

from nexus.core.state import NexusState
from nexus.tools import ALL_TOOLS

_tool_executor = ToolNode(ALL_TOOLS)


def tool_executor(state: NexusState) -> NexusState:
    """Execute pending knowledge tool calls and append tool results to messages."""
    messages = list(state.get("messages") or [])
    result = _tool_executor.invoke({"messages": messages})
    tool_messages = result.get("messages", []) if isinstance(result, dict) else []
    return {**state, "messages": messages + tool_messages}
