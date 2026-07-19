from nexus.core.state import NexusState
from nexus.integrations.google_calendar.provider import google_calendar_provider
from nexus.integrations.gmail.provider import gmail_provider


def run_daily_checkup(state: NexusState) -> NexusState:
    """Fetch real email and calendar data plus placeholder data for other tools."""
    try:
        calendar_summary = google_calendar_provider.list_todays_events(max_results=10)
    except Exception:
        calendar_summary = "Could not fetch calendar events - Calendar connection unavailable."

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
            f"Today's calendar events:\n{calendar_summary}",
            f"Recent unread emails:\n{email_summary}",
            "Additional business tools are not connected yet.",
        ],
    }
