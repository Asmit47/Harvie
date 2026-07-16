"""Lowest-level Gmail MCP communication layer.

Uses MCPManager to spawn and talk to the Gmail MCP subprocess.
Knows nothing about LangChain or LangGraph.
"""

import logging

from nexus.core.mcp_manager import (
    MCPConnectionError as RawConnectionError,
    MCPTimeoutError as RawTimeoutError,
    mcp_manager,
)
from nexus.integrations.gmail.exceptions import (
    AuthenticationError,
    GmailTimeoutError,
    MCPConnectionError,
)

logger = logging.getLogger(__name__)

MCP_NAME = "gmail"
MCP_COMMAND = "npx"
MCP_ARGS = ["@gongrzhe/server-gmail-autoauth-mcp"]
MCP_TIMEOUT = 30


class GmailMCPClient:
    """Talks to the Gmail MCP server over JSON-RPC."""

    def _get_connection(self):
        """Get or create the Gmail MCP connection."""
        return mcp_manager.get_or_create(
            name=MCP_NAME,
            command=MCP_COMMAND,
            args=MCP_ARGS,
            timeout=MCP_TIMEOUT,
        )

    def call_tool(self, tool_name: str, arguments: dict) -> str:
        """Call an MCP tool and return the text result.

        Translates raw MCP errors into Gmail-specific exceptions.
        """
        conn = self._get_connection()
        start = __import__("time").time()

        try:
            result = conn.call(
                "tools/call",
                {"name": tool_name, "arguments": arguments},
            )
        except RawTimeoutError as exc:
            raise GmailTimeoutError(
                f"Gmail request timed out after {MCP_TIMEOUT}s"
            ) from exc
        except RawConnectionError as exc:
            error_msg = str(exc).lower()
            if "auth" in error_msg or "credential" in error_msg:
                raise AuthenticationError(
                    "Gmail authentication failed. Run: "
                    "npx @gongrzhe/server-gmail-autoauth-mcp auth"
                ) from exc
            raise MCPConnectionError(
                f"Gmail MCP connection error: {exc}"
            ) from exc

        elapsed = __import__("time").time() - start
        logger.info(
            "mcp.gmail.%s duration=%.2fs success=true", tool_name, elapsed
        )

        # MCP returns content as a list of {type, text} objects
        content = result.get("content", [])
        if isinstance(content, list):
            texts = [
                item.get("text", "")
                for item in content
                if isinstance(item, dict) and item.get("type") == "text"
            ]
            return "\n".join(texts) if texts else str(content)
        return str(content)


gmail_client = GmailMCPClient()
