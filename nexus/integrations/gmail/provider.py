"""Gmail business logic layer.

Each method builds the argument dict expected by the MCP server
and calls client.call_tool(). If the backend changes from MCP to
direct Google API later, only this file needs to change.
"""

import logging

from nexus.integrations.gmail.client import gmail_client
from nexus.integrations.gmail.exceptions import GmailError

logger = logging.getLogger(__name__)


class GmailProvider:
    """High-level Gmail operations backed by the MCP client."""

    def search_emails(self, query: str, max_results: int = 10) -> str:
        """Search emails using Gmail search syntax."""
        try:
            return gmail_client.call_tool(
                "search_emails",
                {"query": query, "maxResults": max_results},
            )
        except GmailError:
            raise
        except Exception as exc:
            logger.exception("gmail.search_emails failed")
            return f"Error searching emails: {exc}"

    def read_email(self, message_id: str) -> str:
        """Read a specific email by its message ID."""
        try:
            return gmail_client.call_tool(
                "read_email",
                {"messageId": message_id},
            )
        except GmailError:
            raise
        except Exception as exc:
            logger.exception("gmail.read_email failed")
            return f"Error reading email: {exc}"

    def send_email(
        self,
        to: list[str],
        subject: str,
        body: str,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
    ) -> str:
        """Send an email immediately."""
        args: dict = {"to": to, "subject": subject, "body": body}
        if cc:
            args["cc"] = cc
        if bcc:
            args["bcc"] = bcc
        try:
            return gmail_client.call_tool("send_email", args)
        except GmailError:
            raise
        except Exception as exc:
            logger.exception("gmail.send_email failed")
            return f"Error sending email: {exc}"

    def draft_email(
        self,
        to: list[str],
        subject: str,
        body: str,
        cc: list[str] | None = None,
    ) -> str:
        """Create a draft email without sending."""
        args: dict = {"to": to, "subject": subject, "body": body}
        if cc:
            args["cc"] = cc
        try:
            return gmail_client.call_tool("draft_email", args)
        except GmailError:
            raise
        except Exception as exc:
            logger.exception("gmail.draft_email failed")
            return f"Error creating draft: {exc}"

    def modify_email(
        self,
        message_id: str,
        add_labels: list[str] | None = None,
        remove_labels: list[str] | None = None,
    ) -> str:
        """Modify email labels (archive, mark read, etc.)."""
        args: dict = {"messageId": message_id}
        if add_labels:
            args["addLabelIds"] = add_labels
        if remove_labels:
            args["removeLabelIds"] = remove_labels
        try:
            return gmail_client.call_tool("modify_email", args)
        except GmailError:
            raise
        except Exception as exc:
            logger.exception("gmail.modify_email failed")
            return f"Error modifying email: {exc}"


gmail_provider = GmailProvider()
