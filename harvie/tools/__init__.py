"""Central tool registration and Jev-driven per-turn tool subsetting.

The LLM only sees the tool groups relevant to the current turn (chosen by the
Jev gate), while the executor keeps every registered tool available as a
safety net.
"""

from harvie.core.llm import llm
from harvie.core.tool_registry import registry
from harvie.memory.tier3_knowledge import save_knowledge, search_knowledge
from harvie.tools.open_loops import open_loop_tools
from harvie.integrations.gmail.tools import gmail_tools
from harvie.integrations.google_calendar.tools import google_calendar_tools
from harvie.integrations.google_docs.tools import google_docs_tools
from harvie.integrations.google_drive.tools import google_drive_tools
from harvie.integrations.google_tasks.tools import google_tasks_tools
from harvie.integrations.connected_apps.tools import connected_apps_tools
from harvie.integrations.slack.tools import slack_tools
from harvie.integrations.stripe.tools import stripe_tools
from harvie.integrations.websearch.tools import websearch_tools

# Register all tool groups via the central registry
registry.register([search_knowledge, save_knowledge])
registry.register(open_loop_tools)
registry.register(gmail_tools)
registry.register(google_calendar_tools)
registry.register(google_docs_tools)
registry.register(google_drive_tools)
registry.register(google_tasks_tools)
registry.register(slack_tools)
registry.register(stripe_tools)
registry.register(connected_apps_tools)
registry.register(websearch_tools)

ALL_TOOLS = registry.get_all_tools()

# Tool groups the Jev gate can switch on. Keys mirror GATED_APPS in harvie.core.jev.
APP_GROUPS: dict[str, list] = {
    "knowledge": [search_knowledge, save_knowledge],
    "open_loops": list(open_loop_tools),
    "gmail": list(gmail_tools),
    "calendar": list(google_calendar_tools),
    "docs": list(google_docs_tools),
    "drive": list(google_drive_tools),
    "tasks": list(google_tasks_tools),
    "slack": list(slack_tools),
    "stripe": list(stripe_tools),
    "connected_apps": list(connected_apps_tools),
    "websearch": list(websearch_tools),
}

# Always available even when Jev marks nothing relevant, so the model is never
# left without memory or tracking tools.
CORE_APPS = ("knowledge", "open_loops")


def tools_for_decision(decision: dict | None) -> list:
    """Return the tool subset a turn needs, per the Jev gate decision."""
    if not decision or decision.get("source") != "jev":
        return ALL_TOOLS
    apps = set(decision.get("relevant_apps") or ())
    apps.update(CORE_APPS)
    tools: list = []
    seen: set[str] = set()
    for app in apps:
        for tool in APP_GROUPS.get(app, []):
            if tool.name not in seen:
                seen.add(tool.name)
                tools.append(tool)
    return tools or ALL_TOOLS


llm_with_tools = llm.bind_tools(ALL_TOOLS)
