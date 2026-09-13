from harvie.core.llm import llm
from harvie.core.tool_registry import registry
from harvie.memory.tier3_knowledge import save_knowledge, search_knowledge
from harvie.tools.open_loops import open_loop_tools
from harvie.integrations.google_calendar.tools import google_calendar_tools
from harvie.integrations.gmail.tools import gmail_tools

# Register all tool groups via the central registry
registry.register([search_knowledge, save_knowledge])
registry.register(open_loop_tools)
registry.register(gmail_tools)
registry.register(google_calendar_tools)

ALL_TOOLS = registry.get_all_tools()
llm_with_tools = llm.bind_tools(ALL_TOOLS)
