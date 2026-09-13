"""Central tool registry for Harvie.

Every integration registers its tools here. The tool executor and LLM
binding both read from this single source of truth.
"""

import logging

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Collects LangChain tools from all integrations."""

    def __init__(self) -> None:
        self._tools: list = []
        self._names: set[str] = set()

    def register(self, tools: list) -> None:
        """Register a list of LangChain tools, skipping duplicates."""
        for tool in tools:
            name = getattr(tool, "name", str(tool))
            if name in self._names:
                continue
            self._tools.append(tool)
            self._names.add(name)
            logger.debug("Registered tool: %s", name)

    def get_all_tools(self) -> list:
        """Return every registered tool."""
        return list(self._tools)

    def get_tool_names(self) -> list[str]:
        """Return names of every registered tool."""
        return sorted(self._names)


registry = ToolRegistry()
