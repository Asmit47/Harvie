from fastapi import APIRouter
from pydantic import BaseModel

from nexus.core.graph import compiled_graph
from nexus.memory.tier2_session import generate_session_id, get_thread_config

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    session_id = request.session_id or generate_session_id()
    config = get_thread_config(session_id)
    result = compiled_graph.invoke({"user_input": request.message}, config=config)
    return ChatResponse(answer=result["final_answer"], session_id=session_id)

