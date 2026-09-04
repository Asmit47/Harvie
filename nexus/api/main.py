from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nexus.api.routes import chat, greeting, health, integrations, memory, open_loops, session
from nexus.integrations.composio.session import session_manager

app = FastAPI(title="Nexus API", version="0.1.0")

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
