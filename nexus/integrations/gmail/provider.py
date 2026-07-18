"""Gmail business logic layer."""

import logging

from nexus.integrations.composio.session import IntegrationError, session_manager

logger = logging.getLogger(__name__)


class GmailProvider:
    """High-level Gmail operations backed by the shared Composio session."""

    def search_emails(self, query: str, max_results: int = 10) -> str:
        """Search emails using Gmail search syntax."""
        try:
            return session_manager.execute(
                "gmail",
                "GMAIL_FETCH_EMAILS",
                {
                    "user_id": "me",
                    "query": query,
                    "max_results": max_results,
                    "include_payload": False,
                },
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.search_emails failed")
            return f"Error searching emails: {exc}"

    def list_recent_emails(self, max_results: int = 10) -> str:
        """List recent emails."""
        try:
            return self.search_emails("in:anywhere", max_results=max_results)
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.list_recent_emails failed")
            return f"Error listing recent emails: {exc}"

    def read_email(self, message_id: str) -> str:
        """Read a specific email by its message ID."""
        try:
            return session_manager.execute(
                "gmail",
                "GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID",
                {"user_id": "me", "message_id": message_id},
            )
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
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
        args: dict = {
            "recipient_email": ", ".join(to),
            "subject": subject,
            "body": body,
            "is_html": self._looks_like_html(body),
        }
        if cc:
            args["cc"] = cc
        if bcc:
            args["bcc"] = bcc
        try:
            return session_manager.execute("gmail", "GMAIL_SEND_EMAIL", args)
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.send_email failed")
            return f"Error sending email: {exc}"

    def draft_email(
        self,
        to: list[str],
        subject: str,
        body: str,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
    ) -> str:
        """Create a draft email without sending."""
        args: dict = {
            "recipient_email": ", ".join(to),
            "subject": subject,
            "body": body,
            "is_html": self._looks_like_html(body),
        }
        if cc:
            args["cc"] = cc
        if bcc:
            args["bcc"] = bcc
        try:
            return session_manager.execute("gmail", "GMAIL_CREATE_EMAIL_DRAFT", args)
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.draft_email failed")
            return f"Error creating draft: {exc}"

    def reply_to_email(
        self,
        thread_id: str,
        recipient_email: str,
        body: str,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
    ) -> str:
        """Reply within an existing email thread when supported by the client."""
        args: dict = {
            "user_id": "me",
            "thread_id": thread_id,
            "recipient_email": recipient_email,
            "message_body": body,
            "is_html": self._looks_like_html(body),
        }
        if cc:
            args["cc"] = cc
        if bcc:
            args["bcc"] = bcc
        try:
            return session_manager.execute("gmail", "GMAIL_REPLY_TO_THREAD", args)
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.reply_to_email failed")
            return f"Error replying to email: {exc}"

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
            return session_manager.execute("gmail", "GMAIL_ADD_LABEL_TO_EMAIL", args)
        except IntegrationError as exc:
            return session_manager.structured_error(exc, "gmail")
        except Exception as exc:
            logger.exception("gmail.modify_email failed")
            return f"Error modifying email: {exc}"

    def _looks_like_html(self, body: str) -> bool:
        return "<" in body and ">" in body


gmail_provider = GmailProvider()
