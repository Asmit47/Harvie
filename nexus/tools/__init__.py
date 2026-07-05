from nexus.core.llm import llm
from nexus.memory.tier3_knowledge import save_knowledge, search_knowledge

knowledge_tools = [search_knowledge, save_knowledge]
ALL_TOOLS = knowledge_tools
llm_with_tools = llm.bind_tools(knowledge_tools)

