"""Google Calendar business logic layer."""

import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from nexus.integrations.composio.session import IntegrationError, session_manager

logger = logging.getLogger(__name__)


class GoogleCalendarProvider:
    """High-level Google Calendar operations backed by the shared Composio session."""

    def list_todays_events(
        self,
        calendar_id: str | None = None,
        time_zone: str | None = None,
        max_results: int = 20,
        account: str | list[str] | None = None,
    ) -> str:
        """List events for today."""
        tzinfo = self._zone_info(time_zone)
        today = datetime.now(tzinfo).date() if tzinfo else datetime.now().date()
        start = datetime.combine(today, time.min, tzinfo=tzinfo)
        end = start + timedelta(days=1)
        return self.list_events(
            start_time=start.isoformat(),
            end_time=end.isoformat(),
            calendar_id=calendar_id,
            time_zone=time_zone,
            max_results=max_results,
            account=account,
        )

    def list_events(
        self,
        start_time: str,
        end_time: str,
        calendar_id: str | None = None,
        time_zone: str | None = None,
        max_results: int = 20,
        account: str | list[str] | None = None,
    ) -> str:
        """List events within a date/time range."""
        args: dict = {
            "calendarId": calendar_id or "primary",
            "timeMin": start_time,
            "timeMax": end_time,
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if time_zone:
            args["timeZone"] = time_zone
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_EVENTS_LIST",
                args,
                account=account if isinstance(account, str) else None,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.list_events failed")
            return f"Error listing calendar events: {exc}"

    def get_event(
        self,
        event_id: str,
        calendar_id: str | None = None,
        account: str | None = None,
    ) -> str:
        """Get a specific event by ID."""
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_EVENTS_GET",
                {"calendarId": calendar_id or "primary", "eventId": event_id},
                account=account,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.get_event failed")
            return f"Error reading calendar event: {exc}"

    def create_event(
        self,
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
        """Create a calendar event."""
        duration_hours, duration_minutes = self._duration_parts(start_time, end_time)
        args: dict = {
            "calendar_id": calendar_id or "primary",
            "summary": summary,
            "start_datetime": start_time.split("T", 1)[0] if all_day else start_time,
            "event_duration_hour": duration_hours,
            "event_duration_minutes": duration_minutes,
        }
        self._add_optional_event_fields(
            args,
            description=description,
            location=location,
            attendees=attendees,
            time_zone=time_zone,
            add_google_meet_url=add_google_meet_url,
            send_updates=send_updates,
        )
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_CREATE_EVENT",
                args,
                account=account,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.create_event failed")
            return f"Error creating calendar event: {exc}"

    def update_event(
        self,
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
        """Update a calendar event."""
        args: dict = {"calendar_id": calendar_id or "primary", "event_id": event_id}
        if summary:
            args["summary"] = summary
        if start_time:
            args["start_datetime"] = start_time.split("T", 1)[0] if all_day else start_time
        if start_time and end_time:
            duration_hours, duration_minutes = self._duration_parts(start_time, end_time)
            args["event_duration_hour"] = duration_hours
            args["event_duration_minutes"] = duration_minutes
        self._add_optional_event_fields(
            args,
            description=description,
            location=location,
            attendees=attendees,
            time_zone=time_zone,
            add_google_meet_url=add_google_meet_url,
            send_updates=send_updates,
        )
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_PATCH_EVENT",
                args,
                account=account,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.update_event failed")
            return f"Error updating calendar event: {exc}"

    def delete_event(
        self,
        event_id: str,
        calendar_id: str | None = None,
        account: str | None = None,
        send_updates: str = "all",
    ) -> str:
        """Delete a calendar event."""
        args: dict = {"calendar_id": calendar_id or "primary", "event_id": event_id}
        send_updates_bool = self._send_updates_bool(send_updates)
        if send_updates_bool is not None:
            args["send_updates"] = send_updates_bool
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_DELETE_EVENT",
                args,
                account=account,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.delete_event failed")
            return f"Error deleting calendar event: {exc}"

    def search_events(
        self,
        query: str,
        calendar_id: str | None = None,
        max_results: int = 10,
        start_time: str | None = None,
        end_time: str | None = None,
        time_zone: str | None = None,
        account: str | list[str] | None = None,
    ) -> str:
        """Search events by keyword."""
        time_min, time_max = self._default_search_range(start_time, end_time)
        args: dict = {
            "calendar_id": calendar_id or "primary",
            "query": query,
            "maxResults": max_results,
            "timeMin": time_min,
            "timeMax": time_max,
        }
        if time_zone:
            args["timeZone"] = time_zone
        try:
            return session_manager.execute(
                "googlecalendar",
                "GOOGLECALENDAR_FIND_EVENT",
                args,
                account=account if isinstance(account, str) else None,
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "googlecalendar")
        except Exception as exc:
            logger.exception("google_calendar.search_events failed")
            return f"Error searching calendar events: {exc}"

    def _add_optional_event_fields(
        self,
        args: dict,
        description: str | None = None,
        location: str | None = None,
        attendees: list[str] | None = None,
        time_zone: str | None = None,
        add_google_meet_url: bool | None = None,
        send_updates: str | None = None,
    ) -> None:
        if description:
            args["description"] = description
        if location:
            args["location"] = location
        if attendees:
            args["attendees"] = attendees
        if time_zone:
            args["timezone"] = time_zone
        if add_google_meet_url is not None:
            args["create_meeting_room"] = add_google_meet_url
        send_updates_bool = self._send_updates_bool(send_updates)
        if send_updates_bool is not None:
            args["send_updates"] = send_updates_bool

    def _duration_parts(self, start_time: str, end_time: str) -> tuple[int, int]:
        start = self._parse_datetime(start_time)
        end = self._parse_datetime(end_time)
        if not start or not end or end <= start:
            return 0, 30
        total_minutes = int((end - start).total_seconds() // 60)
        hours, minutes = divmod(total_minutes, 60)
        return hours, minutes

    def _parse_datetime(self, value: str) -> datetime | None:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    def _send_updates_bool(self, value: str | None) -> bool | None:
        if value is None:
            return None
        return value != "none"

    def _default_search_range(
        self,
        start_time: str | None,
        end_time: str | None,
    ) -> tuple[str, str]:
        """Search requires a range; use a broad one when the user only gives keywords."""
        if start_time and end_time:
            return start_time, end_time
        now = datetime.now()
        return (
            (now - timedelta(days=365)).isoformat(timespec="seconds"),
            (now + timedelta(days=365)).isoformat(timespec="seconds"),
        )

    def _zone_info(self, time_zone: str | None) -> ZoneInfo | None:
        """Return ZoneInfo for a provided time zone, or None for local time."""
        if not time_zone:
            return None
        try:
            return ZoneInfo(time_zone)
        except ZoneInfoNotFoundError:
            logger.warning("google_calendar.invalid_time_zone: %s", time_zone)
            return None


google_calendar_provider = GoogleCalendarProvider()
