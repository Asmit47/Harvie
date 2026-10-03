"""Connection metadata shared by onboarding, chat cards, and the API."""

from typing import Literal

Toolkit = Literal["gmail", "googlecalendar"]

CONNECTORS = {
    "gmail": {
        "toolkit": "gmail",
        "label": "Gmail",
        "description": "Manage your inbox and draft replies",
    },
    "googlecalendar": {
        "toolkit": "googlecalendar",
        "label": "Google Calendar",
        "description": "Add, update, and reschedule events",
    },
}


def connection_card(toolkit: str, resume_message: str | None = None) -> dict:
    card = dict(CONNECTORS[toolkit])
    if resume_message:
        card["resume_message"] = resume_message
    return card
