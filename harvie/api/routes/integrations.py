from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

from harvie.core.config import settings
from harvie.memory.tier3_knowledge import knowledge_base

router = APIRouter()


class IntegrationDTO(BaseModel):
    id: str
    name: str
    type: str  # 'MCP' | 'API' | 'Tool'
    status: str  # 'connected' | 'idle' | 'error'
    icon: str
    description: str


class IntegrationsResponse(BaseModel):
    integrations: List[IntegrationDTO]


@router.get("/integrations", response_model=IntegrationsResponse)
def get_integrations() -> IntegrationsResponse:
    integrations: List[IntegrationDTO] = [
        IntegrationDTO(
            id="int-1",
            name="Google Calendar MCP",
            type="MCP",
            status="connected" if settings.COMPOSIO_API_KEY else "idle",
            icon="📅",
            description="Fetches events & schedules time blocks automatically.",
        ),
        IntegrationDTO(
            id="int-2",
            name="Gmail MCP Tool",
            type="MCP",
            status="connected" if settings.COMPOSIO_API_KEY else "idle",
            icon="✉️",
            description="Drafts emails & summarizes priority threads.",
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
