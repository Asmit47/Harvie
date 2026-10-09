from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from harvie.core.config import settings
from harvie.integrations.catalog import CONNECTORS, Toolkit
from harvie.integrations.composio.directory import get_directory, known_toolkit, toolkit_label
from harvie.integrations.composio.session import IntegrationError, session_manager

router = APIRouter()


class IntegrationDTO(BaseModel):
    id: str
    name: str
    type: str  # 'MCP' | 'API' | 'Tool'
    status: str  # 'connected' | 'idle' | 'error'
    icon: str
    description: str
    toolkit: Toolkit | None = None
    category: str | None = None
    category_label: str | None = None


class IntegrationsResponse(BaseModel):
    integrations: List[IntegrationDTO]


class ConnectRequest(BaseModel):
    toolkit: str


class DirectoryApp(BaseModel):
    slug: str
    name: str
    description: str
    category: str
    category_label: str


class DirectoryCategory(BaseModel):
    id: str
    label: str
    count: int


class DirectoryResponse(BaseModel):
    apps: List[DirectoryApp]
    categories: List[DirectoryCategory]
    popular: List[str]


class ConnectedResponse(BaseModel):
    toolkits: List[str]


def _require_known(toolkit: str) -> None:
    if not known_toolkit(toolkit):
        raise HTTPException(status_code=422, detail="That app isn't available to connect.")


def _connection_status(toolkit: str) -> str:
    if not settings.COMPOSIO_API_KEY:
        return "idle"
    try:
        return "connected" if session_manager.is_connected(toolkit) else "idle"
    except IntegrationError:
        return "error"


@router.get("/integrations", response_model=IntegrationsResponse)
def get_integrations() -> IntegrationsResponse:
    integrations = [
        IntegrationDTO(
            id=slug,
            name=meta["label"],
            type="Tool",
            status=_connection_status(slug),
            icon=slug,
            description=meta["description"],
            toolkit=slug,
            category=meta["category"],
            category_label=meta["category_label"],
        )
        for slug, meta in CONNECTORS.items()
    ]
    return IntegrationsResponse(integrations=integrations)


@router.get("/integrations/directory", response_model=DirectoryResponse)
def integration_directory() -> dict:
    """Every connectable app, grouped for the Connections page."""
    return get_directory()


@router.get("/integrations/connected", response_model=ConnectedResponse)
def connected_integrations() -> dict:
    """Apps the signed-in user has already connected."""
    if not settings.COMPOSIO_API_KEY:
        return {"toolkits": []}
    try:
        return {"toolkits": session_manager.connected_toolkits()}
    except IntegrationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/integrations/{toolkit}/status")
def integration_status(toolkit: str) -> dict:
    _require_known(toolkit)
    try:
        connected = session_manager.is_connected(toolkit)
    except IntegrationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"toolkit": toolkit, "connected": connected}


@router.post("/integrations/connect")
def connect_integration(request: ConnectRequest) -> dict:
    _require_known(request.toolkit)
    try:
        flow = session_manager.start_authentication(request.toolkit)
    except IntegrationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not flow.connected and not flow.authorization_url:
        raise HTTPException(status_code=503, detail=f"Could not create an authorization link for {toolkit_label(request.toolkit)}.")
    return {"connected": flow.connected, "authorization_url": flow.authorization_url}
