"""Time-based bootup greetings for Nexus.

The greeting is derived from the current time period on the server, so the
frontend never has to compute it and there is no LLM call involved. Time
detection and the message text are kept separate so both are easy to tweak.
"""

from __future__ import annotations

import random
from datetime import datetime

#: One-line greeting variants per time period. Edit freely.
GREETINGS: dict[str, tuple[str, ...]] = {
    "morning": (
        "Morning, boss. What are we getting into today?",
        "Morning, boss. What's first on the list?",
        "Morning, boss. What are we knocking out?",
    ),
    "afternoon": (
        "Afternoon, boss. What needs your attention?",
        "Afternoon, boss. What's next on the list?",
        "Afternoon, boss. What should I dig into?",
    ),
    "evening": (
        "Evening, boss. What are we working on?",
        "Evening, boss. What's still open?",
        "Evening, boss. What do we need to wrap up?",
    ),
    "late_night": (
        "Still up, boss? What's on the list?",
        "Late night, boss. What do we need done?",
        "Still going, boss? What's next?",
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
    """Pick a greeting variation for the current time period."""
    return random.choice(GREETINGS[get_time_period(now)])
