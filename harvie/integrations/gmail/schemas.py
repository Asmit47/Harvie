"""Pydantic input schemas for Gmail tools.

Keeps validation separate from execution.
"""

from pydantic import BaseModel, Field


class SendEmailInput(BaseModel):
    """Input for sending an email."""

    to: list[str] = Field(description="Recipient email addresses")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body content")
    cc: list[str] | None = Field(default=None, description="CC recipients")
    bcc: list[str] | None = Field(default=None, description="BCC recipients")


class ReadEmailInput(BaseModel):
    """Input for reading a specific email."""

    message_id: str = Field(description="Gmail message ID to read")


class SearchEmailsInput(BaseModel):
    """Input for searching emails."""

    query: str = Field(description="Gmail search query (e.g. 'from:alice is:unread')")
    max_results: int = Field(default=10, description="Maximum number of results")


class ListRecentEmailsInput(BaseModel):
    """Input for listing recent emails."""

    max_results: int = Field(default=10, description="Maximum number of recent emails")


class DraftEmailInput(BaseModel):
    """Input for creating a draft email."""

    to: list[str] = Field(description="Recipient email addresses")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body content")
    cc: list[str] | None = Field(default=None, description="CC recipients")
    bcc: list[str] | None = Field(default=None, description="BCC recipients")


class ReplyToEmailInput(BaseModel):
    """Input for replying to an email thread."""

    thread_id: str = Field(description="Gmail thread ID to reply to")
    recipient_email: str = Field(description="Email address receiving the reply")
    body: str = Field(description="Reply body content")
    cc: list[str] | None = Field(default=None, description="CC recipients")
    bcc: list[str] | None = Field(default=None, description="BCC recipients")


class ModifyEmailInput(BaseModel):
    """Input for modifying email labels."""

    message_id: str = Field(description="Gmail message ID to modify")
    add_labels: list[str] | None = Field(
        default=None, description="Label IDs to add (e.g. 'IMPORTANT', 'STARRED')"
    )
    remove_labels: list[str] | None = Field(
        default=None, description="Label IDs to remove (e.g. 'INBOX', 'UNREAD')"
    )
