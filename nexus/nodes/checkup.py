from nexus.core.state import NexusState
from nexus.tools.mcp_placeholders import check_calendar, check_email, check_other_tools


def run_daily_checkup(state: NexusState) -> NexusState:
    """Call all daily-checkup MCP tool placeholders."""
    return {
        **state,
        "tool_results": [check_calendar(), check_email(), check_other_tools()],
    }

