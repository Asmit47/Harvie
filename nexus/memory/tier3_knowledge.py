from datetime import datetime, timezone
import logging

from langchain_core.tools import tool

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

    def search(
        self,
        query: str,
        *,
        threshold: float = settings.KNOWLEDGE_THRESHOLD,
        limit: int = 5,
    ) -> list[dict]:
        """Semantic search, filtered by similarity threshold."""
        if not self.enabled:
            return []
        try:
            response = self.client.search.execute(
                q=query,
                container_tag=settings.NEXUS_USER_ID,
                limit=limit,
            )
            results = []
            for item in response.results or []:
                content = getattr(item, "memory", None) or getattr(item, "chunk", None) or str(item)
                similarity = getattr(item, "similarity", 0.0)
                if similarity >= threshold:
                    results.append({"content": content, "similarity": round(similarity, 2)})
            return results
        except Exception as exc:
            logger.warning("Supermemory search failed: %s", exc)
            return []

    def add(self, content: str, *, metadata: dict | None = None) -> None:
        """Write a knowledge entry to Supermemory."""
        if not self.enabled:
            return
        try:
            self.client.add(
                content=content,
                container_tag=settings.NEXUS_USER_ID,
                metadata=metadata or {},
            )
        except Exception as exc:
            logger.warning("Supermemory write failed: %s", exc)


knowledge_base = KnowledgeBase()


@tool
def search_knowledge(query: str) -> str:
    """Search the long-term Nexus knowledge base for relevant remembered facts."""
    query = (query or "").strip()
    if not query:
        return "No query provided."
    results = knowledge_base.search(query)
    if not results:
        if not knowledge_base.enabled:
            return "Knowledge base is disabled because SUPERMEMORY_API_KEY is not set."
        return "No matching knowledge found."
    lines = ["Relevant long-term knowledge:"]
    for result in results:
        lines.append(f"- [{result['similarity']}] {result['content']}")
    return "\n".join(lines)


@tool
def save_knowledge(content: str) -> str:
    """Save an important long-term fact, decision, preference, or lesson."""
    content = (content or "").strip()
    if not content:
        return "No content provided to save."
    if not knowledge_base.enabled:
        return "Knowledge base is disabled because SUPERMEMORY_API_KEY is not set; nothing was saved."
    knowledge_base.add(
        content=content,
        metadata={
            "type": "agent_saved_knowledge",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    preview = content if len(content) <= 240 else content[:237] + "..."
    return f"Saved to long-term knowledge: {preview}"

