from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import time
import re

from nexus.core.graph import compiled_graph
from nexus.memory.tier2_session import generate_session_id, get_thread_config

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class CardDTO(BaseModel):
    id: str
    type: str  # 'calendar' | 'reminder' | 'task' | 'email' | 'mcp'
    title: str
    time: Optional[str] = None
    context: str
    actionLabel: Optional[str] = None
    actionUrl: Optional[str] = None
    priority: Optional[str] = "medium"  # 'low' | 'medium' | 'high'
    badge: Optional[str] = None
    zone: str  # 'left' | 'right'
    timestamp: str


class AttentionItemDTO(BaseModel):
    id: str
    type: str
    title: str
    priority: str
    due_at: Optional[str] = None
    reason: str
    source_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    attention_items: List[AttentionItemDTO] = []
    open_loop_ids: List[str] = []
    cards: List[CardDTO] = []
    has_tool_calls: bool = False


def extract_cards_from_result(user_input: str, answer: str, tool_results: List[str]) -> List[CardDTO]:
    cards: List[CardDTO] = []
    ts = time.strftime("%H:%M")
    query = user_input.lower()

    # 1. MCP / Tool execution card
    if tool_results:
        summary = " ".join(tool_results[:2])
        if len(summary) > 120:
            summary = summary[:117] + "..."
        cards.append(
            CardDTO(
                id=f"mcp-{int(time.time()*1000)}",
                type="mcp",
                title="MCP Execution Output",
                time=f"Completed • {ts}",
                context=summary or "Executed model context protocol tool.",
                badge="MCP Output",
                priority="high",
                zone="right",
                timestamp=ts,
            )
        )

    # 2. Calendar / Meeting detection
    if any(k in query or k in answer.lower() for k in ["meeting", "calendar", "schedule", "sync", "call", "appointment"]):
        # Extract potential time or title
        cards.append(
            CardDTO(
                id=f"cal-{int(time.time()*1000)}",
                type="calendar",
                title="Scheduled Event / Sync",
                time=ts,
                context=answer[:140] if len(answer) > 140 else answer,
                badge="Calendar",
                priority="high",
                zone="left",
                timestamp=ts,
            )
        )

    # 3. Task / Todo detection
    if any(k in query or k in answer.lower() for k in ["task", "todo", "action", "remind", "follow-up", "deploy", "review"]):
        cards.append(
            CardDTO(
                id=f"task-{int(time.time()*1000)}",
                type="task",
                title="Action Item / Task",
                time="Today",
                context=answer[:140] if len(answer) > 140 else answer,
                badge="Action Item",
                priority="medium",
                zone="right",
                timestamp=ts,
            )
        )

    # 4. Email / Draft detection
    if any(k in query or k in answer.lower() for k in ["email", "mail", "draft", "message"]):
        cards.append(
            CardDTO(
                id=f"mail-{int(time.time()*1000)}",
                type="email",
                title="Email / Message Draft",
                time="Drafted",
                context=answer[:140] if len(answer) > 140 else answer,
                badge="Email Draft",
                priority="high",
                zone="right",
                timestamp=ts,
            )
        )

    # 5. Demo / Test cards fallback if requested
    if not cards and any(k in query for k in ["demo", "card", "cards", "test"]):
        cards.extend([
            CardDTO(
                id=f"demo-1-{int(time.time()*1000)}",
                type="calendar",
                title="Design Sync: Nexus Spatial UI",
                time="2:30 PM • 45m",
                context="Discussion on spring physics & backend API integration.",
                badge="Upcoming",
                priority="high",
                zone="left",
                timestamp=ts,
            ),
            CardDTO(
                id=f"demo-2-{int(time.time()*1000)}",
                type="task",
                title="Deploy Next.js AppShell",
                time="Due Today",
                context="Push spatial layout & LangGraph API endpoints.",
                badge="Action Item",
                priority="high",
                zone="right",
                timestamp=ts,
            ),
        ])

    return cards


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    session_id = request.session_id or generate_session_id()
    config = get_thread_config(session_id)
    result = compiled_graph.invoke({"user_input": request.message}, config=config)
    
    answer = result.get("final_answer") or result.get("answer") or "Processed query."
    tool_results = result.get("tool_results") or []
    has_tools = bool(tool_results or result.get("messages") and len(result["messages"]) > 2)

    cards = extract_cards_from_result(request.message, answer, tool_results)

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        attention_items=result.get("attention_items") or [],
        open_loop_ids=[item["id"] for item in result.get("response_context", {}).get("relevant_open_loops", [])],
        cards=cards,
        has_tool_calls=has_tools,
    )
