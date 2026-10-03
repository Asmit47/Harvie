"""Time-based bootup greetings for Harvie.

The greeting is derived from the current time period on the server, so the
frontend never has to compute it and there is no LLM call involved. Time
detection and the message text are kept separate so both are easy to tweak.
"""

from __future__ import annotations

from datetime import datetime

#: One-line greeting variants per time period. Edit freely.
GREETINGS: dict[str, tuple[str, ...]] = {
    "morning": (
        "Good morning. What are we working on?",
    ),
    "afternoon": (
        "Hi. What needs your attention?",
    ),
    "evening": (
        "Good evening. What are we working on?",
    ),
    "late_night": (
        "Hi. What should we finish up?",
    ),
}

#: Hour boundaries for each period (local server time).
MORNING_END = 12
AFTERNOON_END = 17
EVENING_END = 21


def get_time_period(now: datetime | None = None) -> str:
    """Return the time period (morning/afternoon/evening/late_night) for `now`."""
    hour = (now or datetime.now()).hour
    if hour < MORNING_END:
        return "morning"
    if hour < AFTERNOON_END:
        return "afternoon"
    if hour < EVENING_END:
        return "evening"
    return "late_night"


def get_greeting(now: datetime | None = None) -> str:
    """Return one quiet boot greeting for the current time period."""
    return GREETINGS[get_time_period(now)][0]
