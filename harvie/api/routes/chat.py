from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Any, List, Optional
import json
import logging
import time
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from langchain_core.messages import SystemMessage

from harvie.api.routes.profile import ProfileResponse, profile_response
from harvie.api.routes.session import SessionDetail, create_session, get_session, list_sessions
from harvie.core.graph import compiled_graph
from harvie.core.onboarding import WELCOME_SESSION_ID, completion_update, initial_state, plan_reply
from harvie.core.turns import assistant_turn, user_turn
from harvie.integrations.catalog import CONNECTORS, Toolkit, connection_card
from harvie.integrations.composio.session import IntegrationError, session_manager
from harvie.memory.conversation import conversation_lock, flush_profile_update, read_state, write_state
from harvie.memory.persona import get_persona
from harvie.memory.tier2_session import get_thread_config
from harvie.memory.persona_learning import learn_persona_from_message

router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20000)
    session_id: Optional[str] = Field(default=None, min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    request_id: Optional[str] = Field(default=None, min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_-]+$")
    prompt_id: str | None = None
    choice_id: str | None = None

    @field_validator("message")
    @classmethod
    def clean_message(cls, message: str) -> str:
        if not message.strip():
            raise ValueError("Enter a message before sending.")
        return message.strip()

    @model_validator(mode="after")
    def validate_choice(self):
        if bool(self.prompt_id) != bool(self.choice_id):
            raise ValueError("A choice must include its prompt ID.")
        return self


class StartChatRequest(BaseModel):
    timezone: str | None = Field(default=None, max_length=100)

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str | None) -> str | None:
        if value:
            try:
                ZoneInfo(value)
            except (ZoneInfoNotFoundError, ValueError) as exc:
                raise ValueError("Use a valid IANA timezone.") from exc
        return value or None


class WorkspaceResponse(BaseModel):
    profile: ProfileResponse
    session: SessionDetail


class CompleteConnectionRequest(BaseModel):
    session_id: str = Field(min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    toolkit: Toolkit


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


class ConnectionRequestDTO(BaseModel):
    toolkit: str
    label: str
    authorization_url: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    attention_items: List[AttentionItemDTO] = []
    open_loop_ids: List[str] = []
    cards: List[CardDTO] = []
    has_tool_calls: bool = False
    connection_request: Optional[ConnectionRequestDTO] = None
    session: SessionDetail
    profile: ProfileResponse
    response_source: str = "llm"


def _message_text(message: Any) -> str:
    content = getattr(message, "content", message)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            str(item.get("text", ""))
            for item in content
            if isinstance(item, dict) and item.get("text")
        )
    return str(content)


def extract_connection_request(result: dict, tool_results: List[str]) -> ConnectionRequestDTO | None:
    """Turn a provider's structured missing-connection error into UI data."""
    candidates = list(tool_results)
    candidates.extend(
        _message_text(message) for message in result.get("messages") or []
        if getattr(message, "type", None) == "tool"
    )

    for candidate in candidates:
        try:
            candidate = str(candidate)
            start, end = candidate.find("{"), candidate.rfind("}")
            if start < 0 or end <= start:
                continue
            payload = json.loads(candidate[start : end + 1])
        except (TypeError, ValueError):
            continue

        error = payload.get("error") if isinstance(payload, dict) else None
        toolkit = error.get("toolkit") if isinstance(error, dict) else None
        if toolkit == "calendar":
            toolkit = "googlecalendar"
        if not isinstance(toolkit, str) or toolkit not in CONNECTORS or error.get("type") != "ConnectionRequiredError":
            continue
        return ConnectionRequestDTO(
            toolkit=toolkit,
            label=CONNECTORS[toolkit]["label"],
            authorization_url=error.get("authorization_url"),
        )
    return None


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
                title="Design Sync: Harvie Spatial UI",
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


def _ensure_welcome(persona: dict, timezone: str | None = None) -> str:
    state = read_state(WELCOME_SESSION_ID)
    if not state:
        state = write_state(WELCOME_SESSION_ID, initial_state(persona, timezone))
    flush_profile_update(WELCOME_SESSION_ID, state)
    return WELCOME_SESSION_ID


def _workspace_response(session_id: str) -> WorkspaceResponse:
    return WorkspaceResponse(profile=profile_response(), session=get_session(session_id))


