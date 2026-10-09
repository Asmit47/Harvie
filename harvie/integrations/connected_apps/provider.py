"""Generic access to any app the user connected through Composio.

Curated connectors (Gmail, Slack, and so on) have dedicated tools. Everything
else on the Connections page is reached through find-then-run, with the action
slug checked against the app so a call can never cross into another app.
"""

import json
import re

from harvie.integrations.catalog import CONNECTORS
from harvie.integrations.composio.directory import known_toolkit
from harvie.integrations.composio.session import IntegrationError, run_action, session_manager

SLUG = re.compile(r"^[a-z0-9_]{1,64}$")


def _error(message: str) -> str:
    return json.dumps({"ok": False, "error": {"message": message}})


class ConnectedAppsProvider:
    def list_apps(self) -> str:
        try:
            connected = session_manager.connected_toolkits()
        except IntegrationError as exc:
            return _error(str(exc))
        extra = [slug for slug in connected if slug not in CONNECTORS]
        return json.dumps({
            "connected_apps": extra,
            "note": "Gmail, Calendar, Docs, Drive, Tasks, Slack, and Stripe have their own dedicated tools.",
        })

    def find_tools(self, app: str, query: str) -> str:
        app = app.strip().lower()
        if not SLUG.match(app) or not known_toolkit(app):
            return _error(f"'{app}' is not an app Harvie can connect.")
        try:
            return json.dumps({"app": app, "tools": session_manager.find_tools(app, query)}, indent=2)
        except IntegrationError as exc:
            return _error(str(exc))

    def run_tool(self, app: str, tool_slug: str, arguments: dict | None) -> str:
        app = app.strip().lower()
        slug = tool_slug.strip().upper()
        if not SLUG.match(app) or not known_toolkit(app):
            return _error(f"'{app}' is not an app Harvie can connect.")
        if app in CONNECTORS:
            return _error(f"Use the dedicated {app} tools instead.")
        if not slug.startswith(f"{app.upper()}_"):
            return _error(f"{slug} does not belong to {app}. Use a slug from connected_app_find_tools.")
        return run_action(app, slug, arguments or {})


connected_apps_provider = ConnectedAppsProvider()
