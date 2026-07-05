from langgraph.graph import END, START, StateGraph

from nexus.core.state import NexusState
from nexus.memory.tier2_session import checkpointer
from nexus.nodes._routing import (
    _route_after_answer,
    _route_after_context,
    _route_after_relevance,
)
from nexus.nodes.checkup import run_daily_checkup
from nexus.nodes.generate_answer import generate_answer
from nexus.nodes.load_context import load_context
from nexus.nodes.persist import persist_memory
from nexus.nodes.relevance import check_relevance, repair_answer
from nexus.nodes.tool_executor import tool_executor

graph = StateGraph(NexusState)

graph.add_node("load_context", load_context)
graph.add_node("run_daily_checkup", run_daily_checkup)
graph.add_node("generate_answer", generate_answer)
graph.add_node("tool_executor", tool_executor)
graph.add_node("check_relevance", check_relevance)
graph.add_node("repair_answer", repair_answer)
graph.add_node("persist_memory", persist_memory)

graph.add_edge(START, "load_context")
graph.add_conditional_edges(
    "load_context",
    _route_after_context,
    {
        "run_daily_checkup": "run_daily_checkup",
        "generate_answer": "generate_answer",
    },
)

graph.add_edge("run_daily_checkup", "generate_answer")
graph.add_conditional_edges(
    "generate_answer",
    _route_after_answer,
    {
        "tool_executor": "tool_executor",
        "check_relevance": "check_relevance",
    },
)
graph.add_edge("tool_executor", "generate_answer")

graph.add_conditional_edges(
    "check_relevance",
    _route_after_relevance,
    {
        "persist_memory": "persist_memory",
        "repair_answer": "repair_answer",
    },
)
graph.add_edge("repair_answer", "persist_memory")
graph.add_edge("persist_memory", END)

compiled_graph = graph.compile(checkpointer=checkpointer)
nexus_agent = compiled_graph

