from langgraph.graph import END, START, StateGraph

from harvie.core.state import HarvieState
from harvie.memory.tier2_session import checkpointer
from harvie.nodes._routing import _route_after_answer, _route_after_context
from harvie.nodes.checkup import run_daily_checkup
from harvie.nodes.generate_answer import generate_answer
from harvie.nodes.load_context import load_context
from harvie.nodes.persist import persist_memory
from harvie.nodes.tool_executor import tool_executor

graph = StateGraph(HarvieState)

graph.add_node("load_context", load_context)
graph.add_node("run_daily_checkup", run_daily_checkup)
graph.add_node("generate_answer", generate_answer)
graph.add_node("tool_executor", tool_executor)
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
        "persist_memory": "persist_memory",
    },
)
graph.add_edge("tool_executor", "generate_answer")
graph.add_edge("persist_memory", END)

compiled_graph = graph.compile(checkpointer=checkpointer)
harvie_agent = compiled_graph

