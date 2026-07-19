"""LangChain tool wrappers for Google Calendar.

Each tool validates input via Pydantic schemas, calls the provider,
and returns a formatted string. Transport and authentication stay below the
provider layer.
"""

from langchain_core.tools import tool

from nexus.integrations.google_calendar.provider import google_calendar_provider
from nexus.integrations.google_calendar.schemas import (
    CreateEventInput,
    DeleteEventInput,
    GetEventInput,
    ListEventsInput,
    ListTodaysEventsInput,
    SearchEventsInput,
    UpdateEventInput,
)


@tool(args_schema=ListTodaysEventsInput)
def google_calendar_list_todays_events(
    calendar_id: str | None = None,
    time_zone: str | None = None,
    max_results: int = 20,
    account: str | list[str] | None = None,
) -> str:
    """List today's Google Calendar events, optionally for a calendar and time zone."""
    return google_calendar_provider.list_todays_events(
        calendar_id, time_zone, max_results, account
    )


@tool(args_schema=ListEventsInput)
def google_calendar_list_events(
    start_time: str,
    end_time: str,
    calendar_id: str | None = None,
    time_zone: str | None = None,
    max_results: int = 20,
    account: str | list[str] | None = None,
) -> str:
    """List Google Calendar events within an ISO 8601 date/time range."""
    return google_calendar_provider.list_events(
        start_time, end_time, calendar_id, time_zone, max_results, account
    )


@tool(args_schema=GetEventInput)
def google_calendar_get_event(
    event_id: str,
    calendar_id: str | None = None,
    account: str | None = None,
) -> str:
    """Get details for a specific Google Calendar event by event ID."""
    return google_calendar_provider.get_event(event_id, calendar_id, account)


@tool(args_schema=CreateEventInput)
def google_calendar_create_event(
    summary: str,
    start_time: str,
    end_time: str,
    calendar_id: str | None = None,
    description: str | None = None,
    location: str | None = None,
    attendees: list[str] | None = None,
    time_zone: str | None = None,
    all_day: bool | None = None,
    add_google_meet_url: bool | None = None,
    account: str | None = None,
    send_updates: str | None = None,
) -> str:
    """Create a Google Calendar event with title, start time, and end time."""
    return google_calendar_provider.create_event(
        summary,
        start_time,
        end_time,
        calendar_id,
        description,
        location,
        attendees,
        time_zone,
        all_day,
        add_google_meet_url,
        account,
        send_updates,
    )


@tool(args_schema=UpdateEventInput)
def google_calendar_update_event(
    event_id: str,
    calendar_id: str | None = None,
    summary: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    description: str | None = None,
    location: str | None = None,
    attendees: list[str] | None = None,
    time_zone: str | None = None,
    all_day: bool | None = None,
    add_google_meet_url: bool | None = None,
    account: str | None = None,
    send_updates: str | None = None,
) -> str:
    """Update a Google Calendar event by event ID."""
    return google_calendar_provider.update_event(
        event_id,
        calendar_id,
        summary,
        start_time,
        end_time,
        description,
        location,
        attendees,
        time_zone,
        all_day,
        add_google_meet_url,
        account,
        send_updates,
    )


@tool(args_schema=DeleteEventInput)
def google_calendar_delete_event(
    event_id: str,
    calendar_id: str | None = None,
    account: str | None = None,
    send_updates: str = "all",
) -> str:
    """Delete a Google Calendar event by event ID."""
    return google_calendar_provider.delete_event(
        event_id, calendar_id, account, send_updates
    )


@tool(args_schema=SearchEventsInput)
def google_calendar_search_events(
    query: str,
    calendar_id: str | None = None,
    max_results: int = 10,
    start_time: str | None = None,
    end_time: str | None = None,
    time_zone: str | None = None,
    account: str | list[str] | None = None,
) -> str:
    """Search Google Calendar events by keyword or phrase."""
    return google_calendar_provider.search_events(
        query, calendar_id, max_results, start_time, end_time, time_zone, account
    )


# Exported list for registration. This intentionally includes only Calendar tools.
google_calendar_tools = [
    google_calendar_list_todays_events,
    google_calendar_list_events,
    google_calendar_get_event,
    google_calendar_create_event,
    google_calendar_update_event,
    google_calendar_delete_event,
    google_calendar_search_events,
]
