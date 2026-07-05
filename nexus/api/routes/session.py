from fastapi import APIRouter
from pydantic import BaseModel

from nexus.entrypoints.cli import close_session

router = APIRouter()


class CloseSessionRequest(BaseModel):
    session_id: str


class CloseSessionResponse(BaseModel):
    status: str
    session_id: str
    summary: str | None = None


@router.post("/session/close", response_model=CloseSessionResponse)
def close_session_route(request: CloseSessionRequest) -> CloseSessionResponse:
    summary = close_session(request.session_id)
    status = "ok" if summary else "empty"
    return CloseSessionResponse(status=status, session_id=request.session_id, summary=summary)

