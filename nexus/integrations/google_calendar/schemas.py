"""Pydantic input schemas for Google Calendar tools.

Keeps validation separate from execution.
"""

from pydantic import BaseModel, Field


class ListTodaysEventsInput(BaseModel):
    """Input for listing today's calendar events."""

    calendar_id: str | None = Field(
        default=None, description="Calendar ID to read; defaults to primary calendar"
    )
    time_zone: str | None = Field(
        default=None,
        description="IANA time zone for today's date, e.g. 'America/New_York'",
    )
    max_results: int = Field(default=20, description="Maximum number of events")
    account: str | list[str] | None = Field(
        default=None, description="Google account nickname(s) to query"
    )


class ListEventsInput(BaseModel):
    """Input for listing events in a date/time range."""

    start_time: str = Field(description="Range start as an ISO 8601 date/time")
    end_time: str = Field(description="Range end as an ISO 8601 date/time")
    calendar_id: str | None = Field(
        default=None, description="Calendar ID to read; defaults to primary calendar"
    )
    time_zone: str | None = Field(
        default=None, description="IANA time zone for interpreting the range"
    )
    max_results: int = Field(default=20, description="Maximum number of events")
    account: str | list[str] | None = Field(
        default=None, description="Google account nickname(s) to query"
    )


class GetEventInput(BaseModel):
    """Input for getting a specific event."""

    event_id: str = Field(description="Google Calendar event ID to read")
    calendar_id: str | None = Field(
        default=None, description="Calendar ID containing the event"
    )
    account: str | None = Field(default=None, description="Google account nickname")


class CreateEventInput(BaseModel):
    """Input for creating a calendar event."""

    summary: str = Field(description="Event title")
    start_time: str = Field(description="Event start as an ISO 8601 date/time")
    end_time: str = Field(description="Event end as an ISO 8601 date/time")
    calendar_id: str | None = Field(
        default=None, description="Calendar ID to create on; defaults to primary"
    )
    description: str | None = Field(default=None, description="Event description")
    location: str | None = Field(default=None, description="Event location")
    attendees: list[str] | None = Field(
        default=None, description="Attendee email addresses"
    )
    time_zone: str | None = Field(default=None, description="IANA time zone")
    all_day: bool | None = Field(default=None, description="Whether this is all day")
    add_google_meet_url: bool | None = Field(
        default=None, description="Whether to add a Google Meet URL"
    )
    account: str | None = Field(default=None, description="Google account nickname")
    send_updates: str | None = Field(
        default=None,
        description="Notification setting: 'all', 'externalOnly', or 'none'",
    )


class UpdateEventInput(BaseModel):
    """Input for updating a calendar event."""

    event_id: str = Field(description="Google Calendar event ID to update")
    calendar_id: str | None = Field(
        default=None, description="Calendar ID containing the event"
    )
    summary: str | None = Field(default=None, description="Updated event title")
    start_time: str | None = Field(
        default=None, description="Updated start as an ISO 8601 date/time"
    )
    end_time: str | None = Field(
        default=None, description="Updated end as an ISO 8601 date/time"
    )
    description: str | None = Field(default=None, description="Updated description")
    location: str | None = Field(default=None, description="Updated location")
    attendees: list[str] | None = Field(
        default=None, description="Attendee email addresses to add"
    )
    time_zone: str | None = Field(default=None, description="IANA time zone")
    all_day: bool | None = Field(
        default=None, description="Updated all-day event setting"
    )
    add_google_meet_url: bool | None = Field(
        default=None, description="Whether to add a Google Meet URL"
    )
    account: str | None = Field(default=None, description="Google account nickname")
    send_updates: str | None = Field(
        default=None,
        description="Notification setting: 'all', 'externalOnly', or 'none'",
    )


class DeleteEventInput(BaseModel):
    """Input for deleting a calendar event."""

    event_id: str = Field(description="Google Calendar event ID to delete")
    calendar_id: str | None = Field(
        default=None, description="Calendar ID containing the event"
    )
    account: str | None = Field(default=None, description="Google account nickname")
    send_updates: str = Field(
        default="all",
        description="Cancellation notification setting: 'all', 'externalOnly', or 'none'",
    )


class SearchEventsInput(BaseModel):
    """Input for searching calendar events."""

    query: str = Field(description="Keyword or phrase to search for")
    calendar_id: str | None = Field(
        default=None,
        description="Calendar ID for keyword filtering; defaults to primary search",
    )
    max_results: int = Field(default=10, description="Maximum number of results")
    start_time: str | None = Field(
        default=None, description="Search range start as an ISO 8601 date/time"
    )
    end_time: str | None = Field(
        default=None, description="Search range end as an ISO 8601 date/time"
    )
    time_zone: str | None = Field(
        default=None, description="IANA time zone for interpreting the range"
    )
    account: str | list[str] | None = Field(
        default=None, description="Google account nickname(s) to query"
    )
