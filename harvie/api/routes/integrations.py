from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from harvie.core.config import settings
from harvie.integrations.catalog import CONNECTORS, Toolkit
from harvie.integrations.composio.session import IntegrationError, session_manager
from harvie.memory.tier3_knowledge import knowledge_base

router = APIRouter()


class IntegrationDTO(BaseModel):
    id: str
    name: str
    type: str  # 'MCP' | 'API' | 'Tool'
    status: str  # 'connected' | 'idle' | 'error'
    icon: str
    description: str
    toolkit: Toolkit | None = None


class IntegrationsResponse(BaseModel):
    integrations: List[IntegrationDTO]


class ConnectRequest(BaseModel):
    toolkit: Toolkit


def _connection_status(toolkit: Toolkit) -> str:
    if not settings.COMPOSIO_API_KEY:
        return "idle"
    try:
        return "connected" if session_manager.is_connected(toolkit) else "idle"
    except IntegrationError:
        return "error"


@router.get("/integrations", response_model=IntegrationsResponse)
def get_integrations() -> IntegrationsResponse:
    integrations: List[IntegrationDTO] = [
        IntegrationDTO(
            id="int-1",
            name="Google Calendar MCP",
            type="MCP",
            status=_connection_status("googlecalendar"),
            icon="📅",
            description="Fetches events & schedules time blocks automatically.",
            toolkit="googlecalendar",
        ),
        IntegrationDTO(
            id="int-2",
            name="Gmail MCP Tool",
            type="MCP",
            status=_connection_status("gmail"),
            icon="✉️",
            description="Drafts emails & summarizes priority threads.",
            toolkit="gmail",
        ),
        IntegrationDTO(
            id="int-3",
            name="Supermemory Knowledge Base",
            type="Tool",
            status="connected" if knowledge_base.enabled else "idle",
            icon="🧠",
            description="Long-term semantic memory storage for agent state.",
        ),
        IntegrationDTO(
            id="int-4",
            name="Composio Tooling Engine",
            type="API",
            status="connected" if settings.COMPOSIO_API_KEY else "idle",
            icon="🔧",
            description="Provides OAuth integrations and workspace tool execution.",
        ),
    ]
    return IntegrationsResponse(integrations=integrations)


@router.get("/integrations/{toolkit}/status")
def integration_status(toolkit: Toolkit) -> dict:
    try:
        connected = session_manager.is_connected(toolkit)
    except IntegrationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"toolkit": toolkit, "connected": connected}


@router.post("/integrations/connect")
def connect_integration(request: ConnectRequest) -> dict:
    try:
        flow = session_manager.start_authentication(request.toolkit)
    except IntegrationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not flow.connected and not flow.authorization_url:
        raise HTTPException(status_code=503, detail=f"Could not create an authorization link for {CONNECTORS[request.toolkit]['label']}.")
    return {"connected": flow.connected, "authorization_url": flow.authorization_url}
