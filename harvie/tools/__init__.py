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

ALL_TOOLS = registry.get_all_tools()
llm_with_tools = llm.bind_tools(ALL_TOOLS)
