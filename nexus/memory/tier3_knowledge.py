from datetime import datetime, timezone
import logging

from langchain_core.tools import tool
from langsmith import traceable

from nexus.core.config import settings


logger = logging.getLogger(__name__)


class KnowledgeBase:
    """Thin wrapper around Supermemory for the deep knowledge tier."""

    def __init__(self):
        self.client = None
        if not settings.SUPERMEMORY_API_KEY:
            return
        try:
            from supermemory import Supermemory

            self.client = Supermemory(api_key=settings.SUPERMEMORY_API_KEY)
            logger.debug("Tier 3 (Supermemory): enabled")
        except Exception as exc:
            logger.warning("Tier 3 (Supermemory): disabled - %s", exc)

    @property
    def enabled(self) -> bool:
        return self.client is not None

    @traceable
    def search(
        self,
        query: str,
        *,
        search_mode: str = "hybrid",
        limit: int = 5,
        rerank: bool = False,
        threshold: float | None = None,
    ) -> list[dict]:
        """Semantic search with configurable mode, limit, reranking, and threshold."""
        if not self.enabled:
            return []
        if search_mode not in {"memories", "documents", "hybrid"}:
            raise ValueError("search_mode must be 'memories', 'documents', or 'hybrid'")
        try:
            kwargs = {
                "q": query,
                "container_tag": settings.NEXUS_USER_ID,
                "search_mode": search_mode,
                "limit": limit,
                "rerank": rerank,
            }
            if threshold is not None:
                kwargs["threshold"] = threshold
            response = self.client.search.memories(**kwargs)
            results = []
            for item in response.results or []:
                content = getattr(item, "memory", None) or getattr(item, "chunk", None) or str(item)
                similarity = getattr(item, "similarity", None)
                results.append({
                    "content": content,
                    "similarity": round(similarity, 2) if similarity is not None else None,
                })
            return results
        except Exception as exc:
            logger.warning("Supermemory search failed: %s", exc)
            return []

    @traceable
    def add(
        self,
        content: str,
        *,
        mode: str = "instant",
        metadata: dict | None = None,
    ) -> bool:
        """Write a knowledge entry and report whether it was accepted."""
        if mode not in {"instant", "dynamic"}:
            raise ValueError("mode must be 'instant' or 'dynamic'")

        if not self.enabled:
            return False
        try:
            self.client.add(
                content=content,
                container_tag=settings.NEXUS_USER_ID,
                dreaming=mode,
                metadata=metadata or {},
            )
            return True
        except Exception as exc:
            logger.warning("Supermemory write failed: %s", exc)
            return False


knowledge_base = KnowledgeBase()


@tool
def search_knowledge(query: str) -> str:
    """Search the long-term Nexus knowledge base for relevant remembered facts."""
    query = (query or "").strip()
    if not query:
        return "No query provided."
    results = knowledge_base.search(
        query,
        search_mode="hybrid",
        limit=5,
        rerank=False,
        threshold=None,
    )
    if not results:
        if not knowledge_base.enabled:
            return "Knowledge base is disabled because SUPERMEMORY_API_KEY is not set."
        return "No matching knowledge found."
    lines = ["Relevant long-term knowledge:"]
    for result in results:
        similarity = result.get("similarity")
        if similarity is not None:
            lines.append(f"- [{similarity}] {result['content']}")
        else:
            lines.append(f"- {result['content']}")
    return "\n".join(lines)


@tool
def save_knowledge(content: str) -> str:
    """Save an important long-term fact, decision, preference, or lesson."""
    content = (content or "").strip()
    if not content:
        return "No content provided to save."
    if not knowledge_base.enabled:
        return "Knowledge base is disabled because SUPERMEMORY_API_KEY is not set; nothing was saved."
    success = knowledge_base.add(
        content=content,
        mode="instant",
        metadata={
            "source": "nexus",
            "type": "durable_knowledge",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    preview = content if len(content) <= 240 else content[:237] + "..."
    if success:
        return f"Saved to long-term knowledge: {preview}"
    return "Failed to save to long-term knowledge."
