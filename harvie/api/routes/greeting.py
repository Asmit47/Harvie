from fastapi import APIRouter

from harvie.core.greeting import get_greeting, get_time_period

router = APIRouter()


@router.get("/greeting")
def get_bootup_greeting() -> dict[str, str]:
    """Return the time-based bootup greeting text."""
    return {"period": get_time_period(), "greeting": get_greeting()}
