"""Browsable directory of every Composio app a user can connect.

The Connections page needs hundreds of apps, each reduced to a name, a one-line
description, and a category. The full toolkit list is fetched once, filtered to
apps that are worth connecting, cached in memory and on disk, and refreshed
daily. When Composio is unreachable the curated Harvie connectors still work.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import time
from pathlib import Path
from typing import Any

from harvie.core.config import settings
from harvie.integrations.catalog import CONNECTORS

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 24 * 60 * 60
MIN_TOOLS = 20  # Apps with fewer actions are rarely useful to an assistant.
POPULAR_COUNT = 16
MAX_DESCRIPTION = 120
SLUG_PATTERN = re.compile(r"^[a-z0-9_]{1,64}$")

# Composio has ~80 fine-grained categories; the page groups them into a few.
CATEGORY_GROUPS: list[tuple[str, str, tuple[str, ...]]] = [
    ("communication", "Communication", (
        "email", "transactional email", "phone & sms", "communication", "team chat",
        "team collaboration", "video conferencing", "notifications", "webinars",
    )),
    ("productivity", "Productivity", (
        "productivity", "documents", "spreadsheets", "notes", "file management & storage",
        "content & files", "scheduling & booking", "calendar", "task management",
        "time tracking software", "forms & surveys", "signatures", "event management",
    )),
    ("projects", "Project management", ("project management", "product management")),
    ("developer", "Developer tools", (
        "developer tools", "databases", "server monitoring", "security & identity tools",
        "it operations", "app builder", "internet of things", "url shortener",
    )),
    ("ai", "AI", ("artificial intelligence", "transcription")),
    ("sales", "Sales & CRM", (
        "crm", "sales & crm", "contact management", "customer support", "call tracking",
    )),
    ("marketing", "Marketing", (
        "marketing automation", "marketing", "email newsletters", "drip emails",
        "social media marketing", "social media accounts", "ads & conversion",
        "customer appreciation",
    )),
    ("commerce", "Commerce", ("ecommerce", "e-commerce", "commerce", "website builders", "reviews")),
    ("finance", "Finance", (
        "accounting", "payment processing", "proposal & invoice management", "taxes", "fundraising",
    )),
    ("analytics", "Analytics", ("analytics", "business intelligence", "dashboards")),
    ("media", "Design & media", (
        "images & design", "video & audio", "gaming", "lifestyle & entertainment", "news & lifestyle",
    )),
    ("people", "People & learning", (
        "hr talent & recruitment", "human resources", "education", "online courses",
    )),
]
OTHER_GROUP = ("other", "Other")

_lock = threading.Lock()
_directory: dict[str, Any] | None = None
_loaded_at = 0.0


def _cache_path() -> Path:
    return Path(settings.COMPOSIO_CACHE_DIR) / "harvie_directory.json"


def _group_for(categories: list[str]) -> tuple[str, str]:
    for category in categories:
        name = category.lower()
        for group_id, label, members in CATEGORY_GROUPS:
            if name in members or (group_id == "ai" and name.startswith("ai ")):
                return group_id, label
    return OTHER_GROUP


def _one_sentence(text: str | None, fallback: str) -> str:
    """Reduce a marketing blurb to a short first sentence."""
    text = " ".join((text or "").split())
    if not text:
        return fallback
    match = re.match(r"(.+?[.!?])(?:\s|$)", text)
    sentence = match.group(1) if match else text
    if len(sentence) > MAX_DESCRIPTION:
        sentence = sentence[: MAX_DESCRIPTION - 1].rsplit(" ", 1)[0].rstrip(",;:- ") + "…"
    return sentence


def _curated_directory() -> dict[str, Any]:
    """Fallback used when the Composio catalog cannot be fetched."""
    apps = [
        {
            "slug": slug,
            "name": meta["label"],
            "description": meta["description"],
            "category": "productivity",
            "category_label": "Productivity",
        }
        for slug, meta in CONNECTORS.items()
    ]
    return _assemble(apps)


def _assemble(apps: list[dict[str, Any]]) -> dict[str, Any]:
    counts: dict[str, int] = {}
    labels: dict[str, str] = {}
    for app in apps:
        counts[app["category"]] = counts.get(app["category"], 0) + 1
        labels[app["category"]] = app["category_label"]
    order = [group_id for group_id, _, _ in CATEGORY_GROUPS] + [OTHER_GROUP[0]]
    categories = [
        {"id": group_id, "label": labels[group_id], "count": counts[group_id]}
        for group_id in order
        if group_id in counts
    ]
    return {
        "apps": apps,
        "categories": categories,
        "popular": [app["slug"] for app in apps[:POPULAR_COUNT]],
    }


def _fetch_from_composio() -> dict[str, Any]:
    from harvie.integrations.composio.session import session_manager

    client = session_manager.initialize().client
    items: list[Any] = []
    cursor: str | None = None
    for _ in range(10):
        params: dict[str, Any] = {"limit": 1000, "sort_by": "usage"}
        if cursor:
            params["cursor"] = cursor
        page = client.toolkits.list(**params)
        items.extend(page.items)
        cursor = page.next_cursor
        if not cursor:
            break

    apps: list[dict[str, Any]] = []
    for item in items:
        meta = item.meta
        categories = [category.name for category in (meta.categories or [])]
        if item.no_auth or "model context protocol" in categories:
            continue
        if (meta.tools_count or 0) < MIN_TOOLS or not SLUG_PATTERN.match(item.slug):
            continue
        group_id, group_label = _group_for(categories)
        apps.append({
            "slug": item.slug,
            "name": item.name,
            "description": _one_sentence(meta.description, f"Connect {item.name} to Harvie."),
            "category": group_id,
            "category_label": group_label,
        })
    if not apps:
        raise RuntimeError("Composio returned no connectable apps.")
    return _assemble(apps)


def _read_disk_cache() -> tuple[dict[str, Any], float] | None:
    path = _cache_path()
    try:
        payload = json.loads(path.read_text())
        return payload["directory"], float(payload["fetched_at"])
    except (OSError, ValueError, KeyError):
        return None


def _write_disk_cache(directory: dict[str, Any]) -> None:
    path = _cache_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"fetched_at": time.time(), "directory": directory}))
    except OSError:
        logger.info("Could not write the Composio directory cache", exc_info=True)


def get_directory(force: bool = False) -> dict[str, Any]:
    """Return the cached directory, refreshing it when stale."""
    global _directory, _loaded_at
    with _lock:
        now = time.time()
        if _directory is not None and not force and now - _loaded_at < CACHE_TTL_SECONDS:
            return _directory

        if _directory is None and not force:
            cached = _read_disk_cache()
            if cached and now - cached[1] < CACHE_TTL_SECONDS:
                _directory, _loaded_at = cached[0], cached[1]
                return _directory

        if settings.COMPOSIO_API_KEY:
            try:
                _directory = _fetch_from_composio()
                _loaded_at = now
                _write_disk_cache(_directory)
                return _directory
            except Exception:
                logger.warning("Could not fetch the Composio directory", exc_info=True)

        if _directory is None:
            stale = _read_disk_cache()
            _directory = stale[0] if stale else _curated_directory()
        _loaded_at = now - CACHE_TTL_SECONDS + 5 * 60  # Retry in five minutes.
        return _directory


def known_toolkit(slug: str) -> bool:
    """Whether a slug is a curated connector or a directory app."""
    if slug in CONNECTORS:
        return True
    if not SLUG_PATTERN.match(slug):
        return False
    return any(app["slug"] == slug for app in get_directory()["apps"])


def toolkit_label(slug: str) -> str:
    """Human name for any toolkit slug."""
    if slug in CONNECTORS:
        return CONNECTORS[slug]["label"]
    for app in get_directory()["apps"]:
        if app["slug"] == slug:
            return app["name"]
    return slug.replace("_", " ").title()