@router.post("/chat/start", response_model=WorkspaceResponse)
def start_chat(request: StartChatRequest | None = None) -> WorkspaceResponse:
    """Idempotently initialize the welcome or resume the user's latest thread."""
    with conversation_lock():
        persona = get_persona()
        if not persona["onboarding_complete"]:
            session_id = _ensure_welcome(persona, request.timezone if request else None)
        else:
            sessions = list_sessions()
            if sessions:
                session_id = sessions[0].id
                flush_profile_update(session_id, read_state(session_id))
            else:
                session_id = create_session().id
                name = persona["profile"]["name"]["value"]
                write_state(session_id, {"conversation_history": [assistant_turn(
                    f"Hey, {name}. What are we working on?" if name else "Hey. What are we working on?",
                    source="system",
                )]})
        return _workspace_response(session_id)


def _selected_choice(state: dict, request: ChatRequest) -> dict | None:
    if not request.choice_id:
        return None
    prompt = next((turn for turn in state.get("conversation_history", []) if turn.get("id") == request.prompt_id), None)
    choice = next((item for item in (prompt or {}).get("choices", []) if item["id"] == request.choice_id), None)
    if not choice or choice["value"] != request.message:
        raise HTTPException(status_code=422, detail="This conversation choice is invalid.")
    if choice["kind"] == "onboarding" and choice.get("stage") != state.get("onboarding_stage"):
        raise HTTPException(status_code=409, detail="That welcome step is already finished. Continue with the latest message.")
    return choice


def _chat_response(session_id: str, request: ChatRequest, replies: list[dict], result: dict | None = None) -> ChatResponse:
    result = result or {}
    answer = "\n\n".join(turn["content"] for turn in replies)
    tool_results = result.get("tool_results") or []
    connection = extract_connection_request(result, tool_results)
    return ChatResponse(
        answer=answer,
        session_id=session_id,
        session=get_session(session_id),
        profile=profile_response(),
        response_source=replies[0].get("source", "llm") if replies else "llm",
        attention_items=result.get("attention_items") or [],
        open_loop_ids=[item["id"] for item in result.get("response_context", {}).get("relevant_open_loops", [])],
        cards=extract_cards_from_result(request.message, answer, tool_results) if result else [],
        has_tool_calls=bool(tool_results or any(getattr(message, "tool_calls", None) for message in result.get("messages", []))),
        connection_request=connection,
    )


