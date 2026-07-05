from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nexus.api.routes import chat, health, session

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
app.include_router(session.router)

