"""LangChain tools for apps connected from the Connections page."""

from typing import Any

from langchain_core.tools import tool

from harvie.integrations.connected_apps.provider import connected_apps_provider
from harvie.integrations.connected_apps.schemas import FindAppToolsInput, ListConnectedAppsInput, RunAppToolInput


@tool(args_schema=ListConnectedAppsInput)
def connected_apps_list() -> str:
    """List the extra apps the user connected, such as Notion, GitHub, or HubSpot."""
    return connected_apps_provider.list_apps()


@tool(args_schema=FindAppToolsInput)
def connected_app_find_tools(app: str, query: str) -> str:
    """Find the actions an app offers for a task. Call this before connected_app_run_tool."""
    return connected_apps_provider.find_tools(app, query)


@tool(args_schema=RunAppToolInput)
def connected_app_run_tool(app: str, tool_slug: str, arguments: dict[str, Any] | None = None) -> str:
    """Run one action in a connected app. Reading is fine; confirm with the user before anything that creates, changes, sends, or deletes."""
    return connected_apps_provider.run_tool(app, tool_slug, arguments)


connected_apps_tools = [
    connected_apps_list,
    connected_app_find_tools,
    connected_app_run_tool,
]
