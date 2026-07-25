from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import time

from nexus.memory.tier1_persona import load_persona_json, mem0
from nexus.memory.tier3_knowledge import knowledge_base

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
    persona = load_persona_json()
    if persona.get("role"):
        memories.append(
            MemoryEntryDTO(
                id="mem-persona-role",
                category="Identity & Role",
                fact=persona["role"],
                timestamp=ts,
            )
        )
    if persona.get("communication_preferences"):
        memories.append(
            MemoryEntryDTO(
                id="mem-persona-comm",
                category="Preferences",
                fact=f"Communication: {persona['communication_preferences']}",
                timestamp=ts,
            )
        )

    # 2. Mem0 patterns
    mem0_patterns = mem0.search(limit=5)
    for idx, pat in enumerate(mem0_patterns):
        memories.append(
            MemoryEntryDTO(
                id=f"mem-mem0-{idx}",
                category="Learned Pattern",
                fact=pat,
                timestamp=ts,
            )
        )

    # 3. Supermemory / Knowledge Base
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

    # Default fallback if no memories exist yet
    if not memories:
        memories = [
            MemoryEntryDTO(
                id="mem-fallback-1",
                category="Preferences",
                fact="User prefers concise technical summaries over verbose chat.",
                timestamp="Today",
            ),
            MemoryEntryDTO(
                id="mem-fallback-2",
                category="Work context",
                fact="Project 'Nexus' uses LangGraph backend orchestration & Next.js spatial UI.",
                timestamp="Today",
            ),
        ]

    return MemoryResponse(memories=memories)
