"""APScheduler setup for the proactive loop and housekeeping.

Thread-based scheduler (the whole backend is synchronous). Jobs are wrapped so
one failing user never kills the schedule.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from harvie.core.config import settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _safe(fn):
    def wrapped(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Exception:
            logger.exception("Scheduled job %s failed", getattr(fn, "__name__", fn))
    return wrapped


def start_scheduler() -> BackgroundScheduler | None:
    """Start heartbeat, briefing, and session-cleanup jobs. Idempotent."""
    global _scheduler
    if not settings.LOOP_ENABLED or _scheduler is not None:
        return _scheduler

    from harvie.loops.briefing import run_morning_briefing
    from harvie.loops.heartbeat import run_heartbeat_sweep
    from harvie.memory.tier2_session import cleanup_expired_sessions

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _safe(run_heartbeat_sweep), "interval",
        minutes=max(5, settings.LOOP_HEARTBEAT_MINUTES),
        id="heartbeat", max_instances=1, coalesce=True,
    )
    _scheduler.add_job(
        _safe(run_morning_briefing), "cron",
        hour=max(0, min(23, settings.LOOP_BRIEFING_HOUR)), minute=0,
        id="briefing", max_instances=1, coalesce=True,
    )
    _scheduler.add_job(
        _safe(cleanup_expired_sessions), "interval",
        hours=1, id="session-cleanup", max_instances=1, coalesce=True,
    )
    _scheduler.start()
    logger.info(
        "Proactive loops scheduled: heartbeat every %smin, briefing at %s:00 UTC",
        settings.LOOP_HEARTBEAT_MINUTES, settings.LOOP_BRIEFING_HOUR,
    )
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
