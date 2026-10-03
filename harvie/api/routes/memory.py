from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import time

from harvie.memory.tier1_persona import load_persona
from harvie.memory.tier3_knowledge import knowledge_base

router = APIRouter()


class MemoryEntryDTO(BaseModel):
    id: str
    category: str
    fact: str
    timestamp: str


class MemoryResponse(BaseModel):
    memories: List[MemoryEntryDTO]


@router.get("/memory", response_model=MemoryResponse)
def get_memory() -> MemoryResponse:
    memories: List[MemoryEntryDTO] = []
    ts = time.strftime("%Y-%m-%d %H:%M")

    # 1. Persona preferences & goals
    persona = load_persona()
    if persona.get("job"):
        memories.append(
            MemoryEntryDTO(
                id="mem-persona-role",
                category="Identity & Role",
                fact=persona["job"],
                timestamp=ts,
            )
        )
    if persona.get("communication_style"):
        memories.append(
            MemoryEntryDTO(
                id="mem-persona-comm",
                category="Preferences",
                fact=f"Communication: {persona['communication_style']}",
                timestamp=ts,
            )
        )

    # 2. Supermemory / Knowledge Base
    if knowledge_base.enabled:
        kb_items = knowledge_base.search("user preferences decisions", limit=5)
        for idx, item in enumerate(kb_items):
            memories.append(
                MemoryEntryDTO(
                    id=f"mem-kb-{idx}",
                    category="Knowledge Base",
                    fact=item.get("content", ""),
                    timestamp=ts,
                )
            )

    return MemoryResponse(memories=memories)
