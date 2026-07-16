from nexus.core.state import NexusState
from nexus.integrations.gmail.provider import gmail_provider


def run_daily_checkup(state: NexusState) -> NexusState:
    """Fetch real email data plus placeholder data for calendar and other tools."""
    try:
        email_summary = gmail_provider.search_emails(
            "is:unread newer_than:1d",
            max_results=5,
        )
    except Exception:
        email_summary = "Could not fetch emails - Gmail connection unavailable."

    return {
        **state,
        "tool_results": [
            "Calendar MCP tool is not connected yet.",
            f"Recent unread emails:\n{email_summary}",
            "Additional business MCP tools are not connected yet.",
        ],
    }
