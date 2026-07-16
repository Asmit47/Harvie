from nexus.core.llm import llm
from nexus.core.tool_registry import registry
from nexus.memory.tier3_knowledge import save_knowledge, search_knowledge
from nexus.integrations.gmail.tools import gmail_tools

# Register all tool groups via the central registry
registry.register([search_knowledge, save_knowledge])
registry.register(gmail_tools)

ALL_TOOLS = registry.get_all_tools()
llm_with_tools = llm.bind_tools(ALL_TOOLS)