def _finish_llm_turn(session_id: str, state: dict, request: ChatRequest) -> dict:
    """Also usable after a crash between the graph's reply and API enrichment."""
    history = list(state.get("conversation_history", []))
    connection = extract_connection_request(state, state.get("tool_results") or [])
    updates = {}
    if connection and not history[-1].get("connections"):
        history[-1] = {**history[-1], "connections": [connection_card(connection.toolkit, request.message)]}
        updates["conversation_history"] = history
    if state.get("onboarding_stage") == "connections" and not connection:
        updates.update(completion_update())
    if updates:
        state = write_state(session_id, updates)
    return flush_profile_update(session_id, state)


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    with conversation_lock():
        persona = get_persona()
        session_id = request.session_id
        if not session_id:
            session_id = _ensure_welcome(persona) if not persona["onboarding_complete"] else create_session().id
        state = read_state(session_id)
        if not state:
            raise HTTPException(status_code=404, detail="Session not found.")
        state = flush_profile_update(session_id, state)
        if persona["onboarding_complete"] and state.get("onboarding_stage") not in (None, "complete"):
            state = write_state(session_id, {"onboarding_stage": "complete"})

        request_id = request.request_id or uuid4().hex
        turn_id = f"user:{request_id}"
        history = list(state.get("conversation_history", []))
        previous = next((turn for turn in history if turn.get("id") == turn_id), None)
        if previous and previous["content"] != request.message:
            raise HTTPException(status_code=409, detail="This request ID was already used for another message.")
        if previous and previous.get("choice_id"):
            if request.choice_id and (request.choice_id, request.prompt_id) != (previous["choice_id"], previous["prompt_id"]):
                raise HTTPException(status_code=409, detail="This request ID was already used for another choice.")
            request = request.model_copy(update={"choice_id": previous["choice_id"], "prompt_id": previous["prompt_id"]})
        replies = [turn for turn in history if turn.get("reply_to") == turn_id]
        if replies:
            latest_reply = history[-1].get("id") == replies[-1].get("id")
            if latest_reply and replies[0].get("source") == "llm":
                state = _finish_llm_turn(session_id, state, request)
                replies = [turn for turn in state["conversation_history"] if turn.get("reply_to") == turn_id]
            return _chat_response(session_id, request, replies, state if latest_reply and replies[0].get("source") == "llm" else None)

        choice = _selected_choice(state, request)
        if not previous:
            history.append({
                **user_turn(request.message, request_id),
                "prompt_id": request.prompt_id,
                "choice_id": request.choice_id,
            })
            state = write_state(session_id, {"conversation_history": history})
        plan = plan_reply(state, request.message, choice)
        if plan:
            replies = [{**turn, "reply_to": turn_id} for turn in plan.pop("turns")]
            state = write_state(session_id, {**plan, "conversation_history": history + replies})
            flush_profile_update(session_id, state)
            return _chat_response(session_id, request, replies)

        try:
            snapshot = compiled_graph.get_state(get_thread_config(session_id))
            resume = previous and state.get("chat_request_id") == request_id and snapshot.next
            result = compiled_graph.invoke(
                None if resume else {"user_input": request.message, "chat_request_id": request_id},
                config=get_thread_config(session_id),
            )
        except Exception as exc:
            logger.exception("Could not generate a chat reply")
            raise HTTPException(status_code=503, detail="Harvie couldn't reply just now. Your message is saved; try again.") from exc

        state = _finish_llm_turn(session_id, dict(result), request)
        try:
            learn_persona_from_message(request.message)
        except Exception:
            logger.info("Could not save learned persona facts", exc_info=True)
        replies = [turn for turn in state.get("conversation_history", []) if turn.get("reply_to") == turn_id]
        return _chat_response(session_id, request, replies, result)


@router.post("/chat/connections/complete", response_model=WorkspaceResponse)
def complete_connection(request: CompleteConnectionRequest) -> WorkspaceResponse:
    """Record OAuth completion only after Composio verifies this user's account."""
    with conversation_lock():
        state = read_state(request.session_id)
        if not state:
            raise HTTPException(status_code=404, detail="Session not found.")
        state = flush_profile_update(request.session_id, state)
        history = list(state.get("conversation_history", []))
        card = next((
            card for turn in reversed(history) for card in turn.get("connections", [])
            if card["toolkit"] == request.toolkit
        ), None)
        if not card:
            raise HTTPException(status_code=422, detail="This app hasn't been offered in this conversation.")
        try:
            connected = session_manager.is_connected(request.toolkit)
        except IntegrationError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        if not connected:
            raise HTTPException(status_code=409, detail="This account isn't connected yet. Finish approving access first.")
        confirmation_id = f"connection:{request.toolkit}"
        if any(turn.get("id") == confirmation_id for turn in history) and state.get("onboarding_stage") != "connections":
            return _workspace_response(request.session_id)
        if not any(turn.get("id") == confirmation_id for turn in history):
            resume = card.get("resume_message")
            choices = [{"id": "resume-request", "label": "Continue my request", "value": resume, "kind": "message"}] if resume else []
            history.append(assistant_turn(
                f"{card['label']} is connected. Want me to continue your request?" if resume else f"{card['label']} is connected. What should we tackle first?",
                id=confirmation_id,
                source="system",
                choices=choices,
            ))
        updates = {"conversation_history": history}
        if state.get("onboarding_stage") == "connections":
            updates.update(completion_update())
        if state.get("chat_request_id"):
            verified = f"\n\nVerified connection: {card['label']} is now connected for this user. Continue the pending request using existing tool results; retry only tools that previously reported a missing connection."
            updates["system_prompt"] = state.get("system_prompt", "") + verified
            messages = list(state.get("messages") or [])
            if messages and isinstance(messages[0], SystemMessage):
                messages[0] = messages[0].model_copy(update={"content": str(messages[0].content) + verified})
                updates["messages"] = messages
        state = write_state(request.session_id, updates, preserve_pending=True)
        flush_profile_update(request.session_id, state)
        return _workspace_response(request.session_id)
