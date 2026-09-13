import hmac
import re

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from harvie.api.routes import chat, greeting, health, integrations, memory, open_loops, session
from harvie.integrations.composio.session import session_manager
from harvie.core.config import settings
from harvie.core.identity import reset_request_user_id, set_request_user_id

app = FastAPI(title="Harvie API", version="0.1.0")


@app.middleware("http")
async def set_authenticated_user(request: Request, call_next):
    """Accept a user only from the server-side Next.js authentication proxy."""
    user_id = request.headers.get("x-harvie-user-id")
    if not user_id:
        return await call_next(request)

    provided_secret = request.headers.get("x-harvie-proxy-secret", "")
    if not settings.HARVIE_API_PROXY_SECRET or not hmac.compare_digest(provided_secret, settings.HARVIE_API_PROXY_SECRET):
        return JSONResponse({"detail": "Invalid authenticated proxy."}, status_code=401)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", user_id):
        return JSONResponse({"detail": "Invalid user identity."}, status_code=400)

    token = set_request_user_id(user_id)
    try:
        return await call_next(request)
    finally:
        reset_request_user_id(token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(greeting.router)
app.include_router(session.router)
app.include_router(memory.router)
app.include_router(open_loops.router)
app.include_router(integrations.router)


@app.on_event("startup")
def validate_integrations() -> None:
    session_manager.validate_environment()
