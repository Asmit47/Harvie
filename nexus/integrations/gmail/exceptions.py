"""Gmail integration exceptions.

Never expose raw subprocess errors to the LLM.
Each exception maps to a user-friendly error message.
"""


class GmailError(Exception):
    """Base exception for all Gmail integration errors."""


class MCPConnectionError(GmailError):
    """The MCP subprocess could not be reached or crashed."""


class AuthenticationError(GmailError):
    """Gmail OAuth credentials are missing or expired."""


class EmailNotFoundError(GmailError):
    """The requested email message ID does not exist."""


class GmailTimeoutError(GmailError):
    """An MCP request to the Gmail server timed out."""


class InvalidQueryError(GmailError):
    """The Gmail search query is malformed."""
